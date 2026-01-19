const mongoose = require('mongoose');

const institutionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Institution name is required'],
        unique: true
    },
    type: {
        type: String,
        enum: ['school', 'college', 'university', 'coaching_center', 'corporate'],
        required: true
    },
    address: {
        street: String,
        city: String,
        state: String,
        country: String,
        zipCode: String
    },
    contactEmail: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    website: String,
    logo: String,
    theme: {
        primaryColor: String,
        secondaryColor: String
    },
    subscription: {
        plan: {
            type: String,
            enum: ['basic', 'premium', 'enterprise'],
            default: 'basic'
        },
        startDate: Date,
        endDate: Date,
        status: {
            type: String,
            enum: ['active', 'expired', 'cancelled'],
            default: 'active'
        }
    },
    features: {
        aiTutor: {
            type: Boolean,
            default: false
        },
        analytics: {
            type: Boolean,
            default: true
        },
        liveClasses: {
            type: Boolean,
            default: false
        },
        customization: {
            type: Boolean,
            default: false
        }
    },
    admins: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

const Institution = mongoose.model('Institution', institutionSchema);
module.exports = Institution;