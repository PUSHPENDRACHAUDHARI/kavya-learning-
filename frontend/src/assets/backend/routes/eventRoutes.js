const express = require('express');
const router = express.Router();
const {
    createEvent,
    getEvents,
    getMyEvents,
    getUpcomingEvents,
    enrollInEvent,
    updateEvent,
    deleteEvent,
    setReminder
} = require('../controllers/eventController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, authorize('instructor', 'admin'), createEvent)
    .get(protect, getEvents);

router.get('/my-events', protect, getMyEvents);
router.get('/upcoming', protect, getUpcomingEvents);
router.post('/reminder', protect, setReminder);
router.post('/:id/enroll', protect, enrollInEvent);

router.route('/:id')
    .put(protect, authorize('instructor', 'admin'), updateEvent)
    .delete(protect, authorize('instructor', 'admin'), deleteEvent);

module.exports = router;