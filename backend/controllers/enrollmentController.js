const Enrollment = require('../models/enrollmentModel');
const Payment = require('../models/paymentModel');
const Course = require('../models/courseModel');
const User = require('../models/userModel');

// @desc    Create a pending enrollment (before payment)
// @route   POST /api/enrollments/create
// @access  Private (Student)
exports.createEnrollment = async (req, res) => {
    try {
        const { courseId } = req.body;
        
        console.log('📝 Creating enrollment for courseId:', courseId);
        
        if (!courseId) {
            return res.status(400).json({ message: 'Course ID is required' });
        }

        // Check if courseId is a valid MongoDB ObjectId
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            console.warn('⚠️ Invalid courseId format:', courseId);
            return res.status(400).json({ 
                message: 'Invalid course ID format. Please select a valid course from the backend.',
                invalidCourseId: courseId
            });
        }

        // Verify course exists
        const course = await Course.findById(courseId);
        if (!course) {
            console.warn('⚠️ Course not found:', courseId);
            return res.status(404).json({ message: 'Course not found' });
        }
        
        console.log('✅ Course found:', course.title);

        // Check if user already enrolled (active or pending)
        const existingEnrollment = await Enrollment.findOne({
            studentId: req.user._id,
            courseId: courseId,
            enrollmentStatus: { $in: ['pending', 'active', 'completed'] }
        });

        if (existingEnrollment) {
            return res.status(409).json({ 
                message: 'You have already enrolled in this course',
                enrollmentId: existingEnrollment._id,
                alreadyEnrolled: true,
                enrollmentStatus: existingEnrollment.enrollmentStatus,
                isFree: existingEnrollment.isFree === true,
                purchaseStatus: existingEnrollment.purchaseStatus || null
            });
        }

        // Create pending enrollment
        const enrollment = await Enrollment.create({
            studentId: req.user._id,
            courseId: courseId,
            enrollmentStatus: 'pending'
        });

        res.status(201).json({
            message: 'Enrollment created, proceed to payment',
            enrollmentId: enrollment._id
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Activate enrollment after successful payment
// @route   POST /api/enrollments/activate/:enrollmentId
// @access  Private (Student)
exports.activateEnrollment = async (req, res) => {
    try {
        const { enrollmentId } = req.params;
        const { paymentId } = req.body;

        if (!paymentId) {
            return res.status(400).json({ message: 'Payment ID is required' });
        }

        // Verify enrollment exists
        const enrollment = await Enrollment.findById(enrollmentId);
        if (!enrollment) {
            return res.status(404).json({ message: 'Enrollment not found' });
        }

        // Verify it belongs to current user
        if (enrollment.studentId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to activate this enrollment' });
        }

        // Verify payment exists and is completed
        const payment = await Payment.findById(paymentId);
        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        if (payment.status !== 'completed') {
            return res.status(400).json({ message: 'Payment not completed' });
        }

        // Verify payment belongs to current user
        if (payment.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Payment does not belong to current user' });
        }

        // Verify payment is for the same course
        if (payment.course.toString() !== enrollment.courseId.toString()) {
            return res.status(400).json({ message: 'Payment course does not match enrollment course' });
        }

        // Update enrollment status to active
        enrollment.enrollmentStatus = 'active';
        enrollment.paymentId = paymentId;
        // Mark as paid and ensure isFree is false
        enrollment.purchaseStatus = 'paid';
        enrollment.isFree = false;
        enrollment.enrolledAt = new Date();
        await enrollment.save();

        // Add to user's enrolledCourses if not already there
        const user = await User.findById(req.user._id);
        const courseEnrolled = user.enrolledCourses.find(ec => ec.course.toString() === enrollment.courseId.toString());
        
        if (!courseEnrolled) {
            user.enrolledCourses.push({
                course: enrollment.courseId,
                completedLessons: [],
                hoursSpent: 0,
                completionPercentage: 0
            });
            await user.save();
        }

        // Add student to course's enrolledStudents array if not already there
        const course = await Course.findById(enrollment.courseId);
        if (!course.enrolledStudents.includes(req.user._id)) {
            course.enrolledStudents.push(req.user._id);
            await course.save();
        }

        res.json({
            message: 'Enrollment activated successfully',
            enrollment: enrollment
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get enrollment status for a course
// @route   GET /api/enrollments/course/:courseId
// @access  Private (Student)
exports.getEnrollmentStatus = async (req, res) => {
    try {
        const { courseId } = req.params;

        const enrollment = await Enrollment.findOne({
            studentId: req.user._id,
            courseId: courseId
        });

        if (!enrollment) {
            return res.json({ 
                enrolled: false,
                status: null,
                isFree: false,
                purchaseStatus: null,
                isLocked: true
            });
        }

        // Determine if enrollment should be treated as unlocked
        const isFree = enrollment.isFree === true || (enrollment.purchaseStatus && String(enrollment.purchaseStatus).toLowerCase() === 'free');
        const purchaseStatus = enrollment.purchaseStatus || null;
        const isActive = enrollment.enrollmentStatus === 'active';
        const hasPayment = !!enrollment.paymentId;

        const enrolledFlag = isActive || isFree || hasPayment || (purchaseStatus && String(purchaseStatus).toLowerCase() === 'paid');

        const isLocked = !(enrolledFlag || (purchaseStatus && String(purchaseStatus).toLowerCase() === 'paid'));

        res.json({
            enrolled: enrolledFlag,
            status: enrollment.enrollmentStatus,
            enrollmentId: enrollment._id,
            progressPercentage: enrollment.progressPercentage,
            completed: enrollment.completed,
            isFree,
            purchaseStatus,
            isLocked
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get user's all enrollments
// @route   GET /api/enrollments
// @access  Private (Student)
exports.getUserEnrollments = async (req, res) => {
    try {
        const enrollments = await Enrollment.find({ studentId: req.user._id })
            .populate('courseId', 'title thumbnail price')
            .populate('paymentId', 'status transactionId amount');

        res.json(enrollments);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update enrollment progress
// @route   PUT /api/enrollments/:enrollmentId
// @access  Private (Student)
exports.updateEnrollment = async (req, res) => {
    try {
        const { enrollmentId } = req.params;
        const { progressPercentage, watchHours, completed } = req.body;

        const enrollment = await Enrollment.findById(enrollmentId);
        if (!enrollment) {
            return res.status(404).json({ message: 'Enrollment not found' });
        }

        if (enrollment.studentId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this enrollment' });
        }

        if (progressPercentage !== undefined) enrollment.progressPercentage = progressPercentage;
        if (watchHours !== undefined) enrollment.watchHours = watchHours;
        if (completed !== undefined) {
            enrollment.completed = completed;
            if (completed) enrollment.enrollmentStatus = 'completed';
        }
        enrollment.lastAccessed = new Date();

        await enrollment.save();

        res.json(enrollment);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Unenroll user from all courses
// @route   POST /api/enrollments/unenroll-all
// @access  Private (Student)
exports.unenrollAll = async (req, res) => {
    try {
        const userId = req.user._id;
        const Enrollment = require('../models/enrollmentModel');
        const Course = require('../models/courseModel');
        const User = require('../models/userModel');

        // Find user's enrollments
        const enrollments = await Enrollment.find({ studentId: userId });

        // Remove user from each course's enrolledStudents
        const courseIds = enrollments.map(e => e.courseId);
        await Course.updateMany({ _id: { $in: courseIds } }, { $pull: { enrolledStudents: userId } });

        // Delete enrollments
        await Enrollment.deleteMany({ studentId: userId });

        // Clear enrolledCourses in user document
        await User.findByIdAndUpdate(userId, { $set: { enrolledCourses: [] } });

        res.json({ message: 'Unenrolled from all courses' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
