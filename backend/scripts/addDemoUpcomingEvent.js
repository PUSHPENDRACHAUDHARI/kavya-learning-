require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

const Event = require('../models/eventModel');
const User = require('../models/userModel');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kavyalearn';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Find demo users
  const student = await User.findOne({ email: 'demo-student@example.com' });
  const instructor = await User.findOne({ email: 'demo-instructor@example.com' });

  if (!student || !instructor) {
    console.error('Demo users not found. Run seed script first.');
    process.exit(1);
  }

  // Create an event scheduled 2 days from now
  const date = new Date();
  date.setDate(date.getDate() + 2);
  date.setHours(10, 0, 0, 0);

  const newEvent = new Event({
    title: 'Demo Upcoming Class',
    instructor: instructor._id,
    type: 'Live Class',
    date: date,
    startTime: '10:00 AM',
    endTime: '11:00 AM',
    location: 'Demo Room',
    maxStudents: 50,
    enrolledStudents: [student._id],
    status: 'Scheduled'
  });

  await newEvent.save();
  console.log('Created demo upcoming event:', newEvent._id.toString());
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
