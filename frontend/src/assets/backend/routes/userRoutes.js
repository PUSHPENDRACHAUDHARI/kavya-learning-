const express = require('express');
const { registerUser, loginUser, getUserProfile, updateUserProfile, uploadPhoto, getStreak, getWeeklyStats, updateWeeklyStats } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/multer');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.post('/upload-photo', protect, upload.single('profilePhoto'), uploadPhoto);
router.get('/streak', protect, getStreak);
router.get('/weekly-stats', protect, getWeeklyStats);
router.put('/weekly-stats', protect, updateWeeklyStats);

module.exports = router;