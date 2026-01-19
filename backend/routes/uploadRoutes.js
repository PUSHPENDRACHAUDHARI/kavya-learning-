const express = require('express');
const router = express.Router();
const { uploadFiles } = require('../middleware/multer');
const { uploadFile } = require('../controllers/uploadController');
const { protect } = require('../middleware/authMiddleware');

// Protected upload route - admin or instructor
router.post('/', protect, uploadFiles.single('file'), uploadFile);

module.exports = router;
