const Note = require('../models/noteModel');
const Enrollment = require('../models/enrollmentModel');
const Course = require('../models/courseModel');
const { uploadToCloudinary } = require('../config/cloudinary');
const cloudinary = require('cloudinary').v2;

// Upload a note (admin only)
exports.uploadNote = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const buffer = req.file.buffer;
    // Upload to Cloudinary as raw (auto detection)
    const result = await uploadToCloudinary(buffer, { resource_type: 'auto', folder: 'notes' });

    const noteData = {
      title: req.body.title || req.file.originalname,
      filename: req.file.originalname,
      publicId: result.public_id,
      url: result.secure_url,
      mimeType: req.file.mimetype,
      uploadedBy: req.user._id
    };

    // Optional visibility controls passed from admin form
    if (req.body.instructorId) noteData.instructor = req.body.instructorId;
    if (req.body.subjectId) noteData.subject = req.body.subjectId;

    const note = new Note(noteData);

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
    // By default, admin list should show notes uploaded by the requesting admin only
    const notes = await Note.find({ uploadedBy: req.user._id }).populate('uploadedBy', 'fullName email').sort({ createdAt: -1 });
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

    // Authorization: allow deletion only if requester uploaded the note or is an admin
    const requesterRole = req.user && (req.user.role || req.user.userRole || '');
    const isAdmin = String(requesterRole).toLowerCase() === 'admin';
    if (!isAdmin && String(note.uploadedBy) !== String(req.user._id)) {
      console.warn('Unauthorized delete attempt by', req.user._id);
      return res.status(403).json({ message: 'Not authorized to delete this note' });
    }

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

// List notes uploaded by the requesting user (used by instructors and admins wanting to see their own notes)
exports.listOwnNotes = async (req, res) => {
  try {
    // Admins/sub-admins: show notes uploaded by the requesting admin only
    const role = (req.user && (req.user.role || req.user.userRole || '')).toString().toLowerCase();
    if (role === 'admin' || role === 'sub-admin') {
      const notes = await Note.find({ uploadedBy: req.user._id })
        .populate('uploadedBy', 'fullName email')
        .populate('instructor', 'fullName email')
        .populate('subject', 'title')
        .sort({ createdAt: -1 });
      return res.json({ data: notes });
    }

    // Instructors: return notes that are either explicitly assigned to this instructor,
    // uploaded by this instructor, assigned to any of their courses, or global (no instructor and no subject).
    if (role === 'instructor') {
      // fetch instructor's course IDs
      const courses = await Course.find({ instructor: req.user._id }).select('_id').lean();
      const courseIds = courses.map(c => c._id).filter(Boolean);

      const orConditions = [];
      orConditions.push({ instructor: req.user._id });
      orConditions.push({ uploadedBy: req.user._id });
      if (courseIds.length) orConditions.push({ subject: { $in: courseIds } });
      // global notes (visible to everyone)
      orConditions.push({ instructor: null, subject: null });

      const notes = await Note.find({ $or: orConditions })
        .populate('uploadedBy', 'fullName email')
        .populate('instructor', 'fullName email')
        .populate('subject', 'title')
        .sort({ createdAt: -1 });
      return res.json({ data: notes });
    }

    // Fallback: for other roles, return only notes uploaded by the user
    const notes = await Note.find({ uploadedBy: req.user._id })
      .populate('uploadedBy', 'fullName email')
      .populate('instructor', 'fullName email')
      .populate('subject', 'title')
      .sort({ createdAt: -1 });
    res.json({ data: notes });
  } catch (err) {
    console.error('listOwnNotes error', err);
    res.status(500).json({ message: 'Failed to list notes' });
  }
};

// List notes for students
exports.listStudentNotes = async (req, res) => {
  try {
    const studentId = req.user && req.user._id;

    // Get student's enrolled course IDs
    const enrollments = await Enrollment.find({ studentId }).select('courseId').lean();
    const courseIds = enrollments.map(e => e.courseId).filter(Boolean);

    // Get instructors for those courses (students of these instructors)
    let instructorIds = [];
    if (courseIds.length) {
      const courses = await Course.find({ _id: { $in: courseIds } }).select('instructor').lean();
      instructorIds = courses.map(c => c.instructor).filter(Boolean);
    }

    // Build query: include global notes (no instructor & no subject) OR notes matching student's instructor assignments OR student's enrolled courses
    const orConditions = [];
    orConditions.push({ instructor: null, subject: null });
    if (instructorIds.length) orConditions.push({ instructor: { $in: instructorIds } });
    if (courseIds.length) orConditions.push({ subject: { $in: courseIds } });

    const notes = await Note.find({ $or: orConditions }).select('title url mimeType createdAt uploadedBy instructor subject').populate('uploadedBy', 'fullName email').sort({ createdAt: -1 });
    res.json({ data: notes });
  } catch (err) {
    console.error('listStudentNotes error', err);
    res.status(500).json({ message: 'Failed to list notes' });
  }
};
