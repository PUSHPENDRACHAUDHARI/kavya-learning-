const Course = require('../models/courseModel');
const Lesson = require('../models/lessonModel');
const User = require('../models/userModel');
const Achievement = require('../models/achievementModel');

// ==================== COURSES ====================

// @desc    Get all courses for instructor
// @route   GET /api/instructor/courses
// @access  Private/Instructor
exports.getInstructorCourses = async (req, res) => {
  try {
    const courses = await Course.find({ instructor: req.user._id })
      .populate('instructor', 'fullName email')
      .populate('lessons')
      .populate('enrolledStudents', 'fullName email');

    res.json({
      success: true,
      count: courses.length,
      data: courses
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single course with lessons
// @route   GET /api/instructor/courses/:id
// @access  Private/Instructor
exports.getInstructorCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructor', 'fullName email')
      .populate({
        path: 'lessons',
        populate: { path: 'quiz' }
      })
      .populate('enrolledStudents', 'fullName email');

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Only instructor can view their course
    if (course.instructor._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({ success: true, data: course });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new course
// @route   POST /api/instructor/courses
// @access  Private/Instructor
exports.createCourse = async (req, res) => {
  try {
    const { title, description, category, level, price, duration, thumbnail } = req.body;

    const course = await Course.create({
      title,
      description,
      category,
      level,
      price,
      duration,
      thumbnail,
      instructor: req.user._id,
      isPublished: false
    });

    const populatedCourse = await course.populate('instructor', 'fullName email');

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: populatedCourse
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update course
// @route   PUT /api/instructor/courses/:id
// @access  Private/Instructor
exports.updateCourse = async (req, res) => {
  try {
    let course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Check authorization
    if (course.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this course' });
    }

    course = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('instructor', 'fullName email');

    res.json({
      success: true,
      message: 'Course updated successfully',
      data: course
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete course
// @route   DELETE /api/instructor/courses/:id
// @access  Private/Instructor
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Check authorization
    if (course.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this course' });
    }

    // Delete all lessons in the course
    await Lesson.deleteMany({ course: req.params.id });

    // Delete the course
    await Course.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== LESSONS ====================

// @desc    Get all lessons for a course
// @route   GET /api/instructor/courses/:courseId/lessons
// @access  Private/Instructor
exports.getCourseLessons = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Verify instructor
    if (course.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const lessons = await Lesson.find({ course: req.params.courseId })
      .populate('quiz')
      .sort('order');

    res.json({
      success: true,
      count: lessons.length,
      data: lessons
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create lesson
// @route   POST /api/instructor/courses/:courseId/lessons
// @access  Private/Instructor
exports.createLesson = async (req, res) => {
  try {
    const { title, description, content, videoUrl, duration, resources, quiz, order } = req.body;

    const course = await Course.findById(req.params.courseId);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Verify instructor
    if (course.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Ensure numeric duration (accept '45' or '45 min') and set default order if not provided
    let durationNum = 0;
    if (duration !== undefined && duration !== null && String(duration).trim() !== '') {
      const parsed = Number(duration);
      if (Number.isFinite(parsed)) durationNum = parsed; else {
        const match = String(duration).match(/(\d+(?:\.\d+)?)/);
        durationNum = match ? Number(match[1]) : 0;
      }
    }
    let assignedOrder = order;

    // Treat empty string as missing
    if (assignedOrder === undefined || assignedOrder === null || assignedOrder === '') {
      const last = await Lesson.findOne({ course: req.params.courseId }).sort('-order');
      assignedOrder = last && last.order != null ? last.order + 1 : 1;
    }
    // Coerce to a safe integer and fallback to last+1 if invalid
    assignedOrder = Math.floor(Number(assignedOrder));
    if (!Number.isFinite(assignedOrder) || Number.isNaN(assignedOrder)) {
      const last = await Lesson.findOne({ course: req.params.courseId }).sort('-order');
      assignedOrder = last && last.order != null && Number.isFinite(Number(last.order)) ? Math.floor(Number(last.order)) + 1 : 1;
    }

    // Normalize resources: if a string provided, convert to a simple array
    let resourcesArr = Array.isArray(resources) ? resources : [];
    if (typeof resources === 'string' && resources.trim()) {
      resourcesArr = [{ fileUrl: resources.trim() }];
    }

    // Create lesson and ensure atomicity: if adding to course fails, remove lesson
    const lesson = await Lesson.create({
      title,
      description,
      content,
      videoUrl,
      duration: durationNum,
      resources: resourcesArr,
      quiz,
      order: assignedOrder,
      course: req.params.courseId,
      isPublished: false
    });

    // Add lesson to course (guarded)
    try {
      course.lessons.push(lesson._id);
      await course.save();
    } catch (err) {
      // rollback lesson if we couldn't attach it
      await Lesson.findByIdAndDelete(lesson._id).catch(() => {});
      return res.status(500).json({ success: false, message: 'Failed to attach lesson to course' });
    }

    const populatedLesson = await lesson.populate('quiz');

    res.status(201).json({
      success: true,
      message: 'Lesson created successfully',
      data: populatedLesson
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update lesson
// @route   PUT /api/instructor/lessons/:id
// @access  Private/Instructor
exports.updateLesson = async (req, res) => {
  try {
    let lesson = await Lesson.findById(req.params.id);

    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found' });
    }

    const course = await Course.findById(lesson.course);

    // Verify instructor
    if (course.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Build update fields and coerce numeric types
    const { title, description, content, videoUrl, duration, resources, quiz, order } = req.body;
    const updateFields = { title, description, content, videoUrl, resources, quiz };
    if (duration !== undefined && duration !== null && String(duration).trim() !== '') {
      const d = Number(duration);
      updateFields.duration = Number.isFinite(d) ? d : 0;
    }
    if (order !== undefined && order !== null && String(order).trim() !== '') {
      const o = Number(order);
      if (!Number.isFinite(o)) return res.status(400).json({ success: false, message: 'Invalid order value' });
      updateFields.order = o;
    }

    lesson = await Lesson.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
      runValidators: true
    }).populate('quiz');
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete lesson
// @route   DELETE /api/instructor/lessons/:id
// @access  Private/Instructor
exports.deleteLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);

    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found' });
    }

    const course = await Course.findById(lesson.course);
    // Remove from course
    course.lessons = course.lessons.filter(l => l.toString() !== req.params.id);
    await course.save();

    // Delete lesson
    await Lesson.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Lesson deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== STUDENTS & DATA ====================

// @desc    Get all students enrolled in instructor's courses
// @route   GET /api/instructor/students
// @access  Private/Instructor
exports.getInstructorStudents = async (req, res) => {
  try {
    // Get all courses by this instructor
    const courses = await Course.find({ instructor: req.user._id })
      .populate('enrolledStudents', 'fullName email');

    // Extract unique students
    const studentSet = new Set();
    const students = [];

    courses.forEach(course => {
      course.enrolledStudents?.forEach(student => {
        if (!studentSet.has(student._id.toString())) {
          studentSet.add(student._id.toString());
          students.push({
            ...student.toObject(),
            enrolledInCourseCount: courses.filter(c => 
              c.enrolledStudents.some(s => s._id.toString() === student._id.toString())
            ).length
          });
        }
      });
    });

    res.json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get student profile with detailed data
// @route   GET /api/instructor/students/:studentId
// @access  Private/Instructor
exports.getStudentProfile = async (req, res) => {
  try {
    const student = await User.findById(req.params.studentId)
      .populate({
        path: 'enrolledCourses.course',
        populate: { path: 'instructor', select: 'fullName' }
      })
      .populate('achievements');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Verify instructor can access this student
    const instructorCourses = await Course.find({ instructor: req.user._id });
    const hasAccess = student.enrolledCourses.some(ec => 
      instructorCourses.some(ic => ic._id.toString() === ec.course._id.toString())
    );

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this student' });
    }

    // Calculate stats
    const totalCoursesEnrolled = student.enrolledCourses.length;
    const completedCourses = student.enrolledCourses.filter(c => c.completionPercentage === 100).length;
    const averageProgress = student.enrolledCourses.length 
      ? Math.round(student.enrolledCourses.reduce((sum, c) => sum + c.completionPercentage, 0) / student.enrolledCourses.length)
      : 0;

    res.json({
      success: true,
      data: {
        _id: student._id,
        fullName: student.fullName,
        email: student.email,
        phone: student.phone,
        status: student.status,
        avatar: student.avatar,
        enrollmentDate: student.createdAt,
        totalHoursLearned: student.totalHoursLearned || 0,
        streakDays: student.streakDays || 0,
        enrolledCourses: student.enrolledCourses,
        achievements: student.achievements,
        stats: {
          totalCoursesEnrolled,
          completedCourses,
          averageProgress,
          totalAchievements: student.achievements?.length || 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update student status
// @route   PUT /api/instructor/students/:studentId
// @access  Private/Instructor
exports.updateStudentStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const student = await User.findById(req.params.studentId);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Verify instructor can access this student
    const instructorCourses = await Course.find({ instructor: req.user._id });
    const hasAccess = student.enrolledCourses.some(ec => 
      instructorCourses.some(ic => ic._id.toString() === ec.course.toString())
    );

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    student.status = status || student.status;
    await student.save();

    res.json({
      success: true,
      message: 'Student status updated successfully',
      data: student
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get student's course progress
// @route   GET /api/instructor/students/:studentId/progress/:courseId
// @access  Private/Instructor
exports.getStudentCourseProgress = async (req, res) => {
  try {
    const { studentId, courseId } = req.params;

    const student = await User.findById(studentId)
      .populate({
        path: 'enrolledCourses.course',
        populate: { path: 'lessons' }
      });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const courseEnrollment = student.enrolledCourses.find(ec => 
      ec.course._id.toString() === courseId
    );

    if (!courseEnrollment) {
      return res.status(404).json({ success: false, message: 'Student not enrolled in this course' });
    }

    // Verify instructor
    const course = await Course.findById(courseId);
    if (course.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({
      success: true,
      data: {
        studentId,
        courseId,
        courseName: courseEnrollment.course.title,
        completedLessons: courseEnrollment.completedLessons.length,
        totalLessons: courseEnrollment.course.lessons.length,
        completionPercentage: courseEnrollment.completionPercentage,
        hoursSpent: courseEnrollment.hoursSpent,
        enrollmentDate: courseEnrollment.enrollmentDate
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
