require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/userModel');
const Course = require('../models/courseModel');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kavyalearn';

async function connect() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB for cleanup');
}

async function cleanup() {
  try {
    await connect();

    // Emails and course ids used by seed script
    const instructorEmail = 'demo-instructor@example.com';
    const studentEmail = 'demo-student@example.com';

    const courseIds = [
      '64a1f5e2b6c4a2d1f0e9b001',
      '64a1f5e2b6c4a2d1f0e9b002',
      '64a1f5e2b6c4a2d1f0e9b003',
      '64a1f5e2b6c4a2d1f0e9b004',
      '64a1f5e2b6c4a2d1f0e9b005'
    ];

    // Remove demo courses
    const rmCourses = await Course.deleteMany({ _id: { $in: courseIds.map(id => mongoose.Types.ObjectId(id)) } });
    console.log('Deleted courses:', rmCourses.deletedCount);

    // Remove demo users
    const rmInstructor = await User.deleteOne({ email: instructorEmail });
    const rmStudent = await User.deleteOne({ email: studentEmail });
    console.log('Deleted instructor:', rmInstructor.deletedCount);
    console.log('Deleted student:', rmStudent.deletedCount);

    console.log('Cleanup complete');
    process.exit(0);
  } catch (err) {
    console.error('Cleanup error:', err.message || err);
    process.exit(1);
  }
}

cleanup();
