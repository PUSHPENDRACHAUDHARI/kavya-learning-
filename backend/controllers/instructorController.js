const Course = require('../models/courseModel');
const Lesson = require('../models/lessonModel');
const User = require('../models/userModel');
const Achievement = require('../models/achievementModel');

// Parse duration-like inputs into a numeric value. Accepts numbers or strings like "3 weeks" or "45 hrs".
// Returns first numeric token found as a Number, or 0 when not parseable.
const parseDurationValue = (v) => {
  if (v === undefined || v === null) return 0;
  if (typeof v === 'number') return v;
  const s = String(v).trim();
  if (s === '') return 0;
  const m = s.match(/(\d+(?:\.\d+)?)/);
  if (!m) return 0;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : 0;
};

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
    const { title, description, category, level, price, duration: rawDuration, thumbnail } = req.body;
    const duration = parseDurationValue(rawDuration);

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
    let resourcesArr;
    if (Array.isArray(resources) && resources.length > 0) {
      resourcesArr = resources;
    } else if (typeof resources === 'string' && resources.trim()) {
      resourcesArr = [{ fileUrl: resources.trim() }];
    }

    // Build lesson data object
    const lessonData = {
      title,
      description,
      content,
      duration: durationNum,
      order: assignedOrder,
      course: req.params.courseId,
      isPublished: false
    };

    // Only add optional fields if they exist
    if (videoUrl) lessonData.videoUrl = videoUrl;
    if (resourcesArr) lessonData.resources = resourcesArr;
    if (quiz) lessonData.quiz = quiz;

    // Create lesson and ensure atomicity: if adding to course fails, remove lesson
    const lesson = await Lesson.create(lessonData);

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
    console.error('❌ Error creating lesson:', error);
    console.error('Request body:', req.body);
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Upload a PDF resource for an instructor's course
// @route   POST /api/instructor/course/upload-pdf/:courseId
// @access  Private/Instructor (must own the course)
exports.uploadCoursePdf = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    // Validate mimetype again
    if (file.mimetype !== 'application/pdf') {
      return res.status(400).json({ success: false, message: 'Only PDF files are allowed' });
    }

    // file.path is available because uploadPdf uses diskStorage
    const savedFilename = file.filename || (file.path && file.path.split(require('path').sep).pop());
    const pdfUrl = `/uploads/pdfs/${savedFilename}`;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    // Only instructor who owns the course can upload resources
    if (course.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    course.pdfResource = pdfUrl;
    course.pdfResourceName = file.originalname || savedFilename;
    await course.save();

    await Achievement && Achievement.create ? null : null; // keep linter happy if Achievement unused

    res.json({ success: true, pdfResource: pdfUrl, pdfResourceName: course.pdfResourceName });
  } catch (err) {
    console.error('instructor.uploadCoursePdf error', err);
    res.status(500).json({ success: false, message: err.message });
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
    // Respond with the updated lesson
    return res.json({ success: true, message: 'Lesson updated successfully', data: lesson });
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

    // Extract unique students and include which of the instructor's courses each student is enrolled in
    const studentSet = new Set();
    const students = [];

    courses.forEach(course => {
      course.enrolledStudents?.forEach(student => {
        const sid = student._id.toString();
        // find or initialize existing student entry
        let entry = students.find(s => String(s._id) === sid);
        if (!entry) {
          entry = {
            ...student.toObject(),
            // `courses` will hold only the courses (id + title) from THIS instructor that the student is enrolled in
            courses: []
          };
          students.push(entry);
        }
        // append this course to the student's courses list if not already present
        if (!entry.courses.some(c => String(c._id) === String(course._id))) {
          entry.courses.push({ _id: course._id, title: course.title });
        }
      });
    });

    // Attach a compact count derived from the courses array for compatibility
    students.forEach(s => {
      s.enrolledInCourseCount = (s.courses || []).length;
    });

    // Also fetch each student's total enrolled courses across the platform
    try {
      const studentIds = students.map(s => s._id);
      const users = await User.find({ _id: { $in: studentIds } }).select('enrolledCourses').lean();
      const enrolledCountMap = {};
      users.forEach(u => {
        enrolledCountMap[String(u._id)] = (u.enrolledCourses || []).length;
      });
      students.forEach(s => {
        s.totalCoursesEnrolled = enrolledCountMap[String(s._id)] || 0;
      });
    } catch (e) {
      // if this fails, keep going without totalCoursesEnrolled
      console.warn('Could not compute totalCoursesEnrolled for students', e);
    }

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

    // Verify instructor can access this student (defensive: support populated or id-only enrolled entries)
    const instructorCourses = await Course.find({ instructor: req.user._id });
    const instructorCourseIds = instructorCourses.map(ic => ic._id.toString());

    const enrolledArr = Array.isArray(student.enrolledCourses) ? student.enrolledCourses : [];
    const hasAccess = enrolledArr.some(ec => {
      try {
        const courseObj = ec && ec.course ? ec.course : null;
        const courseId = courseObj ? (courseObj._id ? courseObj._id.toString() : courseObj.toString()) : null;
        return courseId && instructorCourseIds.includes(courseId);
      } catch (e) {
        return false;
      }
    });

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this student' });
    }

    // Calculate stats defensively (handle missing/null values)
    const totalCoursesEnrolled = enrolledArr.length;
    const completedCourses = enrolledArr.filter(c => Number(c.completionPercentage) === 100).length;
    const averageProgress = enrolledArr.length
      ? Math.round(enrolledArr.reduce((sum, c) => sum + (Number(c.completionPercentage) || 0), 0) / enrolledArr.length)
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

// @desc    Remove a student from all courses of this instructor
// @route   DELETE /api/instructor/students/:studentId
// @access  Private/Instructor
exports.removeStudentFromInstructor = async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const student = await User.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    // Find courses owned by this instructor where the student is enrolled
    const instructorCourses = await Course.find({ instructor: req.user._id, enrolledStudents: studentId });
    if (!instructorCourses || instructorCourses.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not enrolled in any of your courses' });
    }

    const courseIds = instructorCourses.map(c => c._id);

    // Remove student from each course's enrolledStudents array
    await Course.updateMany(
      { _id: { $in: courseIds } },
      { $pull: { enrolledStudents: studentId } }
    );

    // Remove these courses from the student's enrolledCourses subdocuments
    student.enrolledCourses = (student.enrolledCourses || []).filter(ec => !courseIds.some(id => id.toString() === ec.course.toString()));
    await student.save();

    return res.json({ success: true, message: 'Student removed from your courses' });
  } catch (error) {
    console.error('removeStudentFromInstructor error', error);
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
