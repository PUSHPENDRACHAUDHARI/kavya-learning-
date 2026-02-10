const asyncHandler = require('express-async-handler');
const Attendance = require('../models/attendanceModel');
const Event = require('../models/eventModel');
const LiveSession = require('../models/liveSessionModel');
const Course = require('../models/courseModel');
const User = require('../models/userModel');
const Enrollment = require('../models/enrollmentModel');
const jwt = require('jsonwebtoken');

// Normalize attendance record fields coming from different deployments/schemas
function normalizeAttendanceRecord(r) {
  if (!r) return r;
  // Do NOT use accessedAt or other fallbacks as joinedAt — joinedAt must come from explicit join fields
  const joinedAt = r.joinedAt || r.joined_at || r.joined || null;
  const leftAt = r.leftAt || r.left_at || r.left || null;
  const status = r.status || (r.present ? 'Present' : (r.absent ? 'Absent' : null));
  const createdAt = r.createdAt || r.created_at || null;
  return Object.assign({}, r, { joinedAt, leftAt, status, createdAt });
}

// POST /api/attendance/join
// Body: { eventId }
const joinAttendance = asyncHandler(async (req, res) => {
  const { eventId } = req.body;
  const userId = req.user && req.user._id;
  if (!eventId) {
    res.status(400);
    throw new Error('eventId is required');
  }

  // Validate event exists
  const event = await Event.findById(eventId).lean();
  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }

  // Validate enrollment: event.enrolledStudents should include userId, or if course-based,
  // check Course enrollment if available (fallback allow if not enforced)
  let enrolled = false;
  try {
    if (Array.isArray(event.enrolledStudents) && event.enrolledStudents.length) {
      enrolled = event.enrolledStudents.some(s => s && s.toString() === userId.toString());
    }
  } catch (e) { enrolled = false; }

  // If the event has a course assigned and enrollment not present on event, check Course
  if (!enrolled && event.course) {
    try {
      const course = await Course.findById(event.course).lean();
      if (course && Array.isArray(course.enrolledStudents)) {
        enrolled = course.enrolledStudents.some(s => s && s.toString() === userId.toString());
      }
    } catch (e) { /* ignore */ }
  }

  if (!enrolled) {
    res.status(403);
    throw new Error('User not enrolled in this event/course');
  }

  // Create or update attendance as present
  // Use $setOnInsert to avoid replacing the whole document (avoid accidental replacement)
  // and preserve existing `joinedAt` if already set. Also ensure eventId/courseId/studentId
  // are present on insert.
  const now = new Date();
  const filter = { eventId, studentId: userId };
  const update = {
    $set: { status: 'present' },
    $setOnInsert: { eventId, courseId: event.course || null, studentId: userId, joinedAt: now }
  };
  const opts = { upsert: true, new: true, setDefaultsOnInsert: true };

  const attendance = await Attendance.findOneAndUpdate(filter, update, opts);

  res.status(200).json({ success: true, attendance });
});

// POST /api/attendance/mark-absent
// Body: { eventId }
// Marks all enrolled students who do not have an attendance record as 'absent'
const markAbsentForEvent = asyncHandler(async (req, res) => {
  const { eventId } = req.body;
  if (!eventId) {
    res.status(400);
    throw new Error('eventId is required');
  }

  const event = await Event.findById(eventId).lean();
  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }

  // Build list of enrolled student ids from event.enrolledStudents or course.enrolledStudents
  // Resolve enrolled students robustly: prefer event.enrolledStudents, then course.enrolledStudents,
  // and finally fallback to Enrollment collection (some deployments store enrollments separately).
  let enrolledList = [];
  if (Array.isArray(event.enrolledStudents) && event.enrolledStudents.length) {
    enrolledList = event.enrolledStudents.map(s => s.toString());
  } else if (event.course) {
    try {
      const course = await Course.findById(event.course).lean();
      if (course && Array.isArray(course.enrolledStudents) && course.enrolledStudents.length) {
        enrolledList = course.enrolledStudents.map(s => s.toString());
      } else {
        // Fallback: query Enrollment collection for course participants
        try {
          const fromEnroll = await Enrollment.find({ courseId: event.course }).select('studentId').lean();
          if (Array.isArray(fromEnroll) && fromEnroll.length) {
            enrolledList = fromEnroll.map(e => e.studentId && e.studentId.toString()).filter(Boolean);
          }
        } catch (e) {
          enrolledList = [];
        }
      }
    } catch (e) { enrolledList = []; }
  }

  // For each enrolled student, upsert attendance to absent if no record exists
  const now = new Date();
  const ops = enrolledList.map(sid => ({
    updateOne: {
      filter: { eventId, studentId: sid },
      update: { $setOnInsert: { eventId, courseId: event.course || null, studentId: sid, status: 'absent' } },
      upsert: true
    }
  }));

  if (ops.length) await Attendance.bulkWrite(ops);

  res.json({ success: true, marked: ops.length });
});

// GET /api/attendance/event/:eventId
const getAttendanceForEvent = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  if (!eventId) {
    res.status(400);
    throw new Error('eventId required');
  }

  // Only instructor or admin may view full attendance; verify role
  const role = req.user && req.user.role;
  if (!(role === 'admin' || role === 'sub-admin' || role === 'instructor')) {
    res.status(403);
    throw new Error('Not authorized to view attendance');
  }

  // Load event and determine enrolled students
  const event = await Event.findById(eventId).lean();
  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }

  // Resolve enrolled IDs robustly: event.enrolledStudents, then course.enrolledStudents,
  // then Enrollment collection as a fallback (some deployments use Enrollment records)
  let enrolledIds = [];
  if (Array.isArray(event.enrolledStudents) && event.enrolledStudents.length) {
    enrolledIds = event.enrolledStudents.map(s => s.toString());
  } else if (event.course) {
    try {
      const course = await Course.findById(event.course).lean();
      if (course && Array.isArray(course.enrolledStudents) && course.enrolledStudents.length) {
        enrolledIds = course.enrolledStudents.map(s => s.toString());
      } else {
        try {
          const fromEnroll = await Enrollment.find({ courseId: event.course }).select('studentId').lean();
          if (Array.isArray(fromEnroll) && fromEnroll.length) {
            enrolledIds = fromEnroll.map(e => e.studentId && e.studentId.toString()).filter(Boolean);
          }
        } catch (e) {
          enrolledIds = [];
        }
      }
    } catch (e) {
      enrolledIds = [];
    }
  }

  // Fetch any attendance records for this event and normalize field names
  const rawRecords = await Attendance.find({ eventId }).lean();
  const records = Array.isArray(rawRecords) ? rawRecords.map(normalizeAttendanceRecord) : [];

  // Build a set of studentIds to fetch user details for (union of enrolled + recorded)
  const idsSet = new Set(enrolledIds);
  records.forEach(r => {
    try { if (r.studentId) idsSet.add(r.studentId.toString()); } catch (e) {}
  });
  const allIds = Array.from(idsSet);

  // Fetch user documents for all relevant ids
  const users = allIds.length ? await User.find({ _id: { $in: allIds } }).select('fullName email').lean() : [];
  const userMap = new Map(users.map(u => [u._id.toString(), u]));

  // Map records by studentId for quick lookup
  const recMap = new Map(records.map(r => [r.studentId ? (r.studentId.toString ? r.studentId.toString() : String(r.studentId)) : '', r]));

  // Build students array preserving enrolled order when possible
  const students = (enrolledIds.length ? enrolledIds : allIds).map(sid => {
    const user = userMap.get(sid) || {};
    const rec = recMap.get(sid) || null;
    const hasRecord = !!rec && !!rec._id;
    const hasJoined = !!(rec && rec.joinedAt);
    let status;
    if (hasRecord && hasJoined) {
      status = 'present';
    } else if (!hasRecord) {
      status = 'absent';
    } else {
      // Record exists but no explicit joinedAt — respect explicit status if present, otherwise treat as present
      const s = String(rec.status || '').toLowerCase();
      status = s === 'absent' ? 'absent' : 'present';
    }

    return {
      studentId: sid,
      name: user.fullName || user.name || user.email || sid,
      email: user.email || null,
      status,
      joinedAt: status === 'present' && rec && rec.joinedAt ? rec.joinedAt : null,
      leftAt: status === 'present' && rec && rec.leftAt ? rec.leftAt : null,
    };
  });

  const totalStudents = students.length;
  const presentCount = students.filter(s => s.status === 'present').length;
  const absentCount = totalStudents - presentCount;

  res.json({ success: true, totalStudents, presentCount, absentCount, students });
});

// DEV helper: return merged attendance without role checks (only available in non-production)
const getAttendanceForEventDebug = asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404);
    throw new Error('Not available');
  }
  const { eventId } = req.params;
  if (!eventId) {
    res.status(400);
    throw new Error('eventId required');
  }

  const event = await Event.findById(eventId).lean();
  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }

  let enrolledIds = [];
  if (Array.isArray(event.enrolledStudents) && event.enrolledStudents.length) {
    enrolledIds = event.enrolledStudents.map(s => s.toString());
  } else if (event.course) {
    try {
      const course = await Course.findById(event.course).lean();
      if (course && Array.isArray(course.enrolledStudents) && course.enrolledStudents.length) {
        enrolledIds = course.enrolledStudents.map(s => s.toString());
      } else {
        try {
          const fromEnroll = await Enrollment.find({ courseId: event.course }).select('studentId').lean();
          if (Array.isArray(fromEnroll) && fromEnroll.length) {
            enrolledIds = fromEnroll.map(e => e.studentId && e.studentId.toString()).filter(Boolean);
          }
        } catch (e) {
          enrolledIds = [];
        }
      }
    } catch (e) {
      enrolledIds = [];
    }
  }

  const rawRecords = await Attendance.find({ eventId }).lean();
  const records = Array.isArray(rawRecords) ? rawRecords.map(normalizeAttendanceRecord) : [];
  const idsSet = new Set(enrolledIds);
  records.forEach(r => { try { if (r.studentId) idsSet.add(r.studentId.toString()); } catch (e) {} });
  const allIds = Array.from(idsSet);
  const users = allIds.length ? await User.find({ _id: { $in: allIds } }).select('fullName email').lean() : [];
  const userMap = new Map(users.map(u => [u._id.toString(), u]));
  const recMap = new Map(records.map(r => [r.studentId ? (r.studentId.toString ? r.studentId.toString() : String(r.studentId)) : '', r]));

  const students = (enrolledIds.length ? enrolledIds : allIds).map(sid => {
    const user = userMap.get(sid) || {};
    const rec = recMap.get(sid) || null;
    const hasRecord = !!rec && !!rec._id;
    const hasJoined = !!(rec && rec.joinedAt);
    let status;
    if (hasRecord && hasJoined) {
      status = 'present';
    } else if (!hasRecord) {
      status = 'absent';
    } else {
      const s = String(rec.status || '').toLowerCase();
      status = s === 'absent' ? 'absent' : 'present';
    }

    return {
      studentId: sid,
      name: user.fullName || user.name || user.email || sid,
      email: user.email || null,
      status,
      joinedAt: status === 'present' && rec && rec.joinedAt ? rec.joinedAt : null,
      leftAt: status === 'present' && rec && rec.leftAt ? rec.leftAt : null,
    };
  });

  const totalStudents = students.length;
  const presentCount = students.filter(s => s.status === 'present').length;
  const absentCount = totalStudents - presentCount;

  res.json({ success: true, totalStudents, presentCount, absentCount, students });
});

// GET /api/attendance/student/:studentId
const getAttendanceForStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const requester = req.user;

  // Student can only request their own history; admin/instructor can request any
  if (requester.role === 'student' && requester._id.toString() !== studentId) {
    res.status(403);
    throw new Error('Not authorized');
  }

  const list = await Attendance.find({ studentId })
    .populate('eventId', 'title date startTime endTime')
    .lean();
  const normalized = Array.isArray(list) ? list.map(normalizeAttendanceRecord) : [];
  res.json({ success: true, attendance: normalized });
});

// Record attendance when a student joins a live session
const recordLiveSessionAttendance = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user && req.user._id;
  const { cameraEnabled, micEnabled } = req.body;

  const session = await LiveSession.findById(sessionId).populate('course');
  if (!session) {
    res.status(404);
    throw new Error('Live session not found');
  }

  if (session.status !== 'live') {
    res.status(400);
    throw new Error('Session is not live');
  }

  // Create or update attendance
  let att = await Attendance.findOne({ 
    liveSession: sessionId, 
    student: userId 
  });

  if (!att) {
    att = await Attendance.create({ 
      liveSession: sessionId,
      course: session.course._id,
      student: userId,
      instructor: session.instructor,
      joinedAt: new Date(),
      leftAt: null,
      status: 'present',
      attendanceType: 'live_class',
      cameraEnabled: cameraEnabled || false,
      micEnabled: micEnabled || false
    });
  } else {
    // Do NOT overwrite existing joinedAt. Only set it when missing.
    if (!att.joinedAt) att.joinedAt = new Date();
    // Mark present but do not touch leftAt here
    att.status = 'present';
    att.cameraEnabled = cameraEnabled || att.cameraEnabled;
    att.micEnabled = micEnabled || att.micEnabled;
    await att.save();
  }

  res.json({ success: true, attendanceId: att._id, joinedAt: att.joinedAt });
});

// Update attendance when leaving live session
const updateLiveSessionAttendance = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user && req.user._id;
  const { participationScore } = req.body;

  const att = await Attendance.findOne({ 
    liveSession: sessionId, 
    student: userId 
  });
  
  if (att) {
    // Update leftAt only when student was present and leftAt not already set
    const currentStatus = String(att.status || '').toLowerCase();
    if ((currentStatus === 'present' || !!att.joinedAt) && !att.leftAt) {
      const now = new Date();
      // Ensure leftAt is strictly after joinedAt to avoid identical timestamps
      if (att.joinedAt && now <= new Date(att.joinedAt)) {
        att.leftAt = new Date(new Date(att.joinedAt).getTime() + 1000);
      } else {
        att.leftAt = now;
      }
      if (att.joinedAt) {
        att.duration = Math.round((att.leftAt - att.joinedAt) / (1000 * 60)); // Duration in minutes
      }
      if (participationScore !== undefined) {
        att.participationScore = participationScore;
      }
      await att.save();
    }
  }

  res.json({ success: true });
});

// Get attendance for a live session
const getLiveSessionAttendance = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user && req.user._id;
  const reqRole = req.user && req.user.role;

  const session = await LiveSession.findById(sessionId).populate('course instructor');
  if (!session) {
    res.status(404);
    throw new Error('Live session not found');
  }

  // Access control: only course instructor or admin may view
  if (reqRole !== 'admin') {
    const instructorId = session.instructor._id.toString();
    if (instructorId !== userId.toString()) {
      res.status(403);
      throw new Error('Not authorized to view attendance for this session');
    }
  }

  const records = await Attendance.find({ 
    liveSession: sessionId 
  }).populate('student', 'fullName email avatar');

  res.json({ 
    session: {
      _id: session._id,
      title: session.title,
      course: session.course
    },
    attendance: records 
  });
});

// Get student's live session attendance history
const getStudentLiveSessionAttendance = asyncHandler(async (req, res) => {
  const userId = req.user && req.user._id;
  const { courseId } = req.query;

  const filter = { 
    student: userId,
    attendanceType: 'live_class'
  };
  
  if (courseId) {
    filter.course = courseId;
  }

  const records = await Attendance.find(filter)
    .populate('liveSession', 'title scheduledStartTime')
    .populate('course', 'title')
    .sort({ joinedAt: -1 });

  res.json({ attendance: records });
});
// Mark attendance manually by instructor for a completed class
const markAttendanceByInstructor = asyncHandler(async (req, res) => {
  const { eventId, attendanceList } = req.body;
  const instructorId = req.user._id;
  const role = req.user.role;

  console.log('🎓 Marking attendance for event:', eventId);

  // Check authorization - only instructor or admin
  if (role !== 'instructor' && role !== 'admin' && role !== 'sub-admin') {
    res.status(403);
    throw new Error('Only instructors can mark attendance');
  }

  if (!eventId || !Array.isArray(attendanceList) || attendanceList.length === 0) {
    res.status(400);
    throw new Error('eventId and attendanceList are required');
  }

  // Fetch event details
  const event = await Event.findById(eventId).populate('course');
  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }

  // Verify instructor owns this event
  if (role === 'instructor' && event.instructor && event.instructor.toString() !== instructorId.toString()) {
    res.status(403);
    throw new Error('Not authorized to mark attendance for this event');
  }

  const courseId = event.course?._id;
  const subjectName = event.title;
  const date = event.date;

  // Process attendance records
  const operations = [];
  for (const record of attendanceList) {
    const { studentId, studentName, studentEmail, status } = record;

    operations.push({
      updateOne: {
        filter: { eventId, studentId },
        update: {
          $set: {
            eventId,
            courseId,
            instructorId,
            studentId,
            date,
            subjectName,
            studentName,
            studentEmail,
            status: status || 'Absent',
            markedBy: 'instructor'
          }
        },
        upsert: true
      }
    });
  }

  if (operations.length) {
    await Attendance.bulkWrite(operations);
    console.log('✅ Marked attendance for', operations.length, 'students');
  }

  res.status(200).json({
    success: true,
    message: `Attendance marked for ${operations.length} students`,
    marked: operations.length
  });
});

// Get attendance records for instructor (summary view)
const getInstructorAttendanceRecords = asyncHandler(async (req, res) => {
  const instructorId = req.user._id;
  const role = req.user.role;

  // Check authorization
  if (role !== 'instructor' && role !== 'admin' && role !== 'sub-admin') {
    res.status(403);
    throw new Error('Not authorized');
  }

  let query = {};
  if (role === 'instructor') {
    query.instructorId = instructorId;
  }

  // Group by eventId/date/subjectName to get summary
  const records = await Attendance.aggregate([
    { $match: query },
    {
      $group: {
        _id: {
          eventId: '$eventId',
          date: '$date',
          subjectName: '$subjectName'
        },
        totalStudents: { $sum: 1 },
        presentCount: {
          $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] }
        },
        absentCount: {
          $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] }
        }
      }
    },
    { $sort: { '_id.date': -1 } }
  ]);

  res.status(200).json({
    success: true,
    records: records.map(r => ({
      eventId: r._id.eventId,
      date: r._id.date,
      subjectName: r._id.subjectName,
      totalStudents: r.totalStudents,
      presentCount: r.presentCount,
      absentCount: r.absentCount
    }))
  });
});

// Get detailed attendance for a specific event
const getAttendanceDetails = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const instructorId = req.user._id;
  const role = req.user.role;

  console.log('📋 Fetching attendance details for event:', eventId);

  if (!eventId) {
    res.status(400);
    throw new Error('eventId is required');
  }

  // Fetch event to verify authorization
  const event = await Event.findById(eventId);
  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }

  // Check authorization
  if (role === 'instructor' && event.instructor && event.instructor.toString() !== instructorId.toString()) {
    res.status(403);
    throw new Error('Not authorized to view this attendance');
  }

  // Build enrolled roster: prefer event.enrolledStudents, then course.enrolledStudents,
  // then fallback to Enrollment collection if needed (some deployments store enrollments there)
  let enrolledIds = [];
  if (Array.isArray(event.enrolledStudents) && event.enrolledStudents.length) {
    enrolledIds = event.enrolledStudents.map(s => s.toString());
  } else if (event.course) {
    try {
      const course = await Course.findById(event.course).lean();
      if (course && Array.isArray(course.enrolledStudents) && course.enrolledStudents.length) {
        enrolledIds = course.enrolledStudents.map(s => s.toString());
      } else {
        try {
          const fromEnroll = await Enrollment.find({ courseId: event.course }).select('studentId').lean();
          if (Array.isArray(fromEnroll) && fromEnroll.length) {
            enrolledIds = fromEnroll.map(e => e.studentId && e.studentId.toString()).filter(Boolean);
          }
        } catch (e) {
          enrolledIds = [];
        }
      }
    } catch (e) {
      enrolledIds = [];
    }
  }

  // Fetch attendance records and normalize fields
  const rawRecords = await Attendance.find({ eventId }).lean();
  const records = Array.isArray(rawRecords) ? rawRecords.map(normalizeAttendanceRecord) : [];

  // Build a set of ids to load user details for (union of enrolled + recorded)
  const idsSet = new Set(enrolledIds);
  records.forEach(r => { try { if (r.studentId) idsSet.add(r.studentId.toString()); } catch (e) {} });
  const allIds = Array.from(idsSet);

  const users = allIds.length ? await User.find({ _id: { $in: allIds } }).select('fullName email').lean() : [];
  const userMap = new Map(users.map(u => [u._id.toString(), u]));

  const recMap = new Map(records.map(r => [r.studentId ? (r.studentId.toString ? r.studentId.toString() : String(r.studentId)) : '', r]));

  const students = (enrolledIds.length ? enrolledIds : allIds).map(sid => {
    const user = userMap.get(sid) || {};
    const rec = recMap.get(sid) || null;
    const hasRecord = !!rec && !!rec._id;
    const hasJoined = !!(rec && rec.joinedAt);
    let status;
    if (hasRecord && hasJoined) {
      status = 'Present';
    } else if (!hasRecord) {
      status = 'Absent';
    } else {
      const s = String(rec.status || '').toLowerCase();
      status = s === 'absent' ? 'Absent' : 'Present';
    }

    return {
      studentId: sid,
      studentName: user.fullName || user.name || user.email || sid,
      studentEmail: user.email || null,
      status,
      markedBy: rec && rec.markedBy ? rec.markedBy : null,
      joinedAt: status === 'Present' && rec && rec.joinedAt ? rec.joinedAt : null,
      leftAt: status === 'Present' && rec && rec.leftAt ? rec.leftAt : null,
      createdAt: rec && rec.createdAt ? rec.createdAt : null
    };
  });

  res.status(200).json({
    success: true,
    event: {
      _id: event._id,
      title: event.title,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime
    },
    attendance: students
  });
});

module.exports = {
  joinAttendance,
  markAbsentForEvent,
  getAttendanceForEvent,
  getAttendanceForStudent,
  markAttendanceByInstructor,
  getInstructorAttendanceRecords,
  getAttendanceDetails,
  recordAttendance: asyncHandler(async (req, res) => {
    const eventId = req.params.id;
    const userId = req.user && req.user._id;

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404);
      throw new Error('Event not found');
    }

    // Create or update attendance using correct schema fields
    let att = await Attendance.findOne({ eventId: eventId, studentId: userId });
    if (!att) {
      att = await Attendance.create({ eventId: eventId, studentId: userId, joinedAt: new Date(), status: 'present' });
    } else {
      att.joinedAt = new Date();
      att.status = 'present';
      await att.save();
    }

    res.json({ success: true, attendanceId: att._id, joinedAt: att.joinedAt });
  }),
  getAttendanceForCourse: asyncHandler(async (req, res) => {
    const courseId = req.params.courseId;
    const userId = req.user && req.user._id;
    const reqRole = req.user && req.user.role;

    const course = await Course.findById(courseId).populate('instructor', 'fullName email _id');
    if (!course) {
      res.status(404);
      throw new Error('Course not found');
    }

    // Access control: only course instructor or admin may view
    if (reqRole !== 'admin') {
      const instructorId = (course.instructor && course.instructor._id) ? course.instructor._id.toString() : null;
      if (!instructorId || instructorId !== userId.toString()) {
        res.status(403);
        throw new Error('Not authorized to view attendance for this course');
      }
    }

    // Determine target event: allow client to pass ?date=YYYY-MM-DD
    const { date } = req.query;
    let event;
    if (date) {
      // Parse YYYY-MM-DD as local date to avoid UTC shift when constructing Date
      const m = String(date).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (m) {
        const year = parseInt(m[1], 10);
        const monthIndex = parseInt(m[2], 10) - 1;
        const dayNum = parseInt(m[3], 10);
        const start = new Date(year, monthIndex, dayNum, 0, 0, 0, 0);
        const end = new Date(year, monthIndex, dayNum, 23, 59, 59, 999);
        event = await Event.findOne({ course: courseId, date: { $gte: start, $lte: end } }).sort({ date: 1 });
      } else {
        const start = new Date(date);
        start.setHours(0,0,0,0);
        const end = new Date(date);
        end.setHours(23,59,59,999);
        event = await Event.findOne({ course: courseId, date: { $gte: start, $lte: end } }).sort({ date: 1 });
      }
    } else {
      const now = new Date();
      event = await Event.findOne({ course: courseId, date: { $gte: now } }).sort({ date: 1 });
      if (!event) {
        event = await Event.findOne({ course: courseId }).sort({ date: -1 });
      }
    }

    if (!event) {
      return res.json({ course: { _id: course._id, title: course.title }, instructor: course.instructor, event: null, attendance: [] });
    }

    // Build attendance list: include all enrolled students for the course.
    // If `course.enrolledStudents` is empty, fall back to Enrollment records.
    let enrolled = Array.isArray(course.enrolledStudents) ? course.enrolledStudents : [];
    if ((!enrolled || enrolled.length === 0)) {
      try {
        const fromEnroll = await Enrollment.find({ courseId: courseId }).select('studentId').lean();
        if (Array.isArray(fromEnroll) && fromEnroll.length) {
          enrolled = fromEnroll.map(e => e.studentId).filter(Boolean);
        }
      } catch (e) {
        enrolled = [];
      }
    }
    const students = await User.find({ _id: { $in: enrolled } }).select('fullName email');

    const rawRecords = await Attendance.find({ eventId: event._id }).populate('studentId', 'fullName email').lean();
    const records = Array.isArray(rawRecords) ? rawRecords.map(normalizeAttendanceRecord) : [];
    const presentMap = new Map(records.map(r => [r.studentId && r.studentId._id ? r.studentId._id.toString() : (r.studentId && r.studentId.toString ? r.studentId.toString() : String(r.studentId)), r]));

    const attendance = students.map(s => {
      const found = presentMap.get(s._id.toString());
      const hasRecord = !!found;
      const hasJoined = !!(found && found.joinedAt);
      let status;
      if (hasRecord && hasJoined) {
        status = 'Present';
      } else if (!hasRecord) {
        status = 'Absent';
      } else {
        const st = String(found.status || '').toLowerCase();
        status = st === 'absent' ? 'Absent' : 'Present';
      }

      return {
        student: { _id: s._id, fullName: s.fullName, email: s.email },
        status,
        joinedAt: status === 'Present' && found && found.joinedAt ? found.joinedAt : null,
        leftAt: status === 'Present' && found && found.leftAt ? found.leftAt : null
      };
    });

    res.json({ course: { _id: course._id, title: course.title }, instructor: course.instructor, event: { _id: event._id, date: event.date, startTime: event.startTime, endTime: event.endTime }, attendance });
  })
  ,
  // Student accessed the event page (not joined) - record accessedAt
  accessEvent: asyncHandler(async (req, res) => {
    const { eventId } = req.body;
    const userId = req.user && req.user._id;
    if (!eventId) {
      res.status(400);
      throw new Error('eventId is required');
    }

    const now = new Date();
    const filter = { eventId, studentId: userId };
    const update = { $set: { accessedAt: now } };
    const opts = { upsert: true };
    await Attendance.updateOne(filter, update, opts);
    res.json({ success: true, accessedAt: now });
  }),

  // Student explicitly leaves the event page (optional)
  leaveEvent: asyncHandler(async (req, res) => {
    const eventId = req.params.eventId || req.body.eventId;
    const userId = req.user && req.user._id;
    if (!eventId) {
      res.status(400);
      throw new Error('eventId is required');
    }
    const now = new Date();
    // Only update existing attendance records on leave — do not create new ones here.
    const att = await Attendance.findOne({ eventId, studentId: userId });
    if (!att) {
      // No attendance record to update; return success but do not create a new document
      return res.json({ success: true, leftAt: null, message: 'No attendance record to update' });
    }

    // Only set leftAt when the student is present and leftAt is not already set
    const curStatus = String(att.status || '').toLowerCase();
    if ((curStatus === 'present' || !!att.joinedAt) && !att.leftAt) {
      // Ensure leftAt is strictly after joinedAt to avoid equal timestamps
      if (att.joinedAt && now <= new Date(att.joinedAt)) {
        att.leftAt = new Date(new Date(att.joinedAt).getTime() + 1000);
      } else {
        att.leftAt = now;
      }
      await att.save();
      return res.json({ success: true, leftAt: att.leftAt });
    }

    // Nothing to update (either already left or was not present)
    return res.json({ success: true, leftAt: att.leftAt || null, message: 'No update performed' });
  }),
  recordLiveSessionAttendance,
  updateLiveSessionAttendance,
  getLiveSessionAttendance,
  getStudentLiveSessionAttendance
};

// Beacon-compatible leave that accepts token via query or body and verifies JWT manually
module.exports.leaveEventBeacon = asyncHandler(async (req, res) => {
  const eventId = req.params.eventId || req.body.eventId;
  const token = req.query.token || (req.body && req.body.token) || null;
  if (!eventId) {
    res.status(400);
    throw new Error('eventId is required');
  }
  if (!token) {
    // no token — cannot identify user; respond success to avoid blocking unload
    return res.json({ success: true, leftAt: null, message: 'No token provided' });
  }
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    return res.json({ success: true, leftAt: null, message: 'Invalid token' });
  }
  const user = await User.findById(decoded.id).lean();
  if (!user) return res.json({ success: true, leftAt: null, message: 'User not found' });

  // Reuse leaveEvent logic but operate without protect middleware
  const userId = user._id;
  const now = new Date();
  const att = await Attendance.findOne({ eventId, studentId: userId });
  if (!att) return res.json({ success: true, leftAt: null, message: 'No attendance record to update' });

  const curStatus = String(att.status || '').toLowerCase();
  if ((curStatus === 'present' || !!att.joinedAt) && !att.leftAt) {
    if (att.joinedAt && now <= new Date(att.joinedAt)) {
      att.leftAt = new Date(new Date(att.joinedAt).getTime() + 1000);
    } else {
      att.leftAt = now;
    }
    await att.save();
    return res.json({ success: true, leftAt: att.leftAt });
  }

  return res.json({ success: true, leftAt: att.leftAt || null, message: 'No update performed' });
});
