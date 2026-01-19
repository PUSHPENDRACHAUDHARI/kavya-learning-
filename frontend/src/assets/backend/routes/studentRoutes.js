const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getStudentDashboard,
  getStudentCourses,
  getStudentCourse,
  completeLesson,
  getStudentAchievements,
  getStudentActivity,
  updateStudentProfile,
  enrollCourse,
  getStudentProfile
} = require('../controllers/studentController');

const router = express.Router();

// Protect all routes - require student role
router.use(protect, authorize('student'));

// Dashboard
router.get('/dashboard', getStudentDashboard);

// Profile
router.get('/profile', getStudentProfile);
router.put('/profile', updateStudentProfile);

// Courses
router.get('/courses', getStudentCourses);
router.get('/courses/:courseId', getStudentCourse);
router.post('/enroll/:courseId', enrollCourse);

// Lesson completion
router.post('/courses/:courseId/lessons/:lessonId/complete', completeLesson);

// Achievements
router.get('/achievements', getStudentAchievements);

// Activity
router.get('/activity', getStudentActivity);

module.exports = router;
