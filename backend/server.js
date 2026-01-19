// server.js
const express = require("express");
// Touch: update timestamp to force nodemon restart when routes/controllers change
const dotenv = require("dotenv");
const path = require("path");
const fs = require('fs');
const cors = require("cors");
const connectDB = require("./config/db");
const morgan = require('morgan');

// Load env vars from backend/.env
dotenv.config({ path: path.join(__dirname, '.env') });

// Connect to database
connectDB();

// Initialize express
const app = express();



// Middleware
// Increase request body size to allow base64-encoded attachments and large video uploads
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// CORS configuration - allow frontend origin(s) and handle credentials
// Read FRONTEND_URL (single URL) or FRONTEND_URLS (comma-separated) from env.
const frontendFromEnv = process.env.FRONTEND_URL || process.env.FRONTEND_URLS || '';
const frontendList = frontendFromEnv
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const frontendDefault = frontendList.length ? frontendList[0] : 'http://localhost:5173';
const allowedOrigins = [
  ...frontendList,
  frontendDefault,
  'http://localhost:5173',
  'http://localhost:5174',
  
];

const allowAll = String(process.env.ALLOW_ALL_ORIGINS || '').toLowerCase() === 'true';

if (allowAll) {
  console.warn('⚠️  CORS is currently configured to allow all origins (ALLOW_ALL_ORIGINS=true).');
}

console.log('➡️  CORS allowed origins:', allowedOrigins);
console.log('➡️  FRONTEND_URL(s) from env:', frontendFromEnv || '<none>');
console.log('➡️  ALLOW_ALL_ORIGINS:', allowAll);

const corsOptions = {
  origin: (origin, callback) => {
    // allow requests with no origin (like curl or server-to-server)
    if (!origin) return callback(null, true);

    // If allowAll is enabled, accept any origin (useful for quick testing only)
    if (allowAll) return callback(null, true);

    // Accept exact matches from allowedOrigins
    if (allowedOrigins.includes(origin)) return callback(null, true);

    // Not allowed — include the origin in the error message for diagnostics
    const err = new Error(`Not allowed by CORS — origin: ${origin}`);
    console.warn('⛔ CORS blocked request from origin:', origin);
    return callback(err);
  },
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
// Handle preflight requests by invoking CORS middleware for OPTIONS
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return cors(corsOptions)(req, res, next);
  }
  next();
});

// Fallback CORS/logger for local development and debugging.
// This ensures that when origin is localhost:5173 we explicitly send
// Access-Control headers even if something upstream interferes.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    console.log('🔎 Incoming Origin header:', origin);
  }

  // If request comes from local frontend during development, always set CORS headers
  if (origin === 'http://localhost:5173' || origin === 'http://127.0.0.1:5173') {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
  }

  next();
});

app.use(morgan('dev')); // HTTP request logger

// Routes
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const userRoutes = require('./routes/userRoutes');
const eventRoutes = require('./routes/eventRoutes');
const achievementRoutes = require('./routes/achievementRoutes');
const lessonRoutes = require('./routes/lessonRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const quizRoutes = require('./routes/quizRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const aiTutorRoutes = require('./routes/aiTutorRoutes');
const adminRoutes = require('./routes/adminRoutes');
const featureFlagRoutes = require('./routes/featureFlagRoutes');
const progressRoutes = require('./routes/progressRoutes');
const instructorRoutes = require('./routes/instructorRoutes');
const studentRoutesFile = require('./routes/studentRoutes');
const enrollmentRoutes = require('./routes/enrollmentRoutes');
const parentRoutes = require('./routes/parentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const searchRoutes = require('./routes/searchRoutes');
const messageRoutes = require('./routes/messageRoutes');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ai', aiTutorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/flags', featureFlagRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/instructor', instructorRoutes);
app.use('/api/student', studentRoutesFile);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/parents', parentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/uploads', uploadRoutes);

// Ensure uploads folder exists and serve statically so uploaded PDFs are accessible
const uploadsDir = path.join(__dirname, 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  app.use('/uploads', express.static(uploadsDir));
  console.log('➡️ Serving uploaded files from', uploadsDir);
} catch (e) {
  console.warn('Could not create or serve uploads directory:', e.message || e);
}

// Search
app.use('/api/search', searchRoutes);

// Public Announcements endpoint (accessible to all authenticated users)
const Announcement = require('./models/announcementModel');
app.get('/api/announcements', require('./middleware/authMiddleware').protect, async (req, res) => {
  try {
    const announcements = await Announcement.find({})
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: 1 })
      .limit(100);
    res.json(announcements);
  } catch (err) {
    console.error('Error fetching announcements:', err);
    res.status(500).json({ message: 'Error fetching announcements' });
  }
});

// Welcome route - serve frontend index if present
app.get("/", (req, res) => {
  const indexHtml = path.join(__dirname, '..', 'frontend', 'dist', 'index.html');
  if (fs.existsSync(indexHtml)) {
    return res.sendFile(indexHtml);
  }
  res.send("KavyaLearn API is running...");
});

// Serve static frontend if it exists (production builds)
const distPath = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(distPath)) {
  console.log('➡ Serving frontend from', distPath);
  app.use(express.static(distPath));
  // For SPA client-side routing, send index.html for any non-API GET request.
  // Use a middleware rather than app.get('*') to avoid path-to-regexp parsing issues on some Node/express versions.
  app.use((req, res, next) => {
    try {
      if (req.method !== 'GET') return next();
      if (req.path.startsWith('/api')) return next();
      const indexHtml = path.join(distPath, 'index.html');
      if (fs.existsSync(indexHtml)) {
        return res.sendFile(indexHtml);
      }
      return next();
    } catch (err) {
      console.error('Error serving SPA index:', err);
      return next(err);
    }
  });
}

// 404 handler
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

// Error handling middleware
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`
🚀 Server running on port ${PORT}
👉 API Documentation: http://localhost:${PORT}/api-docs
📝 MongoDB URI: ${process.env.MONGO_URI}
  `);
});

// Setup Socket.IO for real-time messaging
try {
  const { Server } = require('socket.io');
  const io = new Server(server, {
    cors: {
      origin: allowAll ? '*' : allowedOrigins,
      methods: ['GET', 'POST']
    }
  });

  const { setIo } = require('./sockets/io');
  setIo(io);
  // attach socket handlers
  require('./sockets/messageSocket')(io);
  console.log('➡️ Socket.IO initialized');
} catch (err) {
  console.warn('Socket.IO not initialized:', err?.message || err);
}

// Graceful shutdown handler for SIGTERM (Railway, Docker, etc.)
const gracefulShutdown = async (signal) => {
  console.log(`\n⚠️  ${signal} received: Starting graceful shutdown...`);
  
  // Stop accepting new connections
  server.close(async () => {
    console.log('✅ HTTP server closed');
    
    try {
      // Close database connection
      const mongoose = require('mongoose');
      await mongoose.connection.close();
      console.log('✅ MongoDB connection closed');
      
      console.log('👋 Graceful shutdown completed');
      process.exit(0);
    } catch (err) {
      console.error('❌ Error during shutdown:', err);
      process.exit(1);
    }
  });
  
  // Force shutdown after 30 seconds if graceful shutdown hangs
  setTimeout(() => {
    console.error('⏰ Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  gracefulShutdown('UNHANDLED_REJECTION');
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});
