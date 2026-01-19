const Achievement = require('../models/achievementModel');
const asyncHandler = require('express-async-handler');

// @desc    Create new achievement
// @route   POST /api/achievements
// @access  Private (Admin)
const createAchievement = asyncHandler(async (req, res) => {
    const { user, title, description, type, points, course } = req.body;

    const achievement = await Achievement.create({
        user,
        title,
        description,
        type,
        points,
        course
    });

    if (achievement) {
        res.status(201).json(achievement);
    } else {
        res.status(400);
        throw new Error('Invalid achievement data');
    }
});

// @desc    Get user's achievements
// @route   GET /api/achievements/my-achievements
// @access  Private
const getMyAchievements = asyncHandler(async (req, res) => {
    const achievements = await Achievement.find({ user: req.user._id })
        .populate('course', 'title')
        .sort('-dateEarned');
    
    res.json(achievements);
});

// @desc    Get recent achievements
// @route   GET /api/achievements/recent
// @access  Private
const getRecentAchievements = asyncHandler(async (req, res) => {
    const achievements = await Achievement.find()
        .populate('user', 'name avatar')
        .populate('course', 'title')
        .sort('-dateEarned')
        .limit(5);
    
    res.json(achievements);
});

// @desc    Get user's achievement points
// @route   GET /api/achievements/points
// @access  Private
const getAchievementPoints = asyncHandler(async (req, res) => {
    const achievements = await Achievement.find({ user: req.user._id });
    const totalPoints = achievements.reduce((sum, achievement) => sum + achievement.points, 0);
    
    res.json({ points: totalPoints });
});

// @desc    Get leaderboard
// @route   GET /api/achievements/leaderboard
// @access  Private
const getLeaderboard = asyncHandler(async (req, res) => {
    const leaderboard = await Achievement.aggregate([
        {
            $group: {
                _id: '$user',
                totalPoints: { $sum: '$points' }
            }
        },
        {
            $sort: { totalPoints: -1 }
        },
        {
            $limit: 10
        }
    ]);

    // Populate user details
    await Achievement.populate(leaderboard, {
        path: '_id',
        select: 'name avatar email',
        model: 'User'
    });

    res.json(leaderboard);
});

module.exports = {
    createAchievement,
    getMyAchievements,
    getRecentAchievements,
    getAchievementPoints,
    getLeaderboard
};