const asyncHandler = require('express-async-handler');
const SharedEvent = require('../models/sharedEventModel');
const Event = require('../models/eventModel');

// Create a shared event (only instructor/admin)
const createSharedEvent = asyncHandler(async (req, res) => {
  const {
    title,
    instructor,
    course,
    date,
    startTime,
    endTime,
    location,
    maxStudents,
    meetLink,
    originalEventId
  } = req.body;

  if (!title || !date) {
    res.status(400);
    throw new Error('Title and date are required');
  }

  const shared = await SharedEvent.create({
    title,
    instructor,
    course,
    date,
    startTime,
    endTime,
    location,
    maxStudents,
    meetLink,
    originalEventId,
    createdByUserId: req.user._id,
    createdByRole: req.user.role
  });

  res.status(201).json(shared);
});

// Get shared events; optional ?date=YYYY-MM-DD to filter by day
const getSharedEvents = asyncHandler(async (req, res) => {
  const { date } = req.query;
  let filter = {};
  if (date) {
    // Parse YYYY-MM-DD as local date to avoid UTC parsing shifting the day
    const m = String(date).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) {
      const year = parseInt(m[1], 10);
      const monthIndex = parseInt(m[2], 10) - 1;
      const dayNum = parseInt(m[3], 10);
      const start = new Date(year, monthIndex, dayNum, 0, 0, 0, 0);
      const end = new Date(year, monthIndex, dayNum, 23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    } else {
      const start = new Date(date);
      start.setHours(0,0,0,0);
      const end = new Date(date);
      end.setHours(23,59,59,999);
      filter.date = { $gte: start, $lte: end };
    }
  }

  const events = await SharedEvent.find(filter)
    .populate('instructor', 'fullName email')
    .populate('course', 'title')
    .sort({ date: 1 });

  res.json(events);
});

module.exports = {
  createSharedEvent,
  getSharedEvents
};
