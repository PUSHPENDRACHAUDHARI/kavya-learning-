const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Subdocument schema for a student's enrolled courses.
// This matches how other controllers (e.g. courseController, userController)
// already read/write progress information.
const enrolledCourseSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    completedLessons: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson',
      },
    ],
    hoursSpent: {
      type: Number,
      default: 0,
    },
    enrollmentDate: {
      type: Date,
      default: Date.now,
    },
    completionPercentage: {
      type: Number,
      default: 0,
    },
    // When the completion reaches 100%, a certificate becomes available.
    // We track when the learner actually downloads it.
    certificateDownloadedAt: {
      type: Date,
    },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['student', 'parent', 'instructor', 'admin', 'sub-admin'],
      default: 'student',
      required: true,
    },
    phone: { type: String },
    gender: { type: String, enum: ['male', 'female', 'other'], default: null },
    bio: { type: String },
    location: { type: String },
    address: {
      street: String,
      city: String,
      state: String,
      zip: String,
      country: String,
    },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    // New field to represent whether user is allowed to access the system
    // 'Active' means normal; 'Blocked' means administrator has blocked the user
    user_status: { type: String, enum: ['Active', 'Blocked'], default: 'Active' },
    avatar: { type: String },
    // Achievement streak system
    lastLoginDate: { type: Date },
    streakDays: { type: Number, default: 0 },
    // For parents: list of student ids
    children: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // For instructors: assigned courses
    assignedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    // For sub-admins: permissions list
    permissions: [{ type: String }],

    // Learning analytics & progress
    totalHoursLearned: { type: Number, default: 0 },
    // Per-user weekly summary stats (attended classes, study hours, upcoming classes)
    weeklyStats: {
      attended: { type: Number, default: 0 },
      studyHours: { type: Number, default: 0 },
      upcoming: { type: Number, default: 0 },
    },
    achievements: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Achievement' }],

    // Per-course enrollment + completion progress for students
    enrolledCourses: [enrolledCourseSchema],
    
    // Track if this is user's first login
    firstLogin: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Remove sensitive fields when converting to JSON
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
