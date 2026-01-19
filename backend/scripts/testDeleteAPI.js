require('dotenv').config();
const axios = require('axios');
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
    
    const noteId = process.argv[2] || '695e541d65869336e594712b';
    const url = `http://localhost:5000/api/admin/notes/${noteId}`;
    
    console.log('Testing DELETE:', url);
    console.log('Token:', token);
    
    try {
      const res = await axios.delete(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ DELETE Success:', res.status, res.data);
    } catch (err) {
      console.error('❌ DELETE Failed:', err.response?.status, err.response?.data || err.message);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

run();
