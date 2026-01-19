// Script to add sample notifications for testing
const mongoose = require('mongoose');
const path = require('path');
const Notification = require('../models/notificationModel');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function seedNotifications() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Get a sample user ID (using the demo student user)
    const User = require('../models/userModel');
    const demoUser = await User.findOne({ email: 'demo@example.com' });
    
    if (!demoUser) {
      console.log('Demo user not found. Please create a user first.');
      return;
    }

    const userId = demoUser._id;

    // Delete existing notifications for this user
    await Notification.deleteMany({ userId });
    console.log('Cleared existing notifications');

    // Create sample notifications
    const sampleNotifications = [
      {
        userId,
        title: 'Welcome to KavyaLearn',
        message: 'Your account has been successfully created. Start exploring courses today!',
        type: 'general',
        route: '/courses',
        unread: true,
      },
      {
        userId,
        title: 'New Course: Advanced Python',
        message: 'A new course on Advanced Python programming is now available. Check it out!',
        type: 'course',
        route: '/courses',
        unread: true,
      },
      {
        userId,
        title: 'Assignment Due Soon',
        message: 'Your JavaScript assignment is due in 3 days. Start working on it now.',
        type: 'assignment',
        route: '/assignments',
        unread: true,
      },
      {
        userId,
        title: 'Achievement Unlocked!',
        message: 'Congratulations! You have completed 5 courses. You are now an expert!',
        type: 'achievement',
        route: '/achievements',
        unread: false,
      },
      {
        userId,
        title: 'Live Session Tomorrow',
        message: 'Your scheduled live session on Web Development starts tomorrow at 3 PM.',
        type: 'event',
        route: '/events',
        unread: false,
      },
    ];

    const created = await Notification.insertMany(sampleNotifications);
    console.log(`Created ${created.length} sample notifications`);

    console.log('Sample notifications:');
    created.forEach(notif => {
      console.log(`- ${notif.title} (unread: ${notif.unread})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error seeding notifications:', error);
    process.exit(1);
  }
}

seedNotifications();
