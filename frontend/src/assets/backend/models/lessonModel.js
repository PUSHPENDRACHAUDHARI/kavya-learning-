const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Lesson title is required']
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    description: {
        type: String,
        required: [true, 'Lesson description is required']
    },
    content: {
        type: String,
        required: true
    },
    videoUrl: {
        type: String
    },
    duration: {
        type: Number,
        required: true
    },
    resources: [{
        title: String,
        fileUrl: String,
        type: String // pdf, doc, etc.
    }],
    quiz: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz'
    },
    order: {
        type: Number,
        required: true
    },
    isPublished: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

const Lesson = mongoose.model('Lesson', lessonSchema);
module.exports = Lesson;