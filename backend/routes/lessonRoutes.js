const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    createLesson,
    getLessons,
    getLesson,
    updateLesson,
    deleteLesson
} = require('../controllers/lessonController');

// All lesson routes
router.route('/')
    .post(protect, authorize('instructor', 'admin'), createLesson)
    .get(protect, getLessons);

router.route('/:id')
    .get(protect, getLesson)
    .put(protect, authorize('instructor', 'admin'), updateLesson)
    .delete(protect, authorize('instructor', 'admin'), deleteLesson);

module.exports = router;
