const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Numeric schedule value (e.g., progress, score) — starts at 0
    value: {
      type: Number,
      default: 0,
    },
    // Optional structured schedule entries (e.g., per-day objects)
    entries: [
      {
        title: String,
        date: Date,
        meta: mongoose.Schema.Types.Mixed,
      }
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Schedule', scheduleSchema);
