const Event = require('../models/eventModel');
const asyncHandler = require('express-async-handler');

// @desc    Create new event
// @route   POST /api/events
// @access  Private (Instructor/Admin)
const createEvent = asyncHandler(async (req, res) => {
    const {
        title,
        type,
        date,
        startTime,
        endTime,
        location,
        maxStudents,
        course
    } = req.body;

    const event = await Event.create({
        title,
        instructor: req.user._id, // From auth middleware
        type,
        date,
        startTime,
        endTime,
        location,
        maxStudents,
        course
    });

    if (event) {
        res.status(201).json(event);
    } else {
        res.status(400);
        throw new Error('Invalid event data');
    }
});

// @desc    Get all events
// @route   GET /api/events
// @access  Private
const getEvents = asyncHandler(async (req, res) => {
    const events = await Event.find({})
        .populate('instructor', 'name email')
        .populate('course', 'title')
        .sort({ date: 1 });
    res.json(events);
});

// @desc    Get user's events (enrolled or teaching)
// @route   GET /api/events/my-events
// @access  Private
const getMyEvents = asyncHandler(async (req, res) => {
    const events = await Event.find({
        $or: [
            { instructor: req.user._id },
            { enrolledStudents: req.user._id }
        ]
    })
    .populate('instructor', 'name email')
    .populate('course', 'title')
    .sort({ date: 1 });
    
    res.json(events);
});

// @desc    Get upcoming events
// @route   GET /api/events/upcoming
// @access  Private
const getUpcomingEvents = asyncHandler(async (req, res) => {
    const events = await Event.find({
        date: { $gte: new Date() },
        status: 'Scheduled'
    })
    .populate('instructor', 'name email')
    .populate('course', 'title')
    .sort({ date: 1 })
    .limit(5);
    
    res.json(events);
});

// @desc    Enroll in event
// @route   POST /api/events/:id/enroll
// @access  Private
const enrollInEvent = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
        res.status(404);
        throw new Error('Event not found');
    }

    // Check if event is full
    if (event.enrolledStudents.length >= event.maxStudents) {
        res.status(400);
        throw new Error('Event is full');
    }

    // Check if user is already enrolled
    if (event.enrolledStudents.includes(req.user._id)) {
        res.status(400);
        throw new Error('Already enrolled in this event');
    }

    event.enrolledStudents.push(req.user._id);
    await event.save();

    res.json({ message: 'Successfully enrolled in event' });
});

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private (Instructor/Admin)
const updateEvent = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);

    if (!event) {
        res.status(404);
        throw new Error('Event not found');
    }

    // Check if user is instructor of the event or admin
    if (event.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Not authorized to update this event');
    }

    const updatedEvent = await Event.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
    );

    res.json(updatedEvent);
});

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private (Instructor/Admin)
const deleteEvent = asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);

    if (!event) {
        res.status(404);
        throw new Error('Event not found');
    }

    // Check if user is instructor of the event or admin
    if (event.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Not authorized to delete this event');
    }

    await event.remove();
    res.json({ message: 'Event removed' });
});

// @desc    Set reminder for upcoming class
// @route   POST /api/events/reminder
// @access  Private
const setReminder = asyncHandler(async (req, res) => {
    const { eventTitle, eventDate } = req.body;
    const userId = req.user._id;

    console.log('Setting reminder:', { eventTitle, eventDate, userId });

    if (!eventTitle || !eventDate) {
        res.status(400);
        throw new Error('Event title and date are required');
    }

    // Create a notification for the user
    const Notification = require('../models/notificationModel');
    
    // Create a reminder notification with route pointing to the specific event
    const reminder = await Notification.create({
        userId,
        title: eventTitle,
        message: `Reminder: ${eventTitle} is scheduled for ${eventDate}`,
        type: 'reminder',
        // Include the event title in the route so the Schedule page can highlight it
        route: `/schedule?eventTitle=${encodeURIComponent(eventTitle)}`,
        unread: true
    });

    console.log('Reminder created:', reminder._id);

    res.status(200).json({
        success: true,
        message: `Reminder set for ${eventTitle}`,
        reminder: {
            _id: reminder._id,
            reminded: true
        }
    });
});

module.exports = {
    createEvent,
    getEvents,
    getMyEvents,
    getUpcomingEvents,
    enrollInEvent,
    updateEvent,
    deleteEvent,
    setReminder
};