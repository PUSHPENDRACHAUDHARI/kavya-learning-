const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const admin = require('../controllers/adminController');

// Debug: confirm admin routes module loaded
console.log('➡️  Admin routes loaded and registered');
// Notes routes removed (feature reverted)

// Users (admin or sub-admin with manageStudents permission)
router.post('/users', protect, authorize('admin','sub-admin'), requirePermission('manageStudents'), admin.createUser);
router.get('/users', protect, authorize('admin','sub-admin'), requirePermission('manageStudents'), admin.listUsers);
router.get('/users/:id', protect, authorize('admin','sub-admin'), requirePermission('manageStudents'), admin.getUser);
router.put('/users/:id', protect, authorize('admin','sub-admin'), requirePermission('manageStudents'), admin.updateUser);
router.delete('/users/:id', protect, authorize('admin'), admin.deleteUser); // only admin can delete users

// Block / Unblock user (admin or sub-admin with manageStudents permission)
router.put('/users/:id/block', protect, authorize('admin','sub-admin'), requirePermission('manageStudents'), admin.blockUser);
router.put('/users/:id/unblock', protect, authorize('admin','sub-admin'), requirePermission('manageStudents'), admin.unblockUser);

// Courses (admin or sub-admin with manageCourses)
router.post('/courses', protect, authorize('admin','sub-admin'), requirePermission('manageCourses'), admin.createCourse);
router.get('/courses', protect, authorize('admin','sub-admin'), requirePermission('manageCourses'), admin.listCourses);
router.get('/courses/:id', protect, authorize('admin','sub-admin'), requirePermission('manageCourses'), admin.getCourse);
router.put('/courses/:id', protect, authorize('admin','sub-admin'), requirePermission('manageCourses'), admin.updateCourse);
router.delete('/courses/:id', protect, authorize('admin'), admin.deleteCourse);

// Enrollments
router.post('/enrollments', protect, authorize('admin','sub-admin'), requirePermission('manageStudents'), admin.createEnrollment);
router.get('/enrollments', protect, authorize('admin','sub-admin'), requirePermission('manageStudents'), admin.listEnrollments);
router.get('/enrollments/:id', protect, authorize('admin','sub-admin'), requirePermission('manageStudents'), admin.getEnrollment);
router.put('/enrollments/:id', protect, authorize('admin','sub-admin'), requirePermission('manageStudents'), admin.updateEnrollment);
router.delete('/enrollments/:id', protect, authorize('admin'), admin.deleteEnrollment);

// Announcements
router.post('/announcements', protect, authorize('admin','sub-admin'), requirePermission('manageCourses'), admin.createAnnouncement);
router.get('/announcements', protect, authorize('admin','sub-admin'), admin.listAnnouncements);
router.delete('/announcements/:id', protect, authorize('admin'), admin.deleteAnnouncement);

// Notes (Admin) - upload, list, delete
const { uploadFiles } = require('../middleware/multer');
const noteController = require('../controllers/noteController');
router.post('/notes', protect, authorize('admin','sub-admin'), requirePermission('manageNotes'), uploadFiles.single('file'), noteController.uploadNote);
router.get('/notes', protect, authorize('admin','sub-admin'), requirePermission('manageNotes'), noteController.listNotesAdmin);
router.delete('/notes/:id', protect, authorize('admin','sub-admin'), requirePermission('manageNotes'), noteController.deleteNote);

// Sub-admins
router.post('/subadmins', protect, authorize('admin'), admin.createSubAdmin);
router.get('/subadmins', protect, authorize('admin','sub-admin'), admin.listSubAdmins);
router.put('/subadmins/:id', protect, authorize('admin'), admin.updateSubAdmin);
router.delete('/subadmins/:id', protect, authorize('admin'), admin.deleteSubAdmin);

// Upload PDF for course resource
const { uploadPdf } = require('../middleware/multer');
router.post('/course/upload-pdf/:courseId', protect, authorize('admin','sub-admin'), requirePermission('manageCourses'), uploadPdf.single('pdfResource'), admin.uploadCoursePdf);

// Activity logs and dashboard
router.get('/logs', protect, authorize('admin','sub-admin'), requirePermission('viewReports'), admin.listActivityLogs);
router.get('/dashboard/summary', protect, authorize('admin','sub-admin'), requirePermission('viewReports'), admin.dashboardSummary);

module.exports = router;
