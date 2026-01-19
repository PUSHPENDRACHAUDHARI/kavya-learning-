const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: { type: String },
  message: { type: String },
  targetRole: { type: String, enum: ['all', 'students', 'parents', 'instructors'], default: 'all' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Optional media fields (stored as URLs returned from upload endpoint / Cloudinary)
  image: { type: String },
  imageName: { type: String },
  imageMime: { type: String },
  video: { type: String },
  videoName: { type: String },
  videoMime: { type: String },
  file: { type: String },
  fileName: { type: String },
  fileMime: { type: String }
}, { timestamps: true });

// Ensure at least one of title/message/media is present
announcementSchema.pre('validate', function (next) {
  try {
    if (!this.title && !this.message && !this.image && !this.video && !this.file) {
      this.invalidate('message', 'At least one of title, message, image, video, or file is required');
    }
    next();
  } catch (err) {
    next(err);
  }
});

const Announcement = mongoose.model('Announcement', announcementSchema);
module.exports = Announcement;
