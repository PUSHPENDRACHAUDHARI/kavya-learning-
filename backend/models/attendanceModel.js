const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: false },
  liveSession: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveSession', required: false },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: false },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  joinedAt: { type: Date, default: Date.now },
  leftAt: { type: Date },
  duration: { type: Number }, // Duration in minutes
  attendanceType: {
    type: String,
    enum: ['event', 'live_class', 'lesson'],
    default: 'live_class'
  },
  status: {
    type: String,
    enum: ['present', 'late', 'early_leave', 'absent'],
    default: 'present'
  },
  cameraEnabled: { type: Boolean, default: false },
  micEnabled: { type: Boolean, default: false },
  participationScore: { type: Number, default: 0 }, // Based on chat, hand raises, etc.
  notes: { type: String }
}, { timestamps: true });

// Index for efficient queries
attendanceSchema.index({ student: 1, course: 1 });
attendanceSchema.index({ liveSession: 1 });
attendanceSchema.index({ attendanceType: 1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);
module.exports = Attendance;
