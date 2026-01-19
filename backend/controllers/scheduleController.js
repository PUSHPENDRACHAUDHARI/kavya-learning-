const Schedule = require('../models/scheduleModel');
const Event = require('../models/eventModel');

// Get or initialize schedule for logged-in user
exports.getSchedule = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    let schedule = await Schedule.findOne({ userId });
    if (!schedule) {
      schedule = new Schedule({ userId, value: 0, entries: [] });
      await schedule.save();
    }

    res.status(200).json({ success: true, schedule });
  } catch (error) {
    console.error('Error getting schedule:', error);
    res.status(500).json({ success: false, message: 'Error getting schedule' });
  }
};

// Update schedule for logged-in user (partial updates allowed)
exports.updateSchedule = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const updates = {};

    if (typeof req.body.value !== 'undefined') updates.value = req.body.value;
    if (Array.isArray(req.body.entries)) updates.entries = req.body.entries;

    const schedule = await Schedule.findOneAndUpdate(
      { userId },
      { $set: updates },
      { new: true, upsert: true }
    );

    res.status(200).json({ success: true, schedule });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ success: false, message: 'Error updating schedule' });
  }
};

// Reset schedule value to 0 for the user
exports.resetSchedule = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    const schedule = await Schedule.findOneAndUpdate(
      { userId },
      { $set: { value: 0, entries: [] } },
      { new: true, upsert: true }
    );

    res.status(200).json({ success: true, schedule });
  } catch (error) {
    console.error('Error resetting schedule:', error);
    res.status(500).json({ success: false, message: 'Error resetting schedule' });
  }
};

// Get upcoming classes for the logged-in user
exports.getUpcomingClasses = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const now = new Date();

    // Find events where the user is enrolled and the event is in the future and scheduled
    const query = {
      enrolledStudents: userId,
      date: { $gte: now },
      status: 'Scheduled',
    };

    const limit = parseInt(req.query.limit, 10) || 20;
    const page = parseInt(req.query.page, 10) || 1;
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      Event.find(query).sort({ date: 1 }).limit(limit).skip(skip).lean(),
      Event.countDocuments(query),
    ]);

    // If no events, return count 0 and empty list (prevents empty UI)
    res.status(200).json({ success: true, upcomingCount: total || 0, upcoming: events || [], page, pages: Math.ceil((total || 0) / limit) });
  } catch (error) {
    console.error('Error fetching upcoming classes:', error);
    res.status(500).json({ success: false, message: 'Error fetching upcoming classes' });
  }
};
