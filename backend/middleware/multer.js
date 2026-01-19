const multer = require('multer');

// Configure multer to use memory storage (buffer)
const storage = multer.memoryStorage();

// Image-only middleware (used for profile photos and image uploads)
const imageFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// File middleware for PDFs, Word documents, videos, and images
const documentFilter = (req, file, cb) => {
  const allowed = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (
    (file.mimetype && file.mimetype.startsWith('image/')) ||
    (file.mimetype && file.mimetype.startsWith('video/')) ||
    allowed.includes(file.mimetype)
  ) {
    cb(null, true);
  } else {
    cb(new Error('Only image, video, PDF, or Word documents are allowed!'), false);
  }
};

const uploadImages = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: imageFilter,
});

const uploadFiles = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB for videos
  fileFilter: documentFilter,
});
// Disk storage for PDFs to be served from /uploads
const path = require('path');
const fs = require('fs');
const pdfStoragePath = path.join(__dirname, '..', 'uploads', 'pdfs');
if (!fs.existsSync(pdfStoragePath)) fs.mkdirSync(pdfStoragePath, { recursive: true });

const pdfDiskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, pdfStoragePath);
  },
  filename: function (req, file, cb) {
    const safeName = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, safeName);
  }
});

const pdfFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') cb(null, true);
  else cb(new Error('Only PDF files are allowed'), false);
};

const uploadPdf = multer({
  storage: pdfDiskStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: pdfFilter,
});

module.exports = { upload: uploadImages, uploadFiles, uploadPdf };

