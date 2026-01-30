const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Otp = require('../models/otpModel');
const emailSender = require('../utils/emailSender');

// POST /api/auth/send-otp
// Body: { email }
// Generates a 6-digit OTP, stores hashed OTP in MongoDB with 5 minute expiry, and sends it via SendGrid
exports.sendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required' });

        const normalized = email.toLowerCase();

        // generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // hash OTP before storing
        const salt = await bcrypt.genSalt(10);
        const otpHash = await bcrypt.hash(otp, salt);

        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // upsert OTP document for this email
        await Otp.findOneAndUpdate(
            { email: normalized },
            { otpHash, expiresAt, verified: false, createdAt: new Date() },
            { upsert: true, new: true }
        );

        // send via SendGrid
        try {
            await emailSender.sendOtpEmail(normalized, otp);
        } catch (err) {
            console.error('Failed to send OTP via SendGrid', err && err.message ? err.message : err);
            return res.status(500).json({ message: 'Failed to send OTP email' });
        }

        return res.json({ message: 'OTP sent' });
    } catch (err) {
        console.error('sendOtp error', err && err.stack ? err.stack : err);
        return res.status(500).json({ message: 'Failed to generate OTP' });
    }
};

// POST /api/auth/verify-otp
// Body: { email, otp }
// Verifies OTP against stored hash; if valid marks verified and keeps record until TTL
exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ message: 'Email and otp are required' });

        const normalized = email.toLowerCase();
        const record = await Otp.findOne({ email: normalized });
        if (!record) return res.status(400).json({ message: 'No OTP requested for this email' });

        if (record.expiresAt && record.expiresAt < new Date()) {
            // allow TTL cleanup to remove it soon
            await Otp.deleteOne({ email: normalized });
            return res.status(400).json({ message: 'OTP expired' });
        }

        const match = await bcrypt.compare(String(otp), record.otpHash);
        if (!match) return res.status(400).json({ message: 'Invalid OTP' });

        // mark as verified; keep record for TTL window so middleware can consume it
        record.verified = true;
        await record.save();

        return res.json({ message: 'OTP verified' });
    } catch (err) {
        console.error('verifyOtp error', err && err.stack ? err.stack : err);
        return res.status(500).json({ message: 'Failed to verify OTP' });
    }
};
