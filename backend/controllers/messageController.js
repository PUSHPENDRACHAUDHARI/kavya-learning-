const mongoose = require('mongoose');
const Message = require('../models/messageModel');
const User = require('../models/userModel');
const { getIo } = require('../sockets/io');

// Create a message from current user to `to`
exports.sendMessage = async (req, res) => {
  try {
    const fromId = req.user._id;
    const { to, text, attachments } = req.body;

    // Allow either text or attachments (or both)
    if (!to || (!text && (!attachments || attachments.length === 0))) {
      return res.status(400).json({ message: 'Missing `to` or `text`/`attachments`' });
    }

    // Basic validation: ensure recipient exists
    const recipient = await User.findById(to).select('_id fullName email');
    if (!recipient) return res.status(404).json({ message: 'Recipient not found' });

    const msgData = {
      from: fromId,
      to,
      text: text || '',
    };

    // Add attachments if provided
    if (attachments && attachments.length > 0) {
      // If attachments contain inline base64 `data` fields, upload them to Cloudinary
      const { uploadToCloudinary } = require('../config/cloudinary');

      const processed = await Promise.all(attachments.map(async (att) => {
        // If attachment has a data URL (base64), upload it and store the returned URL
        if (att.data && String(att.data).startsWith('data:')) {
          try {
            // data:[<mediatype>][;base64],<data>
            const matches = String(att.data).match(/^data:([^;]+);base64,(.*)$/);
            if (matches) {
              const mime = matches[1];
              const base64 = matches[2];
              const buffer = Buffer.from(base64, 'base64');
              let resource_type = 'raw';
              if (mime && mime.startsWith('image/')) resource_type = 'image';
              else if (mime && mime.startsWith('video/')) resource_type = 'video';
              const res = await uploadToCloudinary(buffer, { resource_type });
              return { url: res.secure_url || res.url, filename: att.name || res.original_filename || '', mimeType: mime || att.type || '', size: att.size || 0 };
            }
          } catch (e) {
            console.warn('Attachment upload failed for inline data:', e?.message || e);
            // Fall back to storing minimal info
            return { url: null, filename: att.name || '', mimeType: att.type || '', size: att.size || 0 };
          }
        }
        // If already a URL or no data field, store as-is
        if (att.url) return { url: att.url, filename: att.name || '', mimeType: att.type || '', size: att.size || 0 };
        return { url: null, filename: att.name || '', mimeType: att.type || '', size: att.size || 0 };
      }));

      msgData.attachments = processed;
    }

    const msg = await Message.create(msgData);
    // Emit realtime event if socket.io is available
    try {
      const io = getIo();
      if (io) {
        const payload = {
          _id: msg._id,
          from: fromId,
          to,
          text: text || '',
          attachments: msg.attachments || [],
          createdAt: msg.createdAt
        };
        io.to(`user:${to}`).emit('new_message', payload);
        io.to(`user:${fromId}`).emit('new_message', payload);
      }
    } catch (e) {
      console.warn('Failed to emit socket message', e?.message || e);
    }

    return res.status(201).json({ data: msg });
  } catch (err) {
    console.error('sendMessage error', err?.stack || err);
    return res.status(500).json({ message: 'Failed to send message', error: err?.message || String(err) });
  }
};

// Get conversation between current user and another user (userId param)
exports.getConversation = async (req, res) => {
  try {
    const me = req.user._id;
    const other = req.params.userId || req.query.userId;
    if (!other) return res.status(400).json({ message: 'Missing userId' });

    const msgs = await Message.find({
      $and: [
        {
          $or: [
            { from: me, to: other },
            { from: other, to: me },
          ]
        },
        {
          $or: [
            { deletedFor: { $exists: false } },
            { deletedFor: { $nin: [me] } }
          ]
        }
      ]
    }).sort('createdAt').lean();

    return res.json({ data: msgs });
  } catch (err) {
    console.error('getConversation error', err);
    return res.status(500).json({ message: 'Failed to load conversation' });
  }
};

// Optional: list recent conversations involving current user (brief summary)
exports.listRecent = async (req, res) => {
  try {
    const me = req.user._id;
    const meObjectId = mongoose.Types.ObjectId(String(me));
    // Aggregate per-conversation summary: other user id, last message, lastAt, unreadCount
    const pipeline = [
      { 
        $match: { 
          $and: [
            { $or: [{ from: me }, { to: me }] },
            {
              $or: [
                { deletedFor: { $exists: false } },
                { deletedFor: { $nin: [meObjectId] } }
              ]
            }
          ]
        } 
      },
      { $sort: { createdAt: -1 } },
      { $group: {
        _id: { $cond: [{ $eq: ['$from', me] }, '$to', '$from'] },
        lastMessage: { $first: '$text' },
        lastFrom: { $first: '$from' },
        lastAt: { $first: '$createdAt' }
      } },
      // Count unread messages per conversation (to me and read: false, not deleted)
      { $lookup: {
        from: 'messages',
        let: { otherId: '$_id' },
        pipeline: [
          { 
            $match: { 
              $expr: { 
                $and: [ 
                  { $eq: ['$from', '$$otherId'] }, 
                  { $eq: ['$to', meObjectId] }, 
                  { $eq: ['$read', false] },
                  { $not: { $in: [meObjectId, '$deletedFor'] } }
                ] 
              } 
            } 
          },
          { $count: 'count' }
        ],
        as: 'unreadInfo'
      } },
      { $addFields: { unreadCount: { $ifNull: [ { $arrayElemAt: ['$unreadInfo.count', 0] }, 0 ] } } },
      { $project: { _id: 1, lastMessage: 1, lastFrom: 1, lastAt: 1, unreadCount: 1 } },
      { $sort: { lastAt: -1 } },
      { $limit: 50 }
    ];

    const summaries = await Message.aggregate(pipeline);
    return res.json({ data: summaries });
  } catch (err) {
    console.error('listRecent error', err);
    return res.status(500).json({ message: 'Failed to list recent conversations' });
  }
};

// Mark messages from a specific user as read (messages where from=other and to=me)
exports.markRead = async (req, res) => {
  try {
    const me = req.user._id;
    const other = req.params.userId;
    if (!other) return res.status(400).json({ message: 'Missing userId' });

    const result = await Message.updateMany({ from: other, to: me, read: false }, { $set: { read: true } });
    return res.json({ message: 'Marked read', modifiedCount: result.modifiedCount || result.nModified || 0 });
  } catch (err) {
    console.error('markRead error', err);
    return res.status(500).json({ message: 'Failed to mark messages read' });
  }
};

// Delete a message for the current user (per-user deletion)
exports.deleteMessage = async (req, res) => {
  try {
    const me = req.user._id;
    const messageId = req.params.messageId;
    if (!messageId) return res.status(400).json({ message: 'Missing messageId' });

    // Find the message and ensure the user is either sender or receiver
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    // Check if user is part of this conversation
    const isSender = String(message.from) === String(me);
    const isReceiver = String(message.to) === String(me);
    
    if (!isSender && !isReceiver) {
      return res.status(403).json({ message: 'You do not have permission to delete this message' });
    }

    // Add user to deletedFor array if not already present
    if (!message.deletedFor || !message.deletedFor.includes(me)) {
      await Message.findByIdAndUpdate(messageId, {
        $addToSet: { deletedFor: me }
      });
    }

    return res.json({ message: 'Message deleted successfully' });
  } catch (err) {
    console.error('deleteMessage error', err);
    return res.status(500).json({ message: 'Failed to delete message' });
  }
};
