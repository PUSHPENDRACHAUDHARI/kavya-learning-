// Email sender using Nodemailer. Falls back to console log when not configured.
const nodemailer = require('nodemailer');

// Create transporter from env vars; if missing, transporter will be null
function createTransporter() {
    const host = process.env.EMAIL_HOST;
    const port = process.env.EMAIL_PORT;
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    const allowSelfSigned = String(process.env.EMAIL_ALLOW_SELF_SIGNED || '').toLowerCase() === 'true';

    if (!host || !port || !user || !pass) {
        return null;
    }

    const transportOptions = {
        host,
        port: Number(port),
        secure: Number(port) === 465, // true for 465, false for other ports
        auth: {
            user,
            pass,
        },
    };

    // Optionally allow self-signed certificates (useful for dev or internal SMTP with self-signed certs)
    if (allowSelfSigned) {
        transportOptions.tls = { rejectUnauthorized: false };
    }

    return nodemailer.createTransport(transportOptions);
}

async function sendOtpEmail(to, otp) {
    const transporter = createTransporter();
    const from = process.env.FROM_EMAIL || process.env.EMAIL_USER || 'no-reply@example.com';
    const subject = 'Your verification code';
    const text = `Your verification code is ${otp}. It is valid for 5 minutes.`;
    const html = `<p>Your verification code is <strong>${otp}</strong>. It is valid for 5 minutes.</p>`;

    if (!transporter) {
        // In development, print to console so it's easy to copy
        console.warn('Email transporter not configured. OTP:', otp);
        return Promise.resolve();
    }

    try {
        const info = await transporter.sendMail({
            from,
            to,
            subject,
            text,
            html,
        });
        return info;
    } catch (err) {
        // Surface the error so caller can log; do not swallow
        throw err;
    }
}

module.exports = { sendOtpEmail };
