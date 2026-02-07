const Event = require('../models/eventModel');
const asyncHandler = require('express-async-handler');
const Course = require('../models/courseModel');
const { getIo } = require('../sockets/io');

// Helper: parse time string like "HH:MM" or "H:MM AM/PM" into { hh, mm }
const parseTimeString = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const m = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
    if (!m) return null;
    let hh = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    const mer = m[3] ? m[3].toUpperCase() : null;
    if (mer) {
        if (mer === 'AM' && hh === 12) hh = 0;
        else if (mer === 'PM' && hh !== 12) hh += 12;
    }
    if (isNaN(hh) || isNaN(mm)) return null;
    return { hh, mm };
};

// Helper: build a local Date from YYYY-MM-DD and a time string (uses parseTimeString)
const buildDateTime = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return null;
    const parsed = parseTimeString(timeStr);
    if (!parsed) return null;
    const m = dateStr.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!m) return null;
    const year = parseInt(m[1], 10);
    const monthIndex = parseInt(m[2], 10) - 1;
    const day = parseInt(m[3], 10);
    const dt = new Date(year, monthIndex, day, parsed.hh, parsed.mm, 0, 0);
    if (isNaN(dt)) return null;
    return dt;
};

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
        course,
        meetLink
    } = req.body;

    // Combine date + time into full Date objects and validate
    const parseTimeString = (timeStr) => {
        if (!timeStr || typeof timeStr !== 'string') return null;
        // Accept formats like "HH:MM" or "H:MM AM/PM" or "HH:MM AM/PM"
        const m = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
        if (!m) return null;
        let hh = parseInt(m[1], 10);
        const mm = parseInt(m[2], 10);
        const mer = m[3] ? m[3].toUpperCase() : null;
        if (mer) {
            if (mer === 'AM' && hh === 12) hh = 0;
            else if (mer === 'PM' && hh !== 12) hh += 12;
        }
        if (isNaN(hh) || isNaN(mm)) return null;
        return { hh, mm };
    };

    const buildDateTime = (dateStr, timeStr) => {
        if (!dateStr || !timeStr) return null;
        const parsed = parseTimeString(timeStr);
        if (!parsed) return null;
        // Expect dateStr in YYYY-MM-DD; construct Date using local timezone
        const m = dateStr.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (!m) return null;
        const year = parseInt(m[1], 10);
        const monthIndex = parseInt(m[2], 10) - 1;
        const day = parseInt(m[3], 10);
        const dt = new Date(year, monthIndex, day, parsed.hh, parsed.mm, 0, 0);
        if (isNaN(dt)) return null;
        return dt;
    };

    const startDT = buildDateTime(date, startTime);
    const endDT = buildDateTime(date, endTime);
    if (!startDT || !endDT) {
        return res.status(400).json({ message: 'Invalid date or time format. Expected date YYYY-MM-DD and time HH:MM with optional AM/PM.' });
    }
    if (endDT.getTime() <= startDT.getTime()) {
        return res.status(400).json({ message: 'endDateTime must be later than startDateTime' });
    }

        // Allow admin to provide either an instructor ObjectId or a free-text instructorName.
        const payload = {
            title,
            type,
            // Store the full start datetime in `date` so queries comparing against
            // `new Date()` correctly include same-day events that occur later today.
            date: startDT,
            startTime,
            endTime,
            description: req.body.description || '',
            location,
            maxStudents,
            course,
            meetLink,
            createdByUserId: req.user._id,
            createdByRole: req.user.role
        };

        // If request provided instructor (id), and it looks like an ObjectId, use it.
        const maybeInstr = req.body.instructor;
        const maybeInstrName = req.body.instructorName || req.body.instructorName === '' ? req.body.instructorName : null;
        const isObjectIdLike = (val) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val);

        if (maybeInstr && isObjectIdLike(maybeInstr)) {
            payload.instructor = maybeInstr;
        } else if (req.user.role === 'instructor' && !maybeInstr && !maybeInstrName) {
            // If creator is an instructor and no instructor was supplied, default to creator
            payload.instructor = req.user._id;
        }

        // If admin supplied an instructorName (free-text), store it
        if (maybeInstrName) {
            payload.instructorName = maybeInstrName;
        }

        // If admin selected a course but didn't provide an instructor id or name,
        // assign the course's instructor (so the instructor sees this event on their schedule)
        if (payload.course && !payload.instructor && !payload.instructorName) {
            try {
                const courseObj = await Course.findById(payload.course).select('instructor');
                if (courseObj && courseObj.instructor) {
                    // courseObj.instructor may be an ObjectId or populated object
                    payload.instructor = courseObj.instructor._id ? courseObj.instructor._id : courseObj.instructor;
                }
            } catch (err) {
                // ignore lookup failures and proceed without setting instructor
            }
        }

        const created = await Event.create(payload);
    if (created) {
        try {
            console.log('Event created:', { id: created._id.toString(), title: created.title, createdBy: req.user._id.toString(), role: req.user.role });
        } catch (e) {}
        // Populate fields for immediate client use
        const event = await Event.findById(created._id)
            .populate('instructor', 'fullName email')
            .populate('createdByUserId', 'fullName email')
            .populate('course', 'title');
        // Emit socket event so other clients can refresh their lists
        try {
            const io = getIo();
            if (io) {
                io.emit('events:changed', { action: 'created', _id: event._id.toString() });
                const instrId = event.instructor && (event.instructor._id || event.instructor) ? (event.instructor._id || event.instructor).toString() : null;
                if (instrId) {
                    io.to(`user:${instrId}`).emit('event:created', { _id: event._id.toString() });
                }
            }
        } catch (err) { console.warn('Failed to emit socket event for create:', err); }

        res.status(201).json(event);
    } else {
        res.status(400);
        throw new Error('Invalid event data');
    }
});

// @desc    Get events (role-aware)
// @route   GET /api/events
// @access  Private
const getEvents = asyncHandler(async (req, res) => {
    const role = (req.user && req.user.role) ? req.user.role.toString().toLowerCase() : 'student';
    const userId = req.user && req.user._id ? req.user._id : null;

    let query = {};

    if (role === 'admin' || role === 'sub-admin') {
        // Admins see all events (including ones created by any instructor)
        query = {};
    } else if (role === 'instructor') {
        // Instructors see only events they created or where they are set as instructor
        query = {
            $and: [
                { deletedByRole: { $ne: 'instructor' } },
                { $or: [
                    { instructor: userId },
                    { createdByUserId: userId }
                ] }
            ]
        };
    } else {
        // Students/parents: return all upcoming scheduled events that are not soft-deleted by instructors.
        // Include events from today onwards (even if they started earlier today)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query = {
            date: { $gte: today },
            status: 'Scheduled',
            deletedByRole: { $ne: 'instructor' }
        };
    }

    const events = await Event.find(query)
        .populate('instructor', 'fullName email')
        .populate('createdByUserId', 'fullName email')
        .populate('course', 'title')
        .sort({ date: 1 });

    // Debug logging to help trace student visibility issues
    try {
        console.log(`getEvents: role=${role} userId=${userId} returning ${Array.isArray(events) ? events.length : 0} events`);
    } catch (e) {}

    res.json(events);
});

// @desc    Get user's events (enrolled or teaching)
// @route   GET /api/events/my-events
// @access  Private
const getMyEvents = asyncHandler(async (req, res) => {
    // Instructors/students should not get events soft-deleted by instructors
    const baseFilter = {
        $or: [
            { instructor: req.user._id },
            { enrolledStudents: req.user._id }
        ]
    };
    if (req.user.role === 'admin' || req.user.role === 'sub-admin') {
        // Admin sees all matching events
        // allow deletedByRole values
    } else {
        baseFilter.deletedByRole = { $ne: 'instructor' };
    }

    const events = await Event.find(baseFilter)
    .populate('instructor', 'fullName email')
    .populate('createdByUserId', 'fullName email')
    .populate('course', 'title')
    .sort({ date: 1 });
    
    res.json(events);
});

// @desc    Get upcoming events
// @route   GET /api/events/upcoming
// @access  Private
const getUpcomingEvents = asyncHandler(async (req, res) => {
    // Include events from today onwards (even if they started earlier today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const events = await Event.find({
        date: { $gte: today },
        status: 'Scheduled',
        deletedByRole: { $ne: 'instructor' }
    })
    .populate('instructor', 'fullName email')
    .populate('createdByUserId', 'fullName email')
    .populate('course', 'title')
    .sort({ date: 1 })
    .limit(5);

    res.json(events);
});

// @desc    Get events for a specific course
// @route   GET /api/events/course/:courseId
// @access  Private
const getEventsByCourse = asyncHandler(async (req, res) => {
    const { courseId } = req.params;

    const events = await Event.find({
        course: courseId,
        date: { $gte: new Date() },
        status: 'Scheduled'
    })
    .populate('instructor', 'fullName email')
    .populate('createdByUserId', 'fullName email')
    .populate('course', 'title')
    .sort({ date: 1 });

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

    // Resolve instructor id whether populated or raw
    let ownerId = null;
    if (event.instructor) {
        if (typeof event.instructor === 'string') ownerId = event.instructor;
        else if (event.instructor._id) ownerId = event.instructor._id.toString();
        else if (event.instructor.toString) ownerId = event.instructor.toString();
    }

    // Only allow instructors who own the event or admins to update
    if (req.user.role !== 'admin') {
        if (!ownerId || ownerId !== req.user._id.toString()) {
            res.status(403);
            throw new Error('Not authorized to update this event');
        }
    }

    // Sanitize incoming update payload: only admin can set free-text instructorName
    const updatePayload = { ...req.body };
    const isObjectIdLike = (val) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val);
    if (req.user.role !== 'admin') {
        // If a non-admin supplied `instructor` as a non-ObjectId string (e.g., a free-text name),
        // move it into `instructorName` so Mongoose won't attempt to cast it to ObjectId.
        if (updatePayload.instructor && !isObjectIdLike(updatePayload.instructor)) {
            updatePayload.instructorName = updatePayload.instructor;
            delete updatePayload.instructor;
        }
        // allow owner/instructor to preserve or set a free-text instructorName when editing their own event
    } else {
        // admin submitted instructor: ensure it's either an ObjectId or else ignore (they may use instructorName)
        if (updatePayload.instructor && !isObjectIdLike(updatePayload.instructor)) {
            delete updatePayload.instructor;
        }
    }

        // If admin updated the `course` and didn't set instructor/instructorName,
        // assign the course's instructor so that instructor will see the event.
        if (req.user.role === 'admin' && updatePayload.course && !updatePayload.instructor && !updatePayload.instructorName) {
            try {
                const courseObj = await Course.findById(updatePayload.course).select('instructor');
                if (courseObj && courseObj.instructor) {
                    updatePayload.instructor = courseObj.instructor._id ? courseObj.instructor._id : courseObj.instructor;
                }
            } catch (err) {
                // ignore lookup failure
            }
        }

        // If updating both date and startTime, ensure we store the combined datetime
        // in the `date` field so student-facing queries work the same as on create.
        if (updatePayload.date && updatePayload.startTime) {
            const parsedStart = buildDateTime(updatePayload.date, updatePayload.startTime);
            if (parsedStart) updatePayload.date = parsedStart;
        }

        const updatedRaw = await Event.findByIdAndUpdate(
                    req.params.id,
                    updatePayload,
                    { new: true }
            );
        const updatedEvent = await Event.findById(updatedRaw._id)
            .populate('instructor', 'fullName email')
            .populate('createdByUserId', 'fullName email')
            .populate('course', 'title');

        // Emit change so clients can refresh
        try {
            const io = getIo();
            if (io) io.emit('events:changed', { action: 'updated', _id: updatedEvent._id.toString() });
        } catch (err) { console.warn('Failed to emit events:changed for update', err); }

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

    // Admin can delete any event - hard delete from all panels
    if (req.user.role === 'admin' || req.user.role === 'sub-admin') {
        // Admin permanently deletes the event from database
        try {
            await Event.findByIdAndDelete(req.params.id);
            console.log('Admin deleted event:', { id: req.params.id, deletedBy: req.user._id.toString() });
        } catch (err) {
            console.error('Admin delete failed for event id:', req.params.id, err);
            res.status(500);
            throw new Error('Failed to delete event');
        }

        // Notify affected users via sockets so their UIs can remove the event
        try {
            const io = getIo();
            if (io) {
                const instrId = event.instructor && (event.instructor._id || event.instructor) ? (event.instructor._id || event.instructor).toString() : null;
                if (instrId) io.to(`user:${instrId}`).emit('event:deleted', { _id: event._id.toString(), deletedByRole: 'admin' });

                // Notify enrolled students
                if (Array.isArray(event.enrolledStudents) && event.enrolledStudents.length) {
                    event.enrolledStudents.forEach(sid => {
                        try { const id = sid && (sid._id || sid).toString ? (sid._id || sid).toString() : sid; if (id) io.to(`user:${id}`).emit('event:deleted', { _id: event._id.toString(), deletedByRole: 'admin' }); } catch (e) {}
                    });
                }

                // Broadcast to a general events channel so any subscribed admin panels update
                io.emit('events:changed', { action: 'deleted', _id: event._id.toString() });
            }
        } catch (err) {
            console.warn('Failed to emit socket event for delete:', err);
        }

        res.json({ message: 'Event permanently deleted from all panels' });
    }
    // Instructor deletes: require ownership and perform permanent deletion so it is removed
    // from all panels (instructor, student, admin) to avoid stale admin views.
    else if (req.user.role === 'instructor') {
        // Instructor may only delete events they created (instructor field)
        let ownerId = null;
        if (event.instructor) {
            if (typeof event.instructor === 'string') ownerId = event.instructor;
            else if (event.instructor._id) ownerId = event.instructor._id.toString();
            else if (event.instructor.toString) ownerId = event.instructor.toString();
        }
        if (!ownerId || ownerId !== req.user._id.toString()) {
            res.status(403);
            throw new Error('Forbidden: instructors can only delete their own events');
        }

        // Perform hard delete so the event is removed from all views and the DB.
        try {
            await Event.findByIdAndDelete(req.params.id);
        } catch (err) {
            res.status(500);
            throw new Error('Failed to delete event');
        }

        // Emit sockets so other clients (including admin and enrolled students) remove the event
        try {
            const io = getIo();
            if (io) {
                const instrId = event.instructor && (event.instructor._id || event.instructor) ? (event.instructor._id || event.instructor).toString() : null;
                if (instrId) io.to(`user:${instrId}`).emit('event:deleted', { _id: event._id.toString(), deletedByRole: 'instructor' });

                // Notify enrolled students
                if (Array.isArray(event.enrolledStudents) && event.enrolledStudents.length) {
                    event.enrolledStudents.forEach(sid => {
                        try { const id = sid && (sid._id || sid).toString ? (sid._id || sid).toString() : sid; if (id) io.to(`user:${id}`).emit('event:deleted', { _id: event._id.toString(), deletedByRole: 'instructor' }); } catch (e) {}
                    });
                }

                io.emit('events:changed', { action: 'deleted', _id: event._id.toString() });
            }
        } catch (err) {
            console.warn('Failed to emit socket event for instructor delete:', err);
        }

        res.json({ message: 'Event permanently deleted from all panels' });
    }
    else {
        res.status(403);
        throw new Error('Forbidden: only instructor or admin may delete this event');
    }
});

// @desc    Set reminder for upcoming class
// @route   POST /api/events/reminder
// @access  Private
const setReminder = asyncHandler(async (req, res) => {
    const { eventTitle, eventDate, reminderType } = req.body;
    const userId = req.user._id;

    console.log('🔔 Setting reminder:', { eventTitle, eventDate, userId, reminderType });

    if (!eventTitle || !eventDate) {
        console.error('❌ Missing eventTitle or eventDate');
        res.status(400);
        throw new Error('Event title and date are required');
    }

    try {
        // Create a notification for the user
        const Notification = require('../models/notificationModel');
        
        // Create a reminder notification with route pointing to the specific event
        const reminder = await Notification.create({
            userId,
            title: `Reminder: ${eventTitle}`,
            message: `Your class "${eventTitle}" is scheduled for ${eventDate}`,
            type: 'reminder',
            reminderType: reminderType || 'upcoming_class',
            // Include the event title and date in the route so the Schedule page can highlight it
            route: `/schedule?eventTitle=${encodeURIComponent(eventTitle)}&eventDate=${encodeURIComponent(eventDate)}`,
            unread: true,
            eventTitle,
            eventDate
        });

        console.log('✅ Reminder created successfully:', reminder._id);

        res.status(200).json({
            success: true,
            message: `Reminder set for ${eventTitle}`,
            reminder: {
                _id: reminder._id,
                reminded: true,
                title: reminder.title,
                message: reminder.message
            }
        });
    } catch (error) {
        console.error('❌ Error creating reminder:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to create reminder: ' + error.message
        });
    }
});

module.exports = {
    createEvent,
    getEvents,
    getMyEvents,
    getUpcomingEvents,
    getEventsByCourse,
    enrollInEvent,
    updateEvent,
    deleteEvent,
    setReminder
};
