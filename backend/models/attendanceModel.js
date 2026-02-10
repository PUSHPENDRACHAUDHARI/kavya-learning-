const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
    index: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  instructorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  subjectName: {
    type: String,
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  studentEmail: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent'],
    required: true,
    default: 'absent'
  },
  markedBy: {
    type: String,
    enum: ['student', 'instructor', 'auto'],
    default: 'instructor'
  },
  joinedAt: {
    type: Date,
    default: null
  },
  leftAt: {
    type: Date,
    default: null
  },
  accessedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Compound index for efficient querying
attendanceSchema.index({ eventId: 1, studentId: 1 }, { unique: true });
attendanceSchema.index({ instructorId: 1, date: 1 });
attendanceSchema.index({ courseId: 1, date: 1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);
module.exports = Attendance;
