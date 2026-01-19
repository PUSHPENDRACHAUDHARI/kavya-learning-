require('dotenv').config();
const mongoose = require('mongoose');
const Note = require('../models/noteModel');

const uri = process.env.MONGO_URI || process.env.MONGO_URL || process.env.DB_URI || process.env.MONGODB_URI;

async function run() {
  try {
    if (!uri) {
      console.error('No Mongo URI in env');
      process.exit(1);
    }
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to DB');

    const id = process.argv[2];
    if (id) {
      const note = await Note.findById(id);
      console.log('Found note:', note);
      const del = await Note.findByIdAndDelete(id);
      console.log('Deleted note result:', del);
    } else {
      const notes = await Note.find().limit(10).sort({ createdAt: -1 });
      console.log('Recent notes:');
      notes.forEach(n => console.log(n._id.toString(), '-', n.title, '-', n.filename));
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
