require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/userModel');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kavyalearn';

async function run() {
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    const email = 'demo-student@example.com';
    const plain = 'studentpass';

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      console.log('Demo student not found');
      process.exit(1);
    }

    user.password = plain; // leave plain so pre-save hook will hash it
    await user.save();

    console.log('Demo student password reset for', email);
    process.exit(0);
  } catch (err) {
    console.error('Error resetting password:', err.message || err);
    process.exit(1);
  }
}

run();
