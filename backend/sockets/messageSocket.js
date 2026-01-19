const jwt = require('jsonwebtoken');
const { getIo } = require('./io');
const Notification = require('../models/notificationModel');
const User = require('../models/userModel');

// Socket handler: clients must authenticate by emitting an `auth` event with their JWT
module.exports = function setupMessageSocket(io) {
  io.on('connection', (socket) => {
    socket.userId = null;

    socket.on('auth', (token) => {
      try {
        if (!token) return;
        const decoded = jwt.verify(token.replace(/^Bearer\s+/i, ''), process.env.JWT_SECRET);
        socket.userId = decoded.id;
        // Join a personal room for the user id
        socket.join(`user:${socket.userId}`);
        socket.emit('authenticated', { ok: true });
      } catch (err) {
        console.warn('Socket auth failed', err?.message || err);
        socket.emit('authenticated', { ok: false });
      }
    });

    socket.on('send_message', async (payload) => {
      // payload: { to, text }
      const from = socket.userId;
      if (!from) return socket.emit('error', { message: 'Not authenticated' });
      const to = payload && payload.to;
      const text = payload && payload.text;

      if (!to) return socket.emit('error', { message: 'Missing recipient' });

      // forward to recipient room immediately (backend will persist via REST POST)
      const messagePayload = { from, to, text, createdAt: new Date().toISOString() };
      io.to(`user:${to}`).emit('new_message', messagePayload);

      try {
        // Get sender name for notification text (fallback to id)
        const sender = await User.findById(from).select('fullName').lean();
        const senderName = (sender && sender.fullName) ? sender.fullName : `User ${from}`;

        // Create a stored notification for the recipient
        const notif = new Notification({
          userId: to,
          title: 'New message',
          message: `${senderName} sent you a message${text ? `: ${text.substring(0, 120)}` : ''}`,
          type: 'message',
          route: `/messages/${from}`,
          unread: true,
        });

        await notif.save();

        // Emit a notification event and unread count to recipient
        io.to(`user:${to}`).emit('notification', notif);

        const unreadCount = await Notification.countDocuments({ userId: to, unread: true });
        io.to(`user:${to}`).emit('notification:unread_count', { unreadCount });
      } catch (err) {
        console.error('Error creating notification for message:', err);
      }
    });

    socket.on('disconnect', () => {
      // cleanup happens automatically
    });
  });
};
