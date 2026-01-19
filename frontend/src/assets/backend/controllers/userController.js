const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const { uploadToCloudinary } = require('../config/cloudinary');

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register new user
// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { fullName, email, password, phone } = req.body;

        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create user
        const user = await User.create({
            fullName,
            email,
            password,
            phone,
        });

        if (user) {
            res.status(201).json({
                message: 'Account successfully created',
                user: {
                    _id: user._id,
                    fullName: user.fullName,
                    email: user.email,
                    phone: user.phone,
                    token: generateToken(user._id),
                },
            });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Helper function to calculate streak
const calculateStreak = (lastLoginDate, currentStreak) => {
    if (!lastLoginDate) {
        // First login - streak is 0
        return 0;
    }

    const now = new Date();
    const lastLogin = new Date(lastLoginDate);
    
    // Reset time to midnight for accurate day comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastLoginDay = new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate());
    
    // Calculate difference in days
    const diffTime = today - lastLoginDay;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        // Same day login - don't increase streak
        return currentStreak;
    } else if (diffDays === 1) {
        // Consecutive day - increase streak
        return currentStreak + 1;
    } else {
        // Streak broken - reset to 1 (today's login)
        return 1;
    }
};

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email });

        // Check if user exists and password matches
        if (user && (await user.matchPassword(password))) {
            // Calculate streak
            const newStreak = calculateStreak(user.lastLoginDate, user.streakDays || 0);
            
            // Update user's last login and streak
            user.lastLoginDate = new Date();
            user.streakDays = newStreak;
            await user.save();

            res.json({
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                token: generateToken(user._id),
                streakDays: newStreak,
            });
        } else {
            res.status(401).json({ message: 'Invalid credentials, please sign up first' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('-password')
            .populate('enrolledCourses.course', 'title')
            .populate('achievements');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Calculate performance metrics
        const totalCourses = user.enrolledCourses ? user.enrolledCourses.length : 0;
        const hoursLearned = user.totalHoursLearned || 0;
        const achievementsCount = user.achievements ? user.achievements.length : 0;
        
        // Calculate average score (from quizzes if available)
        let averageScore = 0;
        if (user.enrolledCourses && user.enrolledCourses.length > 0) {
            // Average completion percentage across all enrolled courses
            const totalCompletion = user.enrolledCourses.reduce((sum, e) => sum + (e.completionPercentage || 0), 0);
            averageScore = Math.round(totalCompletion / user.enrolledCourses.length);
        }

        // Build a human-friendly address string if address components exist
        let formattedAddress = null;
        if (user.address) {
            const a = user.address;
            const parts = [a.street, a.city, a.state, a.zip, a.country].filter(Boolean);
            if (parts.length > 0) formattedAddress = parts.join(', ');
        }

        res.json({
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            location: user.location || null,
            address: formattedAddress,
            bio: user.bio || null,
            role: user.role,
            createdAt: user.createdAt,
            avatar: user.avatar,
            streakDays: user.streakDays || 0,
            stats: {
                totalCourses,
                hoursLearned,
                achievementsCount,
                averageScore
            },
            institution: user.institution
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update user profile (name, phone, location, bio)
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    try {
        console.log('updateUserProfile called for user:', req.user && req.user._id, 'body:', req.body);
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { fullName, phone, location, bio } = req.body;

        if (fullName !== undefined) user.fullName = fullName;
        if (phone !== undefined) user.phone = phone;
        if (location !== undefined) user.location = location;
        if (bio !== undefined) user.bio = bio;

        await user.save();

        const saved = await User.findById(user._id).select('-password');

        res.json({
            _id: saved._id,
            fullName: saved.fullName,
            email: saved.email,
            phone: saved.phone,
            role: saved.role,
            avatar: saved.avatar,
            createdAt: saved.createdAt,
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get student dashboard stats (hours learned, total courses, achievements)
// @route   GET /api/users/stats
// @access  Private/Student
const getStudentStats = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate('enrolledCourses.course', 'title');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            totalHoursLearned: user.totalHoursLearned || 0,
            totalCourses: user.enrolledCourses ? user.enrolledCourses.length : 0,
            achievementsCount: user.achievements ? user.achievements.length : 0,
            achievements: user.achievements || []
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get student's enrolled courses with progress
// @route   GET /api/users/courses
// @access  Private/Student
const getStudentCourses = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate({
                path: 'enrolledCourses.course',
                select: 'title description thumbnail'
            })
            .populate('enrolledCourses.completedLessons', 'title');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const coursesWithProgress = user.enrolledCourses.map(enrollment => {
            const course = enrollment.course;
            const completedCount = enrollment.completedLessons ? enrollment.completedLessons.length : 0;
            
            return {
                _id: course._id,
                title: course.title,
                description: course.description,
                thumbnail: course.thumbnail,
                hoursSpent: enrollment.hoursSpent || 0,
                completedLessons: completedCount,
                completionPercentage: enrollment.completionPercentage || 0,
                enrollmentDate: enrollment.enrollmentDate
            };
        });

        res.json({
            courses: coursesWithProgress,
            totalCourses: coursesWithProgress.length
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get student's profile courses with detailed progress
// @route   GET /api/users/profile/courses
// @access  Private/Student
const getProfileCourses = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate({
                path: 'enrolledCourses.course',
                select: 'title description thumbnail category instructor'
            })
            .populate({
                path: 'enrolledCourses.completedLessons',
                select: 'title'
            });
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const profileCourses = user.enrolledCourses.map(enrollment => {
            const course = enrollment.course;
            const completedCount = enrollment.completedLessons ? enrollment.completedLessons.length : 0;
            
            return {
                _id: course._id,
                title: course.title,
                description: course.description,
                thumbnail: course.thumbnail,
                category: course.category,
                instructor: course.instructor,
                hoursSpent: enrollment.hoursSpent || 0,
                completedLessons: completedCount,
                completionPercentage: enrollment.completionPercentage || 0,
                enrollmentDate: enrollment.enrollmentDate
            };
        });

        res.json({
            courses: profileCourses,
            totalCourses: profileCourses.length
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Mark lesson as completed (updates course progress)
// @route   POST /api/users/lesson/:lessonId/complete
// @access  Private/Student
const completeLessonInCourse = async (req, res) => {
    try {
        const { lessonId } = req.params;
        const { courseId, hoursSpent = 0 } = req.body;

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Find the enrollment
        const enrollment = user.enrolledCourses.find(e => e.course.toString() === courseId);
        if (!enrollment) {
            return res.status(400).json({ message: 'Not enrolled in this course' });
        }

        // Check if lesson already completed
        if (enrollment.completedLessons.find(id => id.toString() === lessonId)) {
            return res.status(400).json({ message: 'Lesson already completed' });
        }

        // Add completed lesson
        enrollment.completedLessons.push(lessonId);
        enrollment.hoursSpent += hoursSpent;
        user.totalHoursLearned += hoursSpent;

        await user.save();

        res.json({ 
            message: 'Lesson marked as completed', 
            hoursSpent: enrollment.hoursSpent,
            totalHoursLearned: user.totalHoursLearned
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Upload profile photo
// @route   POST /api/users/upload-photo
// @access  Private
const uploadPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const result = await uploadToCloudinary(req.file.buffer, {
      public_id: `profile_${user._id}_${Date.now()}`,
      folder: "profile_photos",
    });

    user.avatar = result.secure_url;
    await user.save();

    res.json({
      message: "Photo uploaded successfully",
      avatar: result.secure_url,
    });
  } catch (error) {
    console.log("Upload Error: ", error);
    res.status(500).json({ message: "Failed to upload photo" });
  }
};

// @desc    Get user streak
// @route   GET /api/users/streak
// @access  Private
const getStreak = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('streakDays lastLoginDate');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            streakDays: user.streakDays || 0,
            lastLoginDate: user.lastLoginDate,
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get user's weekly stats
// @route   GET /api/users/weekly-stats
// @access  Private
const getWeeklyStats = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('weeklyStats');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user.weeklyStats || { attended: 0, studyHours: 0, upcoming: 0 });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update user's weekly stats
// @route   PUT /api/users/weekly-stats
// @access  Private
const updateWeeklyStats = async (req, res) => {
    try {
        const { attended = 0, studyHours = 0, upcoming = 0 } = req.body || {};
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.weeklyStats = {
            attended: Number(attended) || 0,
            studyHours: Number(studyHours) || 0,
            upcoming: Number(upcoming) || 0,
        };

        await user.save();
        res.json(user.weeklyStats);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

module.exports = { 
    registerUser, 
    loginUser, 
    getUserProfile,
    updateUserProfile,
    getProfileCourses,
    getStudentStats,
    getStudentCourses,
    completeLessonInCourse,
    uploadPhoto,
    getStreak
    ,getWeeklyStats, updateWeeklyStats
};