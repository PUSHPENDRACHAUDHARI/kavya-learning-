const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, default: '' },
  // Attachments may be stored as uploaded URLs or inline base64 data.
  // Keep flexible schema to support both legacy (`name`, `type`, `data`) and
  // current (`url`, `filename`, `mimeType`, `size`) shapes.
  attachments: [{
    // uploaded resource
    url: { type: String },
    filename: { type: String },
    mimeType: { type: String },
    size: { type: Number },
    // legacy inline fields
    name: { type: String },
    type: { type: String },
    data: { type: String }
  }],
  read: { type: Boolean, default: false },
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Track which users have deleted this message
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);
