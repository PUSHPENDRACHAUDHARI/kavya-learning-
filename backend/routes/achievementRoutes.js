const express = require('express');
const router = express.Router();
const {
    createAchievement,
    getMyAchievements,
    getRecentAchievements,
    getAchievementPoints,
    getLeaderboard
} = require('../controllers/achievementController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, authorize('admin'), createAchievement);

router.get('/my-achievements', protect, getMyAchievements);
router.get('/recent', protect, getRecentAchievements);
router.get('/points', protect, getAchievementPoints);
router.get('/leaderboard', protect, getLeaderboard);

module.exports = router;