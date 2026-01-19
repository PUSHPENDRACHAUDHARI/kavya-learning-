const { uploadToCloudinary } = require('../config/cloudinary');

// Upload a single file (PDF/doc) and return URL
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) return res.status(400).json({ message: 'No file uploaded' });

    // Choose resource_type based on the uploaded file's mimetype
    const mime = (req.file.mimetype || '').toLowerCase();
    let resource_type = 'raw';
    if (mime.startsWith('image/')) resource_type = 'image';
    else if (mime.startsWith('video/')) resource_type = 'video';
    const options = { resource_type };
    const result = await uploadToCloudinary(req.file.buffer, options);

    res.json({ url: result.secure_url || result.url, public_id: result.public_id, original_filename: result.original_filename });
  } catch (err) {
    console.error('Upload error', err?.stack || err);
    res.status(500).json({ message: err.message || 'Upload failed', error: err?.message || String(err) });
  }
};
