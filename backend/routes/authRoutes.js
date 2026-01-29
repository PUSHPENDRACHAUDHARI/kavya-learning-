const express = require('express');
const {
    registerUser,
    loginUser,
    getUserProfile,
    updateUserProfile,
    forgotPassword,
    resetPassword,
} = require('../controllers/authController');
const { sendOtp, verifyOtp } = require('../controllers/otpController');
const requireOtpVerified = require('../middleware/otpMiddleware');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Require OTP verification before allowing registration to proceed
router.post('/register', requireOtpVerified, registerUser);
// OTP endpoints for pre-registration verification
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
// Forgot/reset password routes removed
router.route('/profile')
    .get(protect, getUserProfile)
    .put(protect, updateUserProfile);

module.exports = router;