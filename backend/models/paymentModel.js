const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // institution is optional for local/dev/mock payments. When integrating with
    // real payment providers and multi-tenant setups, this can be populated.
    institution: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Institution'
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        required: true,
        default: 'INR'
    },
    // Default to course_purchase for course payments; not required to allow
    // simplified creation of mock payments in tests/dev flows.
    type: {
        type: String,
        enum: ['course_purchase', 'subscription'],
        default: 'course_purchase'
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        required: true
    },
    transactionId: {
        type: String,
        unique: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    },
    subscription: {
        plan: String,
        duration: Number,
        startDate: Date,
        endDate: Date
    },
    invoice: {
        number: String,
        url: String
    }
}, {
    timestamps: true
});

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;