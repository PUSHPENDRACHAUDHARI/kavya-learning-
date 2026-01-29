const LiveSession = require('../models/liveSessionModel');
const Course = require('../models/courseModel');
const User = require('../models/userModel');
const asyncHandler = require('express-async-handler');

// @desc    Create a new live session
// @route   POST /api/live-sessions
// @access  Private (Instructor only)
const createLiveSession = asyncHandler(async (req, res) => {
    const { title, description, courseId, scheduledStartTime, maxParticipants, settings } = req.body;

    console.log('Creating live session:', { title, description, courseId, scheduledStartTime, maxParticipants, settings });
    console.log('User:', req.user.id, 'Role:', req.user.role);

    // Verify course exists and user is the instructor
    const course = await Course.findById(courseId);
    if (!course) {
        console.log('Course not found:', courseId);
        return res.status(404).json({ message: 'Course not found' });
    }

    console.log('Course found:', course._id);
    console.log('Course instructor:', course.instructor);
    console.log('Request user ID:', req.user.id);

    if (course.instructor.toString() !== req.user.id) {
        console.log('Access denied - not instructor');
        return res.status(403).json({ message: 'Not authorized to create session for this course' });
    }

    const liveSession = await LiveSession.create({
        title,
        description,
        course: courseId,
        instructor: req.user.id,
        scheduledStartTime: new Date(scheduledStartTime),
        maxParticipants: maxParticipants || 100,
        settings: settings || {}
    });

    await liveSession.populate([
        { path: 'course', select: 'title' },
        { path: 'instructor', select: 'fullName email' }
    ]);

    console.log('Live session created:', liveSession._id);
    res.status(201).json(liveSession);
});

// @desc    Get live sessions for a course
// @route   GET /api/live-sessions/course/:courseId
// @access  Private
const getCourseLiveSessions = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const { status } = req.query;

    console.log('Fetching sessions for course:', courseId);
    console.log('User:', req.user.id, 'Role:', req.user.role);

    // Verify user has access to this course
    const course = await Course.findById(courseId);
    if (!course) {
        console.log('Course not found:', courseId);
        return res.status(404).json({ message: 'Course not found' });
    }

    console.log('Course found:', course._id);
    console.log('Course instructor:', course.instructor);
    console.log('Enrolled students:', course.enrolledStudents);

    const isEnrolled = course.enrolledStudents.some(student => student.toString() === req.user.id);
    const isInstructor = course.instructor.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    console.log('Access check - Enrolled:', isEnrolled, 'Instructor:', isInstructor, 'Admin:', isAdmin);

    // Allow access if user is instructor, admin, or enrolled student
    if (!isEnrolled && !isInstructor && !isAdmin) {
        console.log('Access denied for user:', req.user.id);
        return res.status(403).json({ message: 'Not authorized to access sessions for this course' });
    }

    const filter = { course: courseId };
    if (status) {
        filter.status = status;
    }

    console.log('Filter:', filter);

    const sessions = await LiveSession.find(filter)
        .populate('instructor', 'fullName email')
        .sort({ scheduledStartTime: -1 });

    console.log('Sessions found:', sessions.length);
    res.json(sessions);
});

// @desc    Get live session details
// @route   GET /api/live-sessions/:id
// @access  Private
const getLiveSession = asyncHandler(async (req, res) => {
    const session = await LiveSession.findById(req.params.id)
        .populate('course', 'title')
        .populate('instructor', 'fullName email')
        .populate('participants.user', 'fullName email avatar');

    if (!session) {
        return res.status(404).json({ message: 'Session not found' });
    }

    // Check access permissions
    const course = await Course.findById(session.course._id);
    const isEnrolled = course.enrolledStudents.includes(req.user.id);
    const isInstructor = session.instructor._id.toString() === req.user.id;

    if (!isEnrolled && !isInstructor && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to access this session' });
    }

    res.json(session);
});

// @desc    Start a live session
// @route   POST /api/live-sessions/:id/start
// @access  Private (Instructor only)
const startLiveSession = asyncHandler(async (req, res) => {
    const session = await LiveSession.findById(req.params.id);

    if (!session) {
        return res.status(404).json({ message: 'Session not found' });
    }

    if (session.instructor.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to start this session' });
    }

    if (session.status !== 'scheduled') {
        return res.status(400).json({ message: 'Session cannot be started' });
    }

    session.status = 'live';
    session.actualStartTime = new Date();
    await session.save();

    res.json(session);
});

// @desc    End a live session
// @route   POST /api/live-sessions/:id/end
// @access  Private (Instructor only)
const endLiveSession = asyncHandler(async (req, res) => {
    const session = await LiveSession.findById(req.params.id);

    if (!session) {
        return res.status(404).json({ message: 'Session not found' });
    }

    if (session.instructor.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to end this session' });
    }

    if (session.status !== 'live') {
        return res.status(400).json({ message: 'Session is not live' });
    }

    session.status = 'ended';
    session.endTime = new Date();
    await session.save();

    res.json(session);
});

// @desc    Join a live session
// @route   POST /api/live-sessions/:id/join
// @access  Private
const joinLiveSession = asyncHandler(async (req, res) => {
    const session = await LiveSession.findById(req.params.id)
        .populate('course', 'title enrolledStudents')
        .populate('instructor', 'fullName');

    if (!session) {
        return res.status(404).json({ message: 'Session not found' });
    }

    if (session.status !== 'live') {
        return res.status(400).json({ message: 'Session is not live' });
    }

    // Check if user is enrolled or is the instructor
    const isEnrolled = session.course.enrolledStudents.some(student => 
        student.toString() === req.user.id
    );
    const isInstructor = session.instructor._id.toString() === req.user.id;

    if (!isEnrolled && !isInstructor && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to join this session' });
    }

    // Check max participants
    const activeParticipants = session.getActiveParticipants();
    if (activeParticipants.length >= session.maxParticipants && !isInstructor) {
        return res.status(400).json({ message: 'Session is full' });
    }

    // Add participant
    await session.addParticipant(req.user.id, req.body.socketId);

    res.json({
        message: 'Joined session successfully',
        session: {
            id: session._id,
            title: session.title,
            meetingLink: session.meetingLink,
            settings: session.settings
        }
    });
});

// @desc    Leave a live session
// @route   POST /api/live-sessions/:id/leave
// @access  Private
const leaveLiveSession = asyncHandler(async (req, res) => {
    const session = await LiveSession.findById(req.params.id);

    if (!session) {
        return res.status(404).json({ message: 'Session not found' });
    }

    await session.removeParticipant(req.user.id);

    res.json({ message: 'Left session successfully' });
});

// @desc    Get instructor's live sessions
// @route   GET /api/live-sessions/instructor/me
// @access  Private (Instructor only)
const getInstructorLiveSessions = asyncHandler(async (req, res) => {
    const { status } = req.query;
    
    const filter = { instructor: req.user.id };
    if (status) {
        filter.status = status;
    }

    const sessions = await LiveSession.find(filter)
        .populate('course', 'title')
        .sort({ scheduledStartTime: -1 });

    res.json(sessions);
});

// @desc    Update participant status (mute/unmute, video on/off, hand raise)
// @route   PUT /api/live-sessions/:id/participant-status
// @access  Private
const updateParticipantStatus = asyncHandler(async (req, res) => {
    const { isMuted, isVideoOff, isHandRaised } = req.body;
    
    const session = await LiveSession.findById(req.params.id);
    if (!session) {
        return res.status(404).json({ message: 'Session not found' });
    }

    const participant = session.participants.find(p => 
        p.user.toString() === req.user.id && !p.leftAt
    );

    if (!participant) {
        return res.status(404).json({ message: 'Participant not found in session' });
    }

    if (isMuted !== undefined) participant.isMuted = isMuted;
    if (isVideoOff !== undefined) participant.isVideoOff = isVideoOff;
    if (isHandRaised !== undefined) participant.isHandRaised = isHandRaised;

    await session.save();

    res.json({ message: 'Participant status updated' });
});

module.exports = {
    createLiveSession,
    getCourseLiveSessions,
    getLiveSession,
    startLiveSession,
    endLiveSession,
    joinLiveSession,
    leaveLiveSession,
    getInstructorLiveSessions,
    updateParticipantStatus
};
