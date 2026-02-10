const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  joinAttendance,
  markAbsentForEvent,
  getAttendanceForEvent,
  getAttendanceForStudent,
  recordAttendance,
  getAttendanceForCourse,
  recordLiveSessionAttendance,
  updateLiveSessionAttendance,
  getLiveSessionAttendance,
  getStudentLiveSessionAttendance,
  markAttendanceByInstructor,
  getInstructorAttendanceRecords,
  getAttendanceDetails
} = require('../controllers/attendanceController');

// debug controller (non-production)
const { getAttendanceForEventDebug } = require('../controllers/attendanceController');

// Student marks themselves present when joining
router.post('/join', protect, authorize('student', 'parent'), joinAttendance);

// Admin/instructor internal endpoint to mark absent after event ends
router.post('/mark-absent', protect, authorize('instructor', 'admin', 'sub-admin'), markAbsentForEvent);

// Get attendance for an event (instructor/admin)
router.get('/event/:eventId', protect, authorize('instructor', 'admin', 'sub-admin'), getAttendanceForEvent);

// DEV: quick merged attendance output without auth (only in non-production)
router.get('/event/:eventId/debug', (req, res, next) => {
  if (process.env.NODE_ENV === 'production') return res.status(404).json({ success: false });
  return (async () => { try { await getAttendanceForEventDebug(req, res); } catch (e) { next(e); } })();
});

// Get attendance history for a student (student may view own)
router.get('/student/:studentId', protect, getAttendanceForStudent);

// Record when a user joins a meet (legacy route used by UI in some places)
router.post('/events/:id/record', protect, recordAttendance);

// Get attendance for a course (instructor or admin)
router.get('/course/:courseId', protect, authorize('instructor', 'admin', 'sub-admin'), getAttendanceForCourse);

// Student accessed (viewed) an event page (records accessedAt)
router.post('/access', protect, authorize('student', 'parent'), (req, res, next) => {
  return (async () => { try { await require('../controllers/attendanceController').accessEvent(req, res); } catch (e) { next(e); } })();
});

// Student leaving the event page (optional) - records leftAt
router.post('/:eventId/leave', protect, authorize('student', 'parent'), (req, res, next) => {
  return (async () => { try { await require('../controllers/attendanceController').leaveEvent(req, res); } catch (e) { next(e); } })();
});
// Beacon-friendly leave route: accepts token via query/body for navigator.sendBeacon reliability
router.post('/:eventId/leave-beacon', (req, res, next) => {
  return (async () => { try { await require('../controllers/attendanceController').leaveEventBeacon(req, res); } catch (e) { next(e); } })();
});

// Live session attendance routes
router.post('/live-sessions/:sessionId/join', protect, recordLiveSessionAttendance);
router.post('/live-sessions/:sessionId/leave', protect, updateLiveSessionAttendance);
router.get('/live-sessions/:sessionId', protect, getLiveSessionAttendance);
router.get('/student/live-sessions', protect, getStudentLiveSessionAttendance);

// Instructor attendance marking routes
router.post('/mark-attendance', protect, authorize('instructor', 'admin', 'sub-admin'), markAttendanceByInstructor);
router.get('/instructor/records', protect, authorize('instructor', 'admin', 'sub-admin'), getInstructorAttendanceRecords);
router.get('/event/:eventId/details', protect, authorize('instructor', 'admin', 'sub-admin'), getAttendanceDetails);

module.exports = router;
