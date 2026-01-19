const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['Course Completion', 'Assessment Score', 'Participation', 'Special'],
        required: true
    },
    points: {
        type: Number,
        default: 0
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    },
    icon: {
        type: String,
        default: 'default-achievement.png'
    },
    dateEarned: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

const Achievement = mongoose.model('Achievement', achievementSchema);
module.exports = Achievement;