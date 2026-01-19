const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { sendMessage, getConversation, listRecent, deleteMessage } = require('../controllers/messageController');

// Send a message (protected)
router.post('/', protect, sendMessage);

// Delete a specific message (per-user deletion)
router.delete('/:messageId', protect, deleteMessage);

// Get conversation with a specific user
router.get('/:userId', protect, getConversation);

// Fallback query style: /api/messages?userId=xxx
router.get('/', protect, (req, res, next) => {
  if (req.query.userId) return getConversation(req, res, next);
  return listRecent(req, res, next);
});

// Mark messages from a user as read
router.post('/:userId/read', protect, (req, res, next) => {
  return require('../controllers/messageController').markRead(req, res, next);
});

module.exports = router;
