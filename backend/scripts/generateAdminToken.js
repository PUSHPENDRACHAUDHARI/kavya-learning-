require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');

const uri = process.env.MONGO_URI || process.env.MONGO_URL || process.env.DB_URI || process.env.MONGODB_URI;

async function run() {
  try {
    if (!uri) {
      console.error('No Mongo URI in env');
      process.exit(1);
    }
    await mongoose.connect(uri);
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.error('No admin user found');
      process.exit(1);
    }
    const token = jwt.sign({ id: admin._id.toString(), role: admin.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    console.log('Admin user:', admin.email, admin._id.toString());
    console.log('Token:', token);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
