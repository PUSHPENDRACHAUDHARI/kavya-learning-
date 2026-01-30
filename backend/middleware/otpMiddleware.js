const Otp = require('../models/otpModel');

// Middleware to require that an email was verified via OTP before proceeding
module.exports = async (req, res, next) => {
    try {
        const email = req.body && req.body.email;
        if (!email) return res.status(400).json({ message: 'Email is required for registration' });

        const normalized = email.toLowerCase();
        const record = await Otp.findOne({ email: normalized, verified: true });
        if (!record) {
            return res.status(400).json({ message: 'Email not verified. Please verify OTP before registering.' });
        }

        // consume verification so OTP cannot be reused
        await Otp.deleteOne({ email: normalized });
        return next();
    } catch (e) {
        console.error('OTP middleware error', e && e.stack ? e.stack : e);
        return res.status(500).json({ message: 'OTP verification middleware error' });
    }
};
