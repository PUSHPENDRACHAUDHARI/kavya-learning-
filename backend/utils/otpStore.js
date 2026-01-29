// In-memory OTP store
// Stores entries: { otp, expiresAt, verified }
const otpMap = new Map();

// Generate a 6-digit OTP string
function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Store OTP for an email with expiry (ms)
function storeOtp(email, otp, ttl = 5 * 60 * 1000) {
    const key = email.toLowerCase();
    const expiresAt = Date.now() + ttl;
    otpMap.set(key, { otp, expiresAt, verified: false });
}

// Verify provided otp for an email
function verifyOtp(email, otp) {
    const key = email.toLowerCase();
    const entry = otpMap.get(key);
    if (!entry) return { success: false, message: 'No OTP requested for this email' };
    if (Date.now() > entry.expiresAt) {
        otpMap.delete(key);
        return { success: false, message: 'OTP expired' };
    }
    if (entry.otp !== String(otp)) return { success: false, message: 'Invalid OTP' };
    entry.verified = true;
    otpMap.set(key, entry);
    return { success: true };
}

function isVerified(email) {
    const key = email.toLowerCase();
    const entry = otpMap.get(key);
    return entry && entry.verified === true;
}

function clear(email) {
    otpMap.delete(email.toLowerCase());
}

// Periodic cleanup of expired entries
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of otpMap.entries()) {
        if (entry.expiresAt < now) otpMap.delete(key);
    }
}, 60 * 1000);

module.exports = { generateOtp, storeOtp, verifyOtp, isVerified, clear };
