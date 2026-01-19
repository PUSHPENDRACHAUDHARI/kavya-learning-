require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

const User = require('../models/userModel');
const Course = require('../models/courseModel');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kavyalearn';

async function connect() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB for seeding');
}

async function seed() {
  try {
    await connect();

    // Create demo instructor if not exists
    // Use a valid-looking email (must match the backend email regex)
    const demoInstructorEmail = 'demo-instructor@example.com';
    let instructor = await User.findOne({ email: demoInstructorEmail });
    if (!instructor) {
      const hashed = await bcrypt.hash('password123', 10);
      instructor = await User.create({
        fullName: 'Demo Instructor',
        email: demoInstructorEmail,
        password: hashed,
        role: 'instructor'
      });
      console.log('Created demo instructor:', instructor._id.toString());
    } else {
      console.log('Demo instructor already exists:', instructor._id.toString());
    }

    // Create demo student if not exists
    const demoStudentEmail = 'demo-student@example.com';
    let student = await User.findOne({ email: demoStudentEmail });
    if (!student) {
      const hashed = await bcrypt.hash('studentpass', 10);
      student = await User.create({
        fullName: 'Demo Student',
        email: demoStudentEmail,
        password: hashed,
        role: 'student'
      });
      console.log('Created demo student:', student._id.toString());
    } else {
      console.log('Demo student already exists:', student._id.toString());
    }

    // Courses to seed (use same _id values referenced in frontend fallback)
    const demoCourses = [
      { _id: '64a1f5e2b6c4a2d1f0e9b001', title: 'Complete Ethical Hacking Course', price: 519, duration: '8 hours', category: 'Security', description: 'Demo Ethical Hacking course' },
      { _id: '64a1f5e2b6c4a2d1f0e9b002', title: 'Advanced Networking with CISCO (CCNA)', price: 519, duration: '8 hours', category: 'Networking', description: 'Demo CCNA course' },
      { _id: '64a1f5e2b6c4a2d1f0e9b003', title: 'Cyber Forensics Masterclass with Hands on learning', price: 519, duration: '8 hours', category: 'Forensics', description: 'Demo Forensics course' },
      { _id: '64a1f5e2b6c4a2d1f0e9b004', title: 'Computer Networking Course', price: 519, duration: '8 hours', category: 'Networking', description: 'Demo Computer Networking' },
      { _id: '64a1f5e2b6c4a2d1f0e9b005', title: 'Computer Hardware', price: 519, duration: '6 hours', category: 'Hardware', description: 'Demo Hardware course' }
    ];

    for (const c of demoCourses) {
      const existing = await Course.findById(c._id).exec();
      if (existing) {
        console.log('Course exists:', existing.title, existing._id.toString());
        continue;
      }

      // Create course with required fields
      const newCourse = new Course({
        _id: new mongoose.Types.ObjectId(c._id),
        title: c.title,
        description: c.description || c.title,
        instructor: instructor._id,
        thumbnail: '',
        lessons: [],
        enrolledStudents: [],
        price: c.price || 0,
        duration: c.duration || '1 hour',
        level: 'Beginner',
        category: c.category || 'General',
        isPublished: true
      });

      await newCourse.save();
      console.log('Created course:', newCourse.title, newCourse._id.toString());
    }

    console.log('\nSeeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err.message || err);
    process.exit(1);
  }
}

seed();
