require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

const User = require('../models/userModel');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kavyalearn';

async function connect() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB for seeding parent');
}

async function seedParent() {
  try {
    await connect();

    const demoStudentEmail = 'demo-student@example.com';
    const demoParentEmail = 'demo-parent@example.com';

    const student = await User.findOne({ email: demoStudentEmail });
    if (!student) {
      console.error(`Demo student not found (${demoStudentEmail}). Run seedDemoData.js first.`);
      process.exit(1);
    }

    let parent = await User.findOne({ email: demoParentEmail });
    if (!parent) {
      const hashed = await bcrypt.hash('parentpass', 10);
      parent = await User.create({
        fullName: 'Demo Parent',
        email: demoParentEmail,
        password: hashed,
        role: 'parent',
        children: [student._id]
      });
      console.log('Created demo parent:', parent._id.toString());
    } else {
      console.log('Demo parent already exists:', parent._id.toString());
      parent.children = parent.children || [];
      if (!parent.children.some(id => id.toString() === student._id.toString())) {
        parent.children.push(student._id);
        await parent.save();
        console.log('Linked demo student to existing parent.');
      } else {
        console.log('Demo student already linked to parent.');
      }
    }

    console.log('Done. Parent email:', demoParentEmail, 'password: parentpass');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding demo parent:', err.message || err);
    process.exit(1);
  }
}

seedParent();
