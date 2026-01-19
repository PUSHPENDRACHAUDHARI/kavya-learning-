const express = require('express');
const { registerUser, loginUser, getUserProfile, updateUserProfile, uploadPhoto, deletePhoto, getStreak, getWeeklyStats, updateWeeklyStats, listStudentsPublic } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const multerMiddleware = require('../middleware/multer');
const upload = multerMiddleware.upload || multerMiddleware;

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);
router.get('/students', protect, listStudentsPublic);
router.put('/profile', protect, updateUserProfile);
router.post('/upload-photo', protect, upload.single('profilePhoto'), uploadPhoto);
router.delete('/photo', protect, deletePhoto);
router.get('/streak', protect, getStreak);
router.get('/weekly-stats', protect, getWeeklyStats);
router.put('/weekly-stats', protect, updateWeeklyStats);

module.exports = router;