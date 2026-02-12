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

      // Quick check: attempt to start a session to detect transaction support.
      try {
        const session = await mongoose.startSession();
        session.endSession();
        console.log('ℹ️ MongoDB supports sessions/transactions');
        process.env.MONGO_SUPPORTS_TRANSACTIONS = 'true';
      } catch (sessErr) {
        console.warn('⚠️ MongoDB does not appear to support sessions/transactions');
        process.env.MONGO_SUPPORTS_TRANSACTIONS = 'false';
      }

      return;
    } catch (error) {
      console.error('❌ MongoDB connection error:', error.message);
      console.warn('Falling back to in-memory MongoDB (development only).');
    }
  } else {
    if (process.env.NODE_ENV === 'production') {
      console.error('No MONGO_URI configured in production. Aborting startup.');
      throw new Error('MONGO_URI is required in production');
    }
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
