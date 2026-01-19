const Assignment = require('../models/assignmentModel');
const Course = require('../models/courseModel');

// @desc    Create an assignment
// @route   POST /api/assignments
// @access  Private (Instructor/Admin)
exports.createAssignment = async (req, res) => {
    try {
        const { courseId, title, description, dueDate, maxScore } = req.body;

        // Verify course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Verify user is the instructor
        if (course.instructor.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to create assignments for this course' });
        }

        const assignment = await Assignment.create({
            course: courseId,
            instructor: req.user._id,
            title,
            description,
            dueDate,
            maxScore: maxScore || 100
        });

        res.status(201).json(assignment);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get all assignments for a course
// @route   GET /api/assignments?courseId=:courseId
// @access  Public
exports.getAssignments = async (req, res) => {
    try {
        const { courseId } = req.query;
        const query = courseId ? { course: courseId } : {};
        const assignments = await Assignment.find(query)
            .populate('course', 'title')
            .populate('instructor', 'fullName email');
        res.json(assignments);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get a single assignment
// @route   GET /api/assignments/:id
// @access  Public
exports.getAssignment = async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id)
            .populate('course')
            .populate('instructor', 'fullName email');
        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }
        res.json(assignment);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update an assignment
// @route   PUT /api/assignments/:id
// @access  Private (Instructor/Admin)
exports.updateAssignment = async (req, res) => {
    try {
        let assignment = await Assignment.findById(req.params.id);
        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        // Check authorization
        if (assignment.instructor.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this assignment' });
        }

        assignment = await Assignment.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        res.json(assignment);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete an assignment
// @route   DELETE /api/assignments/:id
// @access  Private (Instructor/Admin)
exports.deleteAssignment = async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id);
        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        // Check authorization
        if (assignment.instructor.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this assignment' });
        }

        await Assignment.findByIdAndDelete(req.params.id);
        res.json({ message: 'Assignment deleted' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
