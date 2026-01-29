const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { createSharedEvent, getSharedEvents } = require('../controllers/sharedEventController');

router.get('/', protect, getSharedEvents); // allow authenticated users to view shared events
router.post('/', protect, authorize('instructor', 'admin'), createSharedEvent);

module.exports = router;
