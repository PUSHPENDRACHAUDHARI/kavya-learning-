const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    createPayment,
    getPayments,
    getPayment,
    getInstructorRevenue,
    updatePayment
} = require('../controllers/paymentController');

// All payment routes
router.route('/')
    .post(protect, createPayment)
    .get(protect, getPayments);

router.get('/instructor/revenue', protect, authorize('instructor', 'admin'), getInstructorRevenue);

router.route('/:id')
    .get(protect, getPayment)
    .put(protect, authorize('admin'), updatePayment);

module.exports = router;
