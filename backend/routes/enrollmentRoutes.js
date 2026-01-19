const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    createEnrollment,
    activateEnrollment,
    getEnrollmentStatus,
    getUserEnrollments,
    updateEnrollment,
    unenrollAll
} = require('../controllers/enrollmentController');

// All enrollment routes require authentication
router.use(protect);

// Get user's enrollments
router.get('/', getUserEnrollments);

// Unenroll from all courses (current user)
router.post('/unenroll-all', unenrollAll);

// Create pending enrollment (before payment)
router.post('/create', createEnrollment);

// Get enrollment status for a specific course
router.get('/course/:courseId', getEnrollmentStatus);

// Activate enrollment after payment
router.post('/activate/:enrollmentId', activateEnrollment);

// Update enrollment (progress, hours, etc)
router.put('/:enrollmentId', updateEnrollment);

module.exports = router;
