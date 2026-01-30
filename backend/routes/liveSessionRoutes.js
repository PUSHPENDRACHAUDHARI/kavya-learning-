const express = require('express');
const router = express.Router();
const {
    createLiveSession,
    getCourseLiveSessions,
    getLiveSession,
    startLiveSession,
    endLiveSession,
    joinLiveSession,
    leaveLiveSession,
    getInstructorLiveSessions,
    updateParticipantStatus
} = require('../controllers/liveSessionController');
const { protect } = require('../middleware/authMiddleware');

// All routes are protected
router.use(protect);

// Create live session
router.post('/', createLiveSession);

// Get sessions for a specific course
router.get('/course/:courseId', getCourseLiveSessions);

// Get instructor's sessions
router.get('/instructor/me', getInstructorLiveSessions);

// Get specific session
router.get('/:id', getLiveSession);

// Start session
router.post('/:id/start', startLiveSession);

// End session
router.post('/:id/end', endLiveSession);

// Join session
router.post('/:id/join', joinLiveSession);

// Leave session
router.post('/:id/leave', leaveLiveSession);

// Update participant status
router.put('/:id/participant-status', updateParticipantStatus);

module.exports = router;
