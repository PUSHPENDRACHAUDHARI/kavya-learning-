const Note = require('../models/noteModel');
const { uploadToCloudinary } = require('../config/cloudinary');
const cloudinary = require('cloudinary').v2;

// Upload a note (admin only)
exports.uploadNote = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const buffer = req.file.buffer;
    // Upload to Cloudinary as raw (auto detection)
    const result = await uploadToCloudinary(buffer, { resource_type: 'auto', folder: 'notes' });

    const note = new Note({
      title: req.body.title || req.file.originalname,
      filename: req.file.originalname,
      publicId: result.public_id,
      url: result.secure_url,
      mimeType: req.file.mimetype,
      uploadedBy: req.user._id
    });

    await note.save();

    res.status(201).json({ message: 'Note uploaded', data: note });
  } catch (err) {
    console.error('uploadNote error', err);
    res.status(500).json({ message: 'Upload failed' });
  }
};

// List notes for admin
exports.listNotesAdmin = async (req, res) => {
  try {
    const notes = await Note.find().populate('uploadedBy', 'fullName email').sort({ createdAt: -1 });
    res.json({ data: notes });
  } catch (err) {
    console.error('listNotesAdmin error', err);
    res.status(500).json({ message: 'Failed to list notes' });
  }
};

// Delete a note (admin only)
exports.deleteNote = async (req, res) => {
  try {
    const noteId = req.params.id;
    console.log('🗑️  deleteNote called for id:', noteId);

    const note = await Note.findById(noteId);
    if (!note) {
      console.warn('Note not found, ID:', noteId);
      return res.status(404).json({ message: 'Note not found' });
    }
    console.log('✅ Note found:', note.title, 'PublicId:', note.publicId);

    // Attempt to remove from Cloudinary (if present)
    if (note.publicId) {
      try {
        console.log('📤 Attempting cloudinary destroy for publicId:', note.publicId);
        // Try as raw first (common for non-images), fallback to auto
        const destroyResult = await cloudinary.uploader.destroy(note.publicId, { resource_type: 'raw' });
        console.log('✅ Cloudinary destroy(raw) result:', destroyResult);
      } catch (e) {
        console.warn('⚠️  Cloudinary destroy(raw) failed:', e && e.message ? e.message : e);
        try {
          const destroyResult2 = await cloudinary.uploader.destroy(note.publicId, { resource_type: 'auto' });
          console.log('✅ Cloudinary destroy(auto) result:', destroyResult2);
        } catch (e2) {
          console.warn('⚠️  Cloudinary destroy(auto) also failed:', e2 && e2.message ? e2.message : e2);
        }
      }
    } else {
      console.log('ℹ️  No publicId on note, skipping cloudinary cleanup');
    }

    // Delete from DB using findByIdAndDelete for robustness
    console.log('🗂️  Deleting from DB, ID:', noteId);
    const deleted = await Note.findByIdAndDelete(noteId);
    if (!deleted) {
      console.error('❌ Failed to delete note from DB, ID:', noteId);
      return res.status(500).json({ message: 'Delete failed' });
    }

    console.log('✅ Note successfully deleted, ID:', noteId);
    res.json({ message: 'Note deleted' });
  } catch (err) {
    console.error('❌ deleteNote error:', err);
    res.status(500).json({ message: 'Delete failed', error: err.message });
  }
};

// List notes for students
exports.listStudentNotes = async (req, res) => {
  try {
    const notes = await Note.find().select('title url mimeType createdAt uploadedBy').sort({ createdAt: -1 });
    res.json({ data: notes });
  } catch (err) {
    console.error('listStudentNotes error', err);
    res.status(500).json({ message: 'Failed to list notes' });
  }
};
