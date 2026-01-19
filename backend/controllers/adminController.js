const User = require('../models/userModel');
const Course = require('../models/courseModel');
const Enrollment = require('../models/enrollmentModel');
const Announcement = require('../models/announcementModel');
const ActivityLog = require('../models/activityLogModel');

// --- Users (Admin) ---
exports.createUser = async (req, res) => {
  try {
    const { fullName, email, password, role, phone, address } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'User already exists' });
    const user = await User.create({ fullName, email, password, role, phone, address });
    await ActivityLog.create({ action: 'create_user', performedBy: req.user._id, targetType: 'User', targetId: user._id, details: { email } });
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.listUsers = async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20, status } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (search) filter.$or = [{ fullName: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];

    const users = await User.find(filter).select('-password').skip((page-1)*limit).limit(Number(limit)).sort({ createdAt: -1 });
    const total = await User.countDocuments(filter);
    res.json({ data: users, total });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const updates = req.body;
    if (updates.password) {
      // Allow password update; will be hashed by pre-save
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    Object.assign(user, updates);
    await user.save();
    await ActivityLog.create({ action: 'update_user', performedBy: req.user._id, targetType: 'User', targetId: user._id, details: updates });
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    await ActivityLog.create({ action: 'delete_user', performedBy: req.user._id, targetType: 'User', targetId: user._id });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Block user
exports.blockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.user_status = 'Blocked';
    await user.save();

    await ActivityLog.create({
      action: 'block_user',
      performedBy: req.user._id,
      targetType: 'User',
      targetId: user._id,
      details: { email: user.email, fullName: user.fullName }
    });

    res.json({ message: 'User blocked successfully', user });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Unblock user
exports.unblockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.user_status = 'Active';
    await user.save();

    await ActivityLog.create({
      action: 'unblock_user',
      performedBy: req.user._id,
      targetType: 'User',
      targetId: user._id,
      details: { email: user.email, fullName: user.fullName }
    });

    res.json({ message: 'User unblocked successfully', user });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};



// --- Courses (Admin) ---
exports.createCourse = async (req, res) => {
  try {
    const payload = req.body;
    payload.createdBy = req.user._id;
    
    // If no instructor provided, set the admin as instructor
    if (!payload.instructor) {
      payload.instructor = req.user._id;
    }
    
    // Ensure price and duration have default values if not provided
    if (payload.price === undefined || payload.price === null || payload.price === '') {
      payload.price = 0;
    }
    if (!payload.duration) {
      payload.duration = '0 weeks';
    }
    
    const course = await Course.create(payload);
    await ActivityLog.create({ action: 'create_course', performedBy: req.user._id, targetType: 'Course', targetId: course._id, details: payload });
    res.status(201).json(course);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.listCourses = async (req, res) => {
  try {
    const { category, status, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (search) filter.$or = [{ title: new RegExp(search, 'i') }, { description: new RegExp(search, 'i') }];
    const courses = await Course.find(filter).skip((page-1)*limit).limit(Number(limit)).sort({ createdAt: -1 });
    const total = await Course.countDocuments(filter);
    res.json({ data: courses, total });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('createdBy', 'fullName email');
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    Object.assign(course, req.body);
    await course.save();
    await ActivityLog.create({ action: 'update_course', performedBy: req.user._id, targetType: 'Course', targetId: course._id, details: req.body });
    res.json(course);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// @desc Upload a PDF resource for a course and save it on server
// @route POST /api/admin/course/upload-pdf/:courseId
// @access Private (admin/sub-admin with manageCourses)
exports.uploadCoursePdf = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'No file uploaded' });

    // Validate mimetype again
    if (file.mimetype !== 'application/pdf') {
      return res.status(400).json({ message: 'Only PDF files are allowed' });
    }

    // Build URL path to serve statically via /uploads
    // file.path is available because uploadPdf uses diskStorage
    const savedFilename = file.filename || file.path.split(require('path').sep).pop();
    const pdfUrl = `/uploads/pdfs/${savedFilename}`;

    // Update course document
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    course.pdfResource = pdfUrl;
    course.pdfResourceName = file.originalname || savedFilename;
    await course.save();

    await ActivityLog.create({ action: 'upload_course_pdf', performedBy: req.user._id, targetType: 'Course', targetId: course._id, details: { filename: savedFilename } });

    res.json({ success: true, pdfResource: pdfUrl, pdfResourceName: course.pdfResourceName });
  } catch (err) {
    console.error('uploadCoursePdf error', err);
    res.status(500).json({ message: err.message });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    // Get all students enrolled in this course before deleting
    const enrolledStudents = course.enrolledStudents || [];

    // Delete all lessons associated with this course
    const Lesson = require('../models/lessonModel');
    await Lesson.deleteMany({ course: courseId });

    // Delete all enrollments associated with this course
    await Enrollment.deleteMany({ courseId: courseId });

    // Delete all payments associated with this course
    const Payment = require('../models/paymentModel');
    await Payment.deleteMany({ courseId: courseId });

    // Remove course from all students' enrolledCourses array
    await User.updateMany(
      { _id: { $in: enrolledStudents } },
      { $pull: { enrolledCourses: { course: courseId } } }
    );

    // Delete the course itself
    await Course.findByIdAndDelete(courseId);

    // Log the activity
    await ActivityLog.create({ 
      action: 'delete_course', 
      performedBy: req.user._id, 
      targetType: 'Course', 
      targetId: courseId,
      details: { 
        courseTitle: course.title,
        enrolledStudentsCount: enrolledStudents.length
      }
    });

    res.json({ 
      message: 'Course deleted successfully along with all related data',
      deletedCourseId: courseId,
      affectedStudents: enrolledStudents.length
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// --- Enrollments ---
exports.createEnrollment = async (req, res) => {
  try {
    const { studentId, courseId, isFree } = req.body;
    if (!studentId || !courseId) return res.status(400).json({ message: 'studentId and courseId required' });
    const existing = await Enrollment.findOne({ studentId, courseId });
    if (existing) return res.status(400).json({ message: 'Student already enrolled' });

    const enrollmentPayload = { studentId, courseId };
    if (isFree) {
      enrollmentPayload.isFree = true;
      enrollmentPayload.purchaseStatus = 'free';
    }

    const enrollment = await Enrollment.create(enrollmentPayload);

    // Add student to course.studentsEnrolled
    await Course.findByIdAndUpdate(courseId, { $addToSet: { studentsEnrolled: studentId } });

    // Also ensure the student's User.enrolledCourses subdocument contains this course
    try {
      const student = await User.findById(studentId);
      if (student && !student.enrolledCourses.some(ec => ec.course.toString() === courseId.toString())) {
        student.enrolledCourses.push({
          course: courseId,
          completedLessons: [],
          hoursSpent: 0,
          completionPercentage: 0,
          enrollmentDate: new Date()
        });
        await student.save();
      }
    } catch (uErr) {
      // don't fail the whole operation for a user update issue - log for debugging
      console.warn('Failed to update User.enrolledCourses after admin enrollment:', uErr.message);
    }

    await ActivityLog.create({ action: 'create_enrollment', performedBy: req.user._id, targetType: 'Enrollment', targetId: enrollment._id, details: { studentId, courseId, isFree: !!isFree } });
    res.status(201).json(enrollment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.listEnrollments = async (req, res) => {
  try {
    const { studentId, courseId, completed, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (studentId) filter.studentId = studentId;
    if (courseId) filter.courseId = courseId;
    if (typeof completed !== 'undefined') filter.completed = completed === 'true';
    const enrollments = await Enrollment.find(filter).populate('studentId', 'fullName email').populate('courseId', 'title').skip((page-1)*limit).limit(Number(limit)).sort({ createdAt: -1 });
    const total = await Enrollment.countDocuments(filter);
    res.json({ data: enrollments, total });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getEnrollment = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id).populate('studentId', 'fullName email').populate('courseId', 'title');
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });
    res.json(enrollment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateEnrollment = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });
    Object.assign(enrollment, req.body);
    await enrollment.save();
    await ActivityLog.create({ action: 'update_enrollment', performedBy: req.user._id, targetType: 'Enrollment', targetId: enrollment._id, details: req.body });
    res.json(enrollment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteEnrollment = async (req, res) => {
  try {
    const enrollment = await Enrollment.findByIdAndDelete(req.params.id);
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });
    await Course.findByIdAndUpdate(enrollment.courseId, { $pull: { studentsEnrolled: enrollment.studentId } });
    await ActivityLog.create({ action: 'delete_enrollment', performedBy: req.user._id, targetType: 'Enrollment', targetId: enrollment._id });
    res.json({ message: 'Enrollment deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// --- Announcements ---
exports.createAnnouncement = async (req, res) => {
  try {
    // Log incoming request for debugging upload/400 issues
    console.log('createAnnouncement called by user:', req.user ? req.user._id : '<no-user>');
    console.log('createAnnouncement payload keys:', Object.keys(req.body));

    // Simple validation: require at least one of title, message, or media
    const { title, message, image, video, file } = req.body || {};
    if (!(title || message || image || video || file)) {
      console.warn('createAnnouncement validation failed - no title/message/media present', { title, message, hasImage: !!image, hasVideo: !!video, hasFile: !!file });
      return res.status(422).json({ message: 'At least one of title, message, image, video, or file is required' });
    }

    // If title missing, try to derive from message or media
    const finalTitle = title || (message ? String(message).substring(0, 100) : (req.body.imageName || req.body.fileName || 'Announcement'));

    const payload = { ...req.body, createdBy: req.user ? req.user._id : undefined, title: finalTitle };
    const a = await Announcement.create(payload);
    await ActivityLog.create({ action: 'create_announcement', performedBy: req.user._id, targetType: 'Announcement', targetId: a._id, details: payload });
    console.log('Announcement created:', a._id);
    res.status(201).json(a);
  } catch (err) {
    console.error('createAnnouncement error:', err && err.stack ? err.stack : err);
    // If Mongoose validation error, return useful message
    if (err && err.name === 'ValidationError') {
      return res.status(422).json({ message: err.message });
    }
    res.status(500).json({ message: err.message || 'Server error creating announcement' });
  }
};

exports.listAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find({}).sort({ createdAt: 1 }).limit(100);
    res.json(announcements);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    const a = await Announcement.findByIdAndDelete(req.params.id);
    if (!a) return res.status(404).json({ message: 'Announcement not found' });
    await ActivityLog.create({ action: 'delete_announcement', performedBy: req.user._id, targetType: 'Announcement', targetId: a._id });
    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// --- Sub-admin management (uses User model with role=sub-admin) ---
exports.createSubAdmin = async (req, res) => {
  try {
    const { fullName, email, password, permissions = [] } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'User already exists' });
    const user = await User.create({ fullName, email, password, role: 'sub-admin', permissions });
    await ActivityLog.create({ action: 'create_subadmin', performedBy: req.user._id, targetType: 'User', targetId: user._id, details: { permissions } });
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.listSubAdmins = async (req, res) => {
  try {
    const subs = await User.find({ role: 'sub-admin' }).select('-password');
    res.json(subs);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateSubAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'sub-admin') return res.status(404).json({ message: 'Sub-admin not found' });
    Object.assign(user, req.body);
    await user.save();
    await ActivityLog.create({ action: 'update_subadmin', performedBy: req.user._id, targetType: 'User', targetId: user._id, details: req.body });
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteSubAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'sub-admin') return res.status(404).json({ message: 'Sub-admin not found' });
    await user.remove();
    await ActivityLog.create({ action: 'delete_subadmin', performedBy: req.user._id, targetType: 'User', targetId: user._id });
    res.json({ message: 'Sub-admin deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// --- Activity logs ---
exports.listActivityLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, userId, action } = req.query;
    const filter = {};
    if (userId) filter.performedBy = userId;
    if (action) filter.action = action;
    const logs = await ActivityLog.find(filter).populate('performedBy', 'fullName email').sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit));
    const total = await ActivityLog.countDocuments(filter);
    res.json({ data: logs, total });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Simple aggregated dashboard stats (counts)
exports.dashboardSummary = async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalParents = await User.countDocuments({ role: 'parent' });
    const totalInstructors = await User.countDocuments({ role: 'instructor' });
    const totalCourses = await Course.countDocuments({});
    const totalEnrollments = await Enrollment.countDocuments({});
    const completedCourses = await Enrollment.countDocuments({ completed: true });

    res.json({ totalStudents, totalParents, totalInstructors, totalCourses, totalEnrollments, completedCourses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
