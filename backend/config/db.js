// config/db.js
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const connectDB = async () => {
  // Try connecting to provided MONGO_URI first.
  const mongoUri = process.env.MONGO_URI;

  if (mongoUri) {
    try {
      const conn = await mongoose.connect(mongoUri);
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      console.error('❌ MongoDB connection error:', error.message);
      console.warn('Falling back to in-memory MongoDB (development only).');
    }
  } else {
    console.warn('No MONGO_URI configured — starting in-memory MongoDB for development.');
  }

  // Fall back to an in-memory MongoDB for local development when Docker or
  // a system MongoDB is not available. This keeps the app runnable for UI
  // and API testing without requiring additional installs.
  try {
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    console.log(`✅ In-memory MongoDB started: ${uri}`);

    // Ensure the in-memory server is stopped when the process exits.
    const shutdown = async () => {
      try {
        await mongoose.disconnect();
        await mongod.stop();
        console.log('🛑 In-memory MongoDB stopped');
      } catch (e) {
        /* ignore */
      }
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('exit', shutdown);
  } catch (err) {
    console.error('Failed to start in-memory MongoDB:', err?.message || err);
    console.warn('Continuing without MongoDB connection. Some features may not work.');
  }
};

module.exports = connectDB;
