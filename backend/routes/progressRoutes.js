const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  getProgressOverview,
  getRecentActivity,
  downloadCertificate,
} = require('../controllers/progressController');

const router = express.Router();

// Overall stats + skills + certificates + recent activity snapshot
router.get('/overview', protect, getProgressOverview);

// Recent activity only (can be polled from the UI)
router.get('/activity', protect, getRecentActivity);

// Generate and download a course completion certificate
router.get('/certificates/:courseId/download', protect, downloadCertificate);

module.exports = router;


