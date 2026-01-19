const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

// Get all notifications for the logged-in user
router.get('/', protect, notificationController.getNotifications);

// Get unread notification count
router.get('/count/unread', protect, notificationController.getUnreadCount);

// Mark a specific notification as read
router.patch('/:notificationId/read', protect, notificationController.markAsRead);

// Mark all notifications as read
router.patch('/read/all', protect, notificationController.markAllAsRead);

// Delete a specific notification
router.delete('/:notificationId', protect, notificationController.deleteNotification);

// Delete all notifications
router.delete('/all', protect, notificationController.deleteAllNotifications);

module.exports = router;
