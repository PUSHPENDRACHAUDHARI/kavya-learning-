const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const protect = async (req, res, next) => {
    try {
        // Allow preflight requests to pass through without auth
        if (req.method === 'OPTIONS') {
            return next();
        }
        // Check for token
        const authHeader = req.headers.authorization;
        console.log('Auth header:', authHeader);
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'No token provided' });
        }

        // Verify token
        const token = authHeader.split(' ')[1];
        console.log('Token received:', token);
        console.log('JWT_SECRET:', process.env.JWT_SECRET);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Decoded token:', decoded);

        // Get user with role
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }
        console.log('User found:', { id: user._id, role: user.role, modelRole: user.get('role') });

        // Set user info in request with role
        const userRole = decoded.role || user.role || 'student';
        console.log('Determined role:', userRole, 'from:', { 
            tokenRole: decoded.role,
            userRole: user.role,
            default: 'student'
        });

        req.user = {
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            role: userRole
        };
        console.log('User set in request:', req.user);

        next();
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(401).json({ message: 'Authentication failed' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        console.log('Authorization check:', {
            user: req.user,
            requiredRoles: roles,
            userRole: req.user?.role,
            hasRole: req.user?.role ? roles.includes(req.user.role) : false
        });
        
        if (!req.user || !req.user.role) {
            console.error('No user or role found in request:', req.user);
            return res.status(403).json({
                message: 'No user role found'
            });
        }

        if (!roles.includes(req.user.role)) {
            console.error('Role not authorized:', {
                userRole: req.user.role,
                allowedRoles: roles
            });
            return res.status(403).json({
                message: `User role '${req.user.role}' is not authorized to access this route`
            });
        }

        next();
    };
};

module.exports = { protect, authorize };