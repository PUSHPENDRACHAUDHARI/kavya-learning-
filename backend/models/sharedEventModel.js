const mongoose = require('mongoose');

const sharedEventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  date: { type: Date, required: true },
  startTime: { type: String },
  endTime: { type: String },
  location: { type: String },
  maxStudents: { type: Number, default: 30 },
  meetLink: { type: String, default: null },
  createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdByRole: { type: String },
  originalEventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  status: { type: String, enum: ['Scheduled','In Progress','Completed','Cancelled'], default: 'Scheduled' }
}, { timestamps: true });

const SharedEvent = mongoose.model('SharedEvent', sharedEventSchema);
module.exports = SharedEvent;
