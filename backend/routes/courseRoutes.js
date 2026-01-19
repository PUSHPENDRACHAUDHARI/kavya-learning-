const express = require('express');
const {
    createCourse,
    getCourses,
    getCourseById,
    updateCourse,
    deleteCourse,
    enrollCourse,
    reviewCourse,
    downloadCertificate
} = require('../controllers/courseController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
    .get(getCourses)
    .post(protect, createCourse);

// Admin-only delete all courses
router.delete('/all', protect, (req, res, next) => {
    // authorize middleware is optionally available; perform role check in controller
    next();
}, require('../controllers/courseController').deleteAllCourses);

router.route('/:id')
    .get(getCourseById)
    .put(protect, updateCourse)
    .delete(protect, deleteCourse);

router.post('/:id/enroll', protect, enrollCourse);
router.post('/:id/reviews', protect, reviewCourse);
router.get('/:id/certificate', protect, downloadCertificate);

module.exports = router;