const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { recordAttendance, getAttendanceForCourse } = require('../controllers/attendanceController');

// Record when a user joins a meet
router.post('/events/:id/record', protect, recordAttendance);

// Get attendance for a course (instructor or admin)
router.get('/course/:courseId', protect, getAttendanceForCourse);

module.exports = router;
