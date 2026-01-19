const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getInstructorCourses,
  getInstructorCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseLessons,
  createLesson,
  updateLesson,
  deleteLesson,
  uploadCoursePdf,
  getInstructorStudents,
  getStudentProfile,
  updateStudentStatus,
  getStudentCourseProgress
} = require('../controllers/instructorController');

const router = express.Router();

// Protect all routes - require instructor role
router.use(protect, authorize('instructor'));

// ==================== COURSES ====================
router.get('/courses', getInstructorCourses);
router.get('/courses/:id', getInstructorCourse);
router.post('/courses', createCourse);
router.put('/courses/:id', updateCourse);
router.delete('/courses/:id', deleteCourse);

// Upload PDF resource for instructor-owned course
const { uploadPdf } = require('../middleware/multer');
router.post('/course/upload-pdf/:courseId', uploadPdf.single('pdfResource'), uploadCoursePdf);

// ==================== LESSONS ====================
router.get('/courses/:courseId/lessons', getCourseLessons);
router.post('/courses/:courseId/lessons', createLesson);
router.put('/lessons/:id', updateLesson);
router.delete('/lessons/:id', deleteLesson);

// ==================== STUDENTS ====================
router.get('/students', getInstructorStudents);
router.get('/students/:studentId', getStudentProfile);
router.put('/students/:studentId', updateStudentStatus);
router.get('/students/:studentId/progress/:courseId', getStudentCourseProgress);

module.exports = router;
