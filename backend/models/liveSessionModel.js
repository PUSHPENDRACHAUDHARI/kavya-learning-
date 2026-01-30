const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    joinedAt: {
        type: Date,
        default: Date.now
    },
    leftAt: {
        type: Date
    },
    isMuted: {
        type: Boolean,
        default: false
    },
    isVideoOff: {
        type: Boolean,
        default: false
    },
    isHandRaised: {
        type: Boolean,
        default: false
    },
    socketId: {
        type: String
    }
}, { _id: true });

const liveSessionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Session title is required']
    },
    description: {
        type: String,
        required: [true, 'Session description is required']
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    instructor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // TEMPORARY: Make optional for testing
    },
    scheduledStartTime: {
        type: Date,
        required: true
    },
    actualStartTime: {
        type: Date
    },
    endTime: {
        type: Date
    },
    status: {
        type: String,
        enum: ['scheduled', 'live', 'ended', 'cancelled'],
        default: 'scheduled'
    },
    participants: [participantSchema],
    maxParticipants: {
        type: Number,
        default: 100
    },
    recordingEnabled: {
        type: Boolean,
        default: false
    },
    recordingUrl: {
        type: String
    },
    meetingLink: {
        type: String,
        unique: true,
        required: true
    },
    settings: {
        allowChat: {
            type: Boolean,
            default: true
        },
        allowScreenShare: {
            type: Boolean,
            default: true
        },
        muteParticipantsOnJoin: {
            type: Boolean,
            default: false
        },
        waitingRoom: {
            type: Boolean,
            default: false
        }
    }
}, {
    timestamps: true
});

// Generate unique meeting link
liveSessionSchema.pre('save', function(next) {
    if (this.isNew && !this.meetingLink) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 12; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        this.meetingLink = result;
    }
    next();
});

// Static method to generate meeting link
liveSessionSchema.statics.generateMeetingLink = function() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// Method to add participant
liveSessionSchema.methods.addParticipant = function(userId, socketId) {
    const existingParticipant = this.participants.find(p => p.user.toString() === userId);
    if (existingParticipant) {
        existingParticipant.socketId = socketId;
        existingParticipant.joinedAt = new Date();
        existingParticipant.leftAt = undefined;
    } else {
        this.participants.push({
            user: userId,
            socketId: socketId,
            joinedAt: new Date()
        });
    }
    return this.save();
};

// Method to remove participant
liveSessionSchema.methods.removeParticipant = function(userId) {
    const participant = this.participants.find(p => p.user.toString() === userId);
    if (participant) {
        participant.leftAt = new Date();
        participant.socketId = undefined;
    }
    return this.save();
};

// Method to get active participants
liveSessionSchema.methods.getActiveParticipants = function() {
    return this.participants.filter(p => !p.leftAt);
};

const LiveSession = mongoose.model('LiveSession', liveSessionSchema);
module.exports = LiveSession;
