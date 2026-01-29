const otpStore = require('../utils/otpStore');
const emailSender = require('../utils/emailSender');

// POST /api/auth/send-otp
// Body: { email }
// Generates a 6-digit OTP, sends it to the email and stores it in-memory for 5 minutes
exports.sendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required' });

        console.log('➡️ send-otp request for email:', email);
        console.log('➡️ Email env:', {
            EMAIL_HOST: !!process.env.EMAIL_HOST,
            EMAIL_PORT: !!process.env.EMAIL_PORT,
            EMAIL_USER: !!process.env.EMAIL_USER,
            EMAIL_PASS: !!process.env.EMAIL_PASS,
            FROM_EMAIL: !!process.env.FROM_EMAIL,
        });

        const otp = otpStore.generateOtp();
        // Store for 5 minutes
        otpStore.storeOtp(email, otp, 5 * 60 * 1000);

        // Send email (may be a no-op in dev if transporter not configured)
        try {
            await emailSender.sendOtpEmail(email, otp);
        } catch (e) {
            console.error('❌ Failed to send OTP email:', e && e.stack ? e.stack : e);
            // Do not reveal email failures to the client in detail
            return res.status(500).json({ message: 'Failed to send OTP email' });
        }

        return res.json({ message: 'OTP sent' });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

// POST /api/auth/verify-otp
// Body: { email, otp }
// Verifies otp and marks the email as verified in the in-memory store
exports.verifyOtp = (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ message: 'Email and otp are required' });

        const result = otpStore.verifyOtp(email, otp);
        if (!result.success) return res.status(400).json({ message: result.message });

        return res.json({ message: 'OTP verified' });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};
