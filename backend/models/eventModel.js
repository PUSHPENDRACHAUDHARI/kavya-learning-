const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Event title is required']
    },
    description: {
        type: String,
        required: false,
        default: ''
    },
    instructor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    instructorName: {
        type: String,
        required: false,
        default: null
    },
    type: {
        type: String,
        enum: ['Live Class', 'Webinar', 'Workshop'],
        default: 'Live Class'
    },
    date: {
        type: Date,
        required: true
    },
    startTime: {
        type: String,
        required: true
    },
    endTime: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    maxStudents: {
        type: Number,
        required: true,
        default: 30
    },
    // current number of students who have actually joined (used for enforcing maxStudents safely)
    joinedCount: {
        type: Number,
        required: false,
        default: 0
    },
    enrolledStudents: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    createdByUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdByRole: {
        type: String,
        enum: ['student', 'parent', 'instructor', 'admin', 'sub-admin'],
    },
    status: {
        type: String,
        enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled'],
        default: 'Scheduled'
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    },
    deletedByRole: {
        type: String,
        enum: ['student', 'parent', 'instructor', 'admin', 'sub-admin'],
        default: null
    },
    meetLink: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

const Event = mongoose.model('Event', eventSchema);
module.exports = Event;