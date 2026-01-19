const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    createAssignment,
    getAssignments,
    getAssignment,
    updateAssignment,
    deleteAssignment
} = require('../controllers/assignmentController');

// All assignment routes
router.route('/')
    .post(protect, authorize('instructor', 'admin'), createAssignment)
    .get(protect, getAssignments);

router.route('/:id')
    .get(protect, getAssignment)
    .put(protect, authorize('instructor', 'admin'), updateAssignment)
    .delete(protect, authorize('instructor', 'admin'), deleteAssignment);

module.exports = router;
