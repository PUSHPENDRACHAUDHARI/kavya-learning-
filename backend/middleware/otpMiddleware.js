const otpStore = require('../utils/otpStore');

// Middleware to require that an email was verified via OTP before proceeding
module.exports = (req, res, next) => {
    try {
        const email = req.body && req.body.email;
        if (!email) return res.status(400).json({ message: 'Email is required for registration' });

        if (!otpStore.isVerified(email)) {
            return res.status(400).json({ message: 'Email not verified. Please verify OTP before registering.' });
        }

        // Optionally clear the verification so the OTP cannot be reused
        otpStore.clear(email);
        return next();
    } catch (e) {
        return res.status(500).json({ message: 'OTP verification middleware error' });
    }
};
