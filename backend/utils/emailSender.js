// SendGrid-based email sender. Replaces Nodemailer to avoid SMTP in production.
const sgMail = require('@sendgrid/mail');

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM = process.env.SENDGRID_FROM_EMAIL;
const SENDGRID_OTP_TEMPLATE = process.env.SENDGRID_OTP_TEMPLATE_ID; // optional

if (!SENDGRID_API_KEY) {
    console.warn('SENDGRID_API_KEY not set. Emails will be logged to console.');
} else {
    sgMail.setApiKey(SENDGRID_API_KEY);
}

async function sendOtpEmail(to, otp) {
    const from = SENDGRID_FROM || 'no-reply@example.com';

    const msg = {
        to,
        from,
        subject: 'Your verification code',
        text: `Your verification code is ${otp}. It is valid for 5 minutes.`,
        html: `<p>Your verification code is <strong>${otp}</strong>. It is valid for 5 minutes.</p>`,
    };

    // If template is configured, prefer dynamic template with otp as dynamic data
    if (SENDGRID_OTP_TEMPLATE) {
        msg.templateId = SENDGRID_OTP_TEMPLATE;
        msg.dynamic_template_data = { otp };
        // remove plain text/html when using template
        delete msg.text;
        delete msg.html;
    }

    if (!SENDGRID_API_KEY) {
        // Dev fallback: log OTP so developer can use it
        console.warn('[SendGrid] API key missing. OTP for', to, ':', otp);
        return Promise.resolve({ logged: true });
    }

    try {
        const res = await sgMail.send(msg);
        return res;
    } catch (err) {
        // Provide useful logging while not leaking internals to callers
        console.error('[SendGrid] Failed to send email:', (err && err.response && err.response.body) || err.message || err);
        throw new Error('Failed to send OTP email');
    }
}

module.exports = { sendOtpEmail };
