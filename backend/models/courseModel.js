const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Course title is required']
    },
    description: {
        type: String,
        required: [true, 'Course description is required']
    },
    instructor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    institution: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Institution'
    },
    thumbnail: {
        type: String,
        default: ''
    },
    lessons: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson'
    }],
    enrolledStudents: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    price: {
        type: Number,
        required: true,
        validate: {
            validator: function(v) {
                return v >= 0;
            },
            message: 'Price must be greater than or equal to 0'
        }
    },
    duration: {
        type: Number,
        required: true,
        validate: {
            validator: function(v) {
                return v >= 0;
            },
            message: 'Duration must be greater than or equal to 0'
        },
        description: 'Course duration in hours'
    },
    level: {
        type: String,
        enum: ['Beginner', 'Intermediate', 'Advanced'],
        default: 'Beginner'
    },
    category: {
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                return /^[^@#$%!]*$/.test(v);
            },
            message: props => `${props.value} contains special characters!`
        }
    },
    resourceUrl: {
        type: String,
        default: ''
    },
    resourceName: {
        type: String,
        default: ''
    },
    pdfResource: {
        type: String,
        default: ''
    },
    pdfResourceName: {
        type: String,
        default: ''
    },
    rating: {
        type: Number,
        default: 0
    },
    reviews: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        rating: Number,
        comment: String,
        date: {
            type: Date,
            default: Date.now
        }
    }],
    isPublished: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

const Course = mongoose.model('Course', courseSchema);
module.exports = Course;