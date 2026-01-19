// validationMiddleware.js
// Express-validator rules for common operations

const { body, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
  }
  next();
};

// User validation
const validateUserCreate = [
  body('fullName').notEmpty().withMessage('Full name required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 chars'),
  body('role').optional().isIn(['student', 'parent', 'instructor', 'admin', 'sub-admin']),
  handleValidationErrors
];

const validateUserUpdate = [
  body('fullName').optional().notEmpty(),
  body('email').optional().isEmail(),
  body('phone').optional().isMobilePhone(),
  handleValidationErrors
];

// Course validation
const validateCourseCreate = [
  body('title').notEmpty().withMessage('Title required'),
  body('category').notEmpty().withMessage('Category required'),
  body('level').optional().isIn(['Beginner', 'Intermediate', 'Advanced']),
  body('status').optional().isIn(['active', 'archived', 'draft']),
  handleValidationErrors
];

// Enrollment validation
const validateEnrollmentCreate = [
  body('studentId').notEmpty().withMessage('Student ID required'),
  body('courseId').notEmpty().withMessage('Course ID required'),
  handleValidationErrors
];

// Auth validation
const validateLogin = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
  handleValidationErrors
];

module.exports = {
  validateUserCreate,
  validateUserUpdate,
  validateCourseCreate,
  validateEnrollmentCreate,
  validateLogin,
  handleValidationErrors
};
