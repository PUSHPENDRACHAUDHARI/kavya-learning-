// featureFlagRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const featureFlagController = require('../controllers/featureFlagController');

// Get flag by key (public, for client-side feature detection)
router.get('/:key', featureFlagController.getFlag);

// Admin endpoints
router.get('/', protect, authorize('admin'), featureFlagController.listFlags);
router.put('/:key', protect, authorize('admin'), featureFlagController.setFlag);

module.exports = router;
