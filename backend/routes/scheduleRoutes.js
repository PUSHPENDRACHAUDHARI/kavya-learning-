const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { protect } = require('../middleware/authMiddleware');

// Protect all schedule routes
router.use(protect);

// Get or initialize schedule for logged-in user
router.get('/', scheduleController.getSchedule);

// Update schedule for logged-in user
router.put('/', scheduleController.updateSchedule);

// Reset schedule to 0
router.post('/reset', scheduleController.resetSchedule);

// Get upcoming classes for the logged-in user
router.get('/upcoming', scheduleController.getUpcomingClasses);

module.exports = router;
