const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: { type: String, required: true },
  filename: { type: String },
  publicId: { type: String },
  url: { type: String, required: true },
  mimeType: { type: String },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// Optional visibility restrictions: instructor and subject (course)
noteSchema.add({
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null }
});

const Note = mongoose.model('Note', noteSchema);
module.exports = Note;