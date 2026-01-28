const asyncHandler = require('express-async-handler');
const Attendance = require('../models/attendanceModel');
const Event = require('../models/eventModel');
const Course = require('../models/courseModel');
const User = require('../models/userModel');

// Record attendance when a student joins a meet (idempotent)
const recordAttendance = asyncHandler(async (req, res) => {
  const eventId = req.params.id;
  const userId = req.user && req.user._id;

  const event = await Event.findById(eventId);
  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }

  // Ensure student is enrolled in event/course or allow any student to join
  // Create or update attendance
  let att = await Attendance.findOne({ event: eventId, student: userId });
  if (!att) {
    att = await Attendance.create({ event: eventId, student: userId, joinedAt: new Date() });
  } else {
    att.joinedAt = new Date();
    await att.save();
  }

  res.json({ success: true, attendanceId: att._id, joinedAt: att.joinedAt });
});

// Get attendance for a course for the nearest scheduled meeting (or a specific date via query)
const getAttendanceForCourse = asyncHandler(async (req, res) => {
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
    const start = new Date(date);
    start.setHours(0,0,0,0);
    const end = new Date(date);
    end.setHours(23,59,59,999);
    event = await Event.findOne({ course: courseId, date: { $gte: start, $lte: end } }).sort({ date: 1 });
  } else {
    // pick next upcoming event for this course, otherwise most recent past
    const now = new Date();
    event = await Event.findOne({ course: courseId, date: { $gte: now } }).sort({ date: 1 });
    if (!event) {
      event = await Event.findOne({ course: courseId }).sort({ date: -1 });
    }
  }

  if (!event) {
    return res.json({ course: { _id: course._id, title: course.title }, instructor: course.instructor, event: null, attendance: [] });
  }

  // Build attendance list: include all enrolled students for the course
  const enrolled = course.enrolledStudents || [];
  // Populate enrolled student details
  const students = await User.find({ _id: { $in: enrolled } }).select('fullName email');

  const records = await Attendance.find({ event: event._id }).populate('student', 'fullName email');
  const presentMap = new Map(records.map(r => [r.student._id.toString(), r]));

  const attendance = students.map(s => {
    const found = presentMap.get(s._id.toString());
    return {
      student: { _id: s._id, fullName: s.fullName, email: s.email },
      status: found ? 'Present' : 'Absent',
      joinedAt: found ? found.joinedAt : null
    };
  });

  res.json({ course: { _id: course._id, title: course.title }, instructor: course.instructor, event: { _id: event._id, date: event.date, startTime: event.startTime, endTime: event.endTime }, attendance });
});

module.exports = {
  recordAttendance,
  getAttendanceForCourse
};
