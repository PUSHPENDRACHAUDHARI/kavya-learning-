const Payment = require('../models/paymentModel');
const User = require('../models/userModel');
const Course = require('../models/courseModel');

// @desc    Create a payment
// @route   POST /api/payments
// @access  Private (Student)
exports.createPayment = async (req, res) => {
    try {
        const { courseId, amount, paymentMethod, transactionId } = req.body;

        // Verify course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        const payment = await Payment.create({
            user: req.user._id,
            course: courseId,
            amount: amount || course.price,
            paymentMethod,
            transactionId,
            status: 'completed'
        });

        // Add student to course enrolled list
        if (!course.enrolledStudents.includes(req.user._id)) {
            course.enrolledStudents.push(req.user._id);
            await course.save();
        }

        res.status(201).json(payment);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get all payments for a user
// @route   GET /api/payments
// @access  Private
exports.getPayments = async (req, res) => {
    try {
        const payments = await Payment.find({ user: req.user._id })
            .populate('course', 'title price')
            .populate('user', 'fullName email');
        res.json(payments);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get a single payment
// @route   GET /api/payments/:id
// @access  Private
exports.getPayment = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id)
            .populate('course')
            .populate('user', 'fullName email');
        
        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        // Check authorization
        if (payment.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to view this payment' });
        }

        res.json(payment);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get instructor revenue
// @route   GET /api/payments/instructor/revenue
// @access  Private (Instructor)
exports.getInstructorRevenue = async (req, res) => {
    try {
        const courses = await Course.find({ instructor: req.user._id }).select('_id');
        const courseIds = courses.map(c => c._id);

        const payments = await Payment.find({ course: { $in: courseIds } });
        
        let totalRevenue = 0;
        payments.forEach(p => totalRevenue += p.amount);

        res.json({
            totalRevenue,
            totalPayments: payments.length,
            paymentDetails: payments
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update payment status
// @route   PUT /api/payments/:id
// @access  Private (Admin)
exports.updatePayment = async (req, res) => {
    try {
        let payment = await Payment.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }
        res.json(payment);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
