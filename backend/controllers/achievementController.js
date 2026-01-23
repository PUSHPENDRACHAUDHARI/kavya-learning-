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

// @desc    Get leaderboard with comprehensive rankings
// @route   GET /api/achievements/leaderboard
// @access  Private
const getLeaderboard = asyncHandler(async (req, res) => {
    const User = require('../models/userModel');
    const Enrollment = require('../models/enrollmentModel');

    // Get all students with their achievements and enrollment data
    const achievementData = await Achievement.aggregate([
        {
            $group: {
                _id: '$user',
                totalPoints: { $sum: '$points' },
                achievementCount: { $sum: 1 },
                achievements: { $push: '$$ROOT' }
            }
        },
        {
            $sort: { totalPoints: -1 }
        }
    ]);

    // Populate user details for each entry
    await Achievement.populate(achievementData, {
        path: '_id',
        select: 'fullName avatar email enrolledCourses streakDays',
        model: 'User'
    });

    // Enrich with additional metrics
    const enrichedLeaderboard = await Promise.all(
        achievementData.map(async (item, index) => {
            const user = item._id;
            if (!user) return null;

            // Get enrollment stats
            const enrollments = user.enrolledCourses || [];
            const completedCourses = enrollments.filter(e => e.completionPercentage === 100).length;
            const totalEnrolled = enrollments.length;
            const averageProgress = enrollments.length 
                ? Math.round(enrollments.reduce((sum, e) => sum + (e.completionPercentage || 0), 0) / enrollments.length)
                : 0;

            // Calculate study hours
            const totalHours = enrollments.reduce((sum, e) => sum + (e.hoursSpent || 0), 0);

            return {
                rank: index + 1,
                userId: user._id,
                name: user.fullName || 'Unknown',
                avatar: user.avatar,
                email: user.email,
                totalPoints: item.totalPoints,
                achievementCount: item.achievementCount,
                achievements: item.achievements,
                coursesCompleted: completedCourses,
                coursesEnrolled: totalEnrolled,
                averageScore: averageProgress,
                streakDays: user.streakDays || 0,
                totalHours: totalHours
            };
        })
    );

    // Filter out null entries
    const leaderboardData = enrichedLeaderboard.filter(item => item !== null);

    // Get current user's rank if they exist
    const currentUserRank = leaderboardData.find(item => item.userId.toString() === req.user._id.toString());

    res.json({
        leaderboard: leaderboardData,
        myRank: currentUserRank || null
    });
});

// @desc    Get my ranking and stats
// @route   GET /api/achievements/my-ranking
// @access  Private
const getMyRanking = asyncHandler(async (req, res) => {
    const User = require('../models/userModel');

    // Get all leaderboard data
    const achievementData = await Achievement.aggregate([
        {
            $group: {
                _id: '$user',
                totalPoints: { $sum: '$points' },
                achievementCount: { $sum: 1 }
            }
        },
        {
            $sort: { totalPoints: -1 }
        }
    ]);

    // Find current user's position
    const myAchievements = achievementData.find(
        item => item._id.toString() === req.user._id.toString()
    );

    if (!myAchievements) {
        return res.json({
            rank: null,
            totalPoints: 0,
            achievementCount: 0,
            coursesCompleted: 0,
            avgScore: 0,
            streakDays: 0
        });
    }

    // Find user's rank
    const userRank = achievementData.findIndex(
        item => item._id.toString() === req.user._id.toString()
    ) + 1;

    // Get user's enrollment stats
    const user = await User.findById(req.user._id).populate('enrolledCourses.course');
    const enrollments = user.enrolledCourses || [];
    const completedCourses = enrollments.filter(e => e.completionPercentage === 100).length;
    const avgScore = enrollments.length 
        ? Math.round(enrollments.reduce((sum, e) => sum + (e.completionPercentage || 0), 0) / enrollments.length)
        : 0;

    res.json({
        rank: userRank,
        totalPoints: myAchievements.totalPoints,
        achievementCount: myAchievements.achievementCount,
        coursesCompleted: completedCourses,
        avgScore,
        streakDays: user.streakDays || 0
    });
});

module.exports = {
    createAchievement,
    getMyAchievements,
    getRecentAchievements,
    getAchievementPoints,
    getLeaderboard,
    getMyRanking
};