// permissionMiddleware.js
// Checks whether a sub-admin has required permissions in addition to role
const User = require('../models/userModel');

const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
      // Admin bypasses permission checks
      if (req.user.role === 'admin') return next();

      // Load user to check permissions
      const user = await User.findById(req.user._id).select('permissions role');
      if (!user) return res.status(403).json({ message: 'User not found' });

      if (user.role !== 'sub-admin') {
        return res.status(403).json({ message: 'Insufficient role for this operation' });
      }

      if (!Array.isArray(user.permissions) || !user.permissions.includes(permission)) {
        return res.status(403).json({ message: `Missing permission: ${permission}` });
      }

      next();
    } catch (err) {
      console.error('Permission middleware error', err);
      return res.status(500).json({ message: 'Permission check failed' });
    }
  };
};

module.exports = { requirePermission };
