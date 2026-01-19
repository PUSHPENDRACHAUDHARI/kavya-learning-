/**
 * Test script to add enrollment for kartik user
 * Run: node backend/scripts/testEnrollment.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/userModel');
const Course = require('../models/courseModel');

async function testEnrollment() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Find kartik user by email
        const user = await User.findOne({ email: 'kartik@gmail.com' });
        if (!user) {
            console.log('❌ User not found. Try with different email.');
            console.log('Creating test user kartik...');
            
            // Create kartik user if doesn't exist
            const newUser = await User.create({
                fullName: 'Kartik',
                email: 'kartik@gmail.com',
                password: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890', // Hashed password
                role: 'student',
                enrolledCourses: [],
                totalHoursLearned: 0
            });
            console.log('✅ Created user:', newUser.email);
        }

        // Find any available course
        const course = await Course.findOne();
        if (!course) {
            console.log('❌ No courses found in database. Please add courses first.');
            process.exit(1);
        }

        console.log('📚 Found course:', course.title);

        // Check if already enrolled
        const alreadyEnrolled = user.enrolledCourses.some(
            ec => ec.course.toString() === course._id.toString()
        );

        if (alreadyEnrolled) {
            console.log('⚠️ User already enrolled in this course');
            
            // Update hours for testing
            const enrollment = user.enrolledCourses.find(
                ec => ec.course.toString() === course._id.toString()
            );
            enrollment.hoursSpent = 5.25; // Test hours
            enrollment.completionPercentage = 25;
            user.totalHoursLearned = 5.25;
            await user.save();
            
            console.log('✅ Updated enrollment hours to 5.25');
        } else {
            // Add new enrollment
            user.enrolledCourses.push({
                course: course._id,
                completedLessons: [],
                hoursSpent: 3.75,
                completionPercentage: 15,
                enrollmentDate: new Date()
            });
            user.totalHoursLearned = (user.totalHoursLearned || 0) + 3.75;

            // Add user to course's enrolledStudents
            if (!course.enrolledStudents.includes(user._id)) {
                course.enrolledStudents.push(user._id);
                await course.save();
            }

            await user.save();
            console.log('✅ Enrolled user in course:', course.title);
            console.log('✅ Added 3.75 hours to user');
        }

        // Display current stats
        const updatedUser = await User.findById(user._id).populate('enrolledCourses.course', 'title');
        console.log('\n📊 Current User Stats:');
        console.log('   Total Courses:', updatedUser.enrolledCourses.length);
        console.log('   Total Hours:', updatedUser.totalHoursLearned);
        console.log('   Courses:', updatedUser.enrolledCourses.map(ec => ({
            title: ec.course.title,
            hours: ec.hoursSpent,
            completion: ec.completionPercentage + '%'
        })));

        console.log('\n✅ Test enrollment complete! Refresh Dashboard to see changes.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

testEnrollment();
