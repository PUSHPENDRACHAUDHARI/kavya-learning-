const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
  recordAttendance, 
  getAttendanceForCourse,
  recordLiveSessionAttendance,
  updateLiveSessionAttendance,
  getLiveSessionAttendance,
  getStudentLiveSessionAttendance
} = require('../controllers/attendanceController');

// Record when a user joins a meet
router.post('/events/:id/record', protect, recordAttendance);

// Get attendance for a course (instructor or admin)
router.get('/course/:courseId', protect, getAttendanceForCourse);

// Live session attendance routes
router.post('/live-sessions/:sessionId/join', protect, recordLiveSessionAttendance);
router.post('/live-sessions/:sessionId/leave', protect, updateLiveSessionAttendance);
router.get('/live-sessions/:sessionId', protect, getLiveSessionAttendance);
router.get('/student/live-sessions', protect, getStudentLiveSessionAttendance);

module.exports = router;
