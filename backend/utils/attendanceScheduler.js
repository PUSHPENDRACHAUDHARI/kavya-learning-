const cron = require('node-cron');
const Attendance = require('../models/attendanceModel');
const Event = require('../models/eventModel');
const Course = require('../models/courseModel');
const { markAbsentForEvent } = require('../controllers/attendanceController');
const mongoose = require('mongoose');

// Run every minute and mark absent for events that ended within the last 5 minutes
// This is conservative and safe for local dev; adjust schedule for production.
function startAttendanceScheduler(io) {
  console.log('➡️ Starting attendance scheduler (marks absentees after event end)');

  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      // Find events that ended in the last 10 minutes and are scheduled
      const tenMinsAgo = new Date(now.getTime() - 10 * 60 * 1000);
      const events = await Event.find({
        status: 'Scheduled',
        date: { $lte: now }
      }).lean();

      for (const ev of events) {
        try {
          // If event.endTime is present as string, parse approximate end datetime
          // Otherwise treat event.date as end marker.
          let endDT = ev.date ? new Date(ev.date) : null;
          // If startTime/endTime strings exist, attempt to build a full end datetime
          if (ev.date && ev.endTime) {
            const parsed = buildDateTime(ev.date, ev.endTime);
            if (parsed) endDT = parsed;
          }

          if (!endDT) continue;

          // If endDT has passed and is within last 10 minutes, mark absent
          if (endDT <= now && endDT >= tenMinsAgo) {
            // Call controller logic to mark absent; the controller expects req/res so call logic directly
            // We'll implement a lightweight marking here similar to controller
            let enrolledList = [];
            if (Array.isArray(ev.enrolledStudents) && ev.enrolledStudents.length) enrolledList = ev.enrolledStudents.map(s => s.toString());
            else if (ev.course) {
              try {
                const course = await Course.findById(ev.course).lean();
                if (course && Array.isArray(course.enrolledStudents)) enrolledList = course.enrolledStudents.map(s => s.toString());
              } catch (e) { enrolledList = []; }
            }

            // Build bulk ops that:
            // - If attendance exists and has joinedAt -> keep
            // - If attendance exists and has accessedAt but no joinedAt -> mark absent and set leftAt = accessedAt
            // - If no attendance -> insert absent with leftAt = now
            const now = new Date();
            const existing = await Attendance.find({ eventId: ev._id }).lean();
            const existingMap = new Map();
            existing.forEach(r => { if (r && r.studentId) existingMap.set(r.studentId.toString(), r); });

            const ops = enrolledList.map(sid => {
              const ex = existingMap.get(sid);
              if (ex && ex.joinedAt) {
                // Present — do nothing
                return null;
              }
              if (ex && !ex.joinedAt && ex.accessedAt) {
                // mark absent and set leftAt to accessedAt
                return {
                  updateOne: {
                    filter: { eventId: ev._id, studentId: sid },
                    update: { $set: { status: 'absent', leftAt: ex.accessedAt } },
                    upsert: false
                  }
                };
              }
              // No record — insert absent with leftAt = now
              return {
                updateOne: {
                  filter: { eventId: ev._id, studentId: sid },
                  update: { $setOnInsert: { eventId: ev._id, courseId: ev.course || null, studentId: sid, status: 'absent', leftAt: now } },
                  upsert: true
                }
              };
            }).filter(Boolean);

            if (ops.length) await Attendance.bulkWrite(ops);

            // Optionally emit socket notifications that attendance updated
            try { if (io) io.emit('attendance:updated', { eventId: ev._id.toString() }); } catch (e) {}
          }
        } catch (e) { console.warn('Attendance scheduler per-event failed', e); }
      }
    } catch (e) { console.error('Attendance scheduler failed', e); }
  });
}

// helper to parse HH:MM or HH:MM AM/PM into Date on the event date
function buildDateTime(dateStr, timeStr) {
  try {
    if (!dateStr || !timeStr) return null;
    // Parse time first
    const mTime = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
    if (!mTime) return null;
    let hh = parseInt(mTime[1], 10);
    const mm = parseInt(mTime[2], 10);
    const mer = mTime[3] ? mTime[3].toUpperCase() : null;
    if (mer) {
      if (mer === 'AM' && hh === 12) hh = 0;
      else if (mer === 'PM' && hh !== 12) hh += 12;
    }
    // Expect dateStr in YYYY-MM-DD; construct Date using local timezone
    const mDate = dateStr.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!mDate) return null;
    const year = parseInt(mDate[1], 10);
    const monthIndex = parseInt(mDate[2], 10) - 1;
    const day = parseInt(mDate[3], 10);
    const dt = new Date(year, monthIndex, day, hh, mm, 0, 0);
    if (isNaN(dt)) return null;
    return dt;
  } catch (e) { return null; }
}

module.exports = { startAttendanceScheduler };
