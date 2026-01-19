import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import { createAnnouncement, listAnnouncements, deleteAnnouncement } from '../../api/announcementService';
import './AdminAnnouncements.css';

const AdminAnnouncements = () => {
  const [inputText, setInputText] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [video, setVideo] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [editImage, setEditImage] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [editVideo, setEditVideo] = useState(null);
  const [editVideoPreview, setEditVideoPreview] = useState(null);
  const [editFile, setEditFile] = useState(null);
  const [editFilePreview, setEditFilePreview] = useState(null);

  // Load announcements from backend on mount
  useEffect(() => {
    loadAnnouncements();
    // Refresh announcements every 5 seconds for real-time updates
    const interval = setInterval(loadAnnouncements, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadAnnouncements = async () => {
    try {
      const data = await listAnnouncements();
      let announcementData = Array.isArray(data) ? data : [];
      
      // Remove duplicates by ID - keep only unique announcements
      const uniqueMap = new Map();
      const seenIds = new Set();
      
      announcementData.forEach(msg => {
        const id = msg._id || msg.id;
        if (id) {
          // Convert ID to string to ensure consistent comparison
          const idStr = String(id);
          if (!seenIds.has(idStr)) {
            seenIds.add(idStr);
            uniqueMap.set(idStr, msg);
          }
        }
      });
      
      // Convert Map back to array and sort by creation date (newest first)
      announcementData = Array.from(uniqueMap.values()).sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA; // Descending order (newest first)
      });
      
      setMessages(announcementData);
      setError(null);
    } catch (err) {
      console.error('Error loading announcements:', err);
      setError('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(file);
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVideo(file);
        setVideoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFile(file);
      setFilePreview({
        name: file.name,
        size: (file.size / 1024).toFixed(2) + ' KB'
      });
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
    setImagePreview(null);
  };

  const handleRemoveVideo = () => {
    setVideo(null);
    setVideoPreview(null);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setFilePreview(null);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() && !imagePreview && !videoPreview && !filePreview) {
      return;
    }

    try {
      setSending(true);

      const announcementData = {
        title: inputText.substring(0, 100), // Use first 100 chars as title
        message: inputText.trim(),
        targetRole: 'all' // Default to all users
      };

      // If no title/message provided but media exists, provide a fallback title
      if ((!announcementData.title || announcementData.title.trim() === '') && (!announcementData.message || announcementData.message.trim() === '')) {
        announcementData.title = (image && image.name) || (video && video.name) || (file && file.name) || 'Announcement';
      }

      // Upload selected media first (if any) and attach returned URLs
      const { uploadFile } = await import('../../api/announcementService');
      if (image) {
        try {
          const u = await uploadFile(image);
          if (u && (u.url || u.secure_url)) {
            announcementData.image = u.url || u.secure_url;
            announcementData.imageName = image.name;
            announcementData.imageMime = image.type;
          }
        } catch (e) {
          console.warn('Image upload failed', e);
        }
      }

      if (video) {
        try {
          const u = await uploadFile(video);
          if (u && (u.url || u.secure_url)) {
            announcementData.video = u.url || u.secure_url;
            announcementData.videoName = video.name;
            announcementData.videoMime = video.type;
          }
        } catch (e) {
          console.warn('Video upload failed', e);
        }
      }

      if (file) {
        try {
          const u = await uploadFile(file);
          if (u && (u.url || u.secure_url)) {
            announcementData.file = u.url || u.secure_url;
            announcementData.fileName = file.name;
            announcementData.fileMime = file.type;
          }
        } catch (e) {
          console.warn('File upload failed', e);
        }
      }

      // Send to backend
      await createAnnouncement(announcementData);

      // Reload announcements from API to ensure no duplicates and get latest data
      await loadAnnouncements();

      // Reset inputs
      setInputText('');
      setImage(null);
      setImagePreview(null);
      setVideo(null);
      setVideoPreview(null);
      setFile(null);
      setFilePreview(null);
      setError(null);

      // Show brief success feedback
      setTimeout(() => setSending(false), 300);
    } catch (err) {
      console.error('Error sending message:', err);
      setSending(false);
      setError('Failed to send announcement');
      alert('Failed to send announcement: ' + (err.message || 'Unknown error'));
    }
  };

  const handleDeleteMessage = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    try {
      await deleteAnnouncement(id);
      const updatedMessages = messages.filter(msg => msg._id !== id);
      setMessages(updatedMessages);
      setError(null);
    } catch (err) {
      console.error('Error deleting announcement:', err);
      setError('Failed to delete announcement');
      alert('Failed to delete announcement');
    }
  };

  const handleEditMessage = (msg) => {
    // Edit functionality can be implemented in future
    setEditingId(msg._id);
    setEditText(msg.message);
    setEditImagePreview(null);
    setEditImage(null);
    setEditVideoPreview(null);
    setEditVideo(null);
    setEditFilePreview(null);
    setEditFile(null);
  };

  const handleEditImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImage(file);
        setEditImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditVideo(file);
        setEditVideoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEditFile(file);
      setEditFilePreview({
        name: file.name,
        size: (file.size / 1024).toFixed(2) + ' KB'
      });
    }
  };

  const handleRemoveEditImage = () => {
    setEditImage(null);
    setEditImagePreview(null);
  };

  const handleRemoveEditVideo = () => {
    setEditVideo(null);
    setEditVideoPreview(null);
  };

  const handleRemoveEditFile = () => {
    setEditFile(null);
    setEditFilePreview(null);
  };

  const handleSaveEdit = () => {
    if (!editText.trim() && !editImagePreview && !editVideoPreview && !editFilePreview) {
      return;
    }

    const updatedMessages = messages.map(msg => {
      if (msg._id === editingId) {
        return {
          ...msg,
          text: editText.trim(),
          image: editImagePreview,
          video: editVideoPreview,
          file: editFilePreview,
          edited: true,
          editedAt: new Date().toISOString()
        };
      }
      return msg;
    });

    setMessages(updatedMessages);
    localStorage.setItem('adminAnnouncements', JSON.stringify(updatedMessages));
    cancelEdit();
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
    setEditImage(null);
    setEditImagePreview(null);
    setEditVideo(null);
    setEditVideoPreview(null);
    setEditFile(null);
    setEditFilePreview(null);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSendMessage();
    }
  };

  return (
    <AppLayout showGreeting={false}>
      <div className="admin-announcements-page">
        <h2>Admin Announcements</h2>

        <div className="chatbox-container">
          {/* Messages Display Area */}
          <div className="messages-area">
            {loading ? (
              <div className="loading">Loading announcements...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : messages.length === 0 ? (
              <div className="no-messages">No announcements yet. Start typing below...</div>
            ) : (
              [...messages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).map((msg, idx) => (
                <div key={msg._id || msg.id || `ann-${idx}`} className="message admin-message">
                  <div className="message-header">
                    <span className="admin-badge">Admin</span>
                    <span className="message-time">
                      {new Date(msg.createdAt).toLocaleString()}
                    </span>
                    <div className="message-actions">
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteMessage(msg._id)}
                        title="Delete announcement"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  {msg.message && <div className="message-text">{msg.message}</div>}
                  {msg.image && (
                    <div className="message-media">
                      <img src={msg.image} alt={msg.imageName || 'Announcement image'} className="message-image" />
                    </div>
                  )}
                  {msg.video && (
                    <div className="message-media">
                      <video src={msg.video} controls className="message-video" />
                    </div>
                  )}
                  {msg.file && (
                    <div className="message-media">
                      <a href={msg.file} target="_blank" rel="noreferrer" className="message-file-link">{msg.fileName || 'Attachment'}</a>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Input Area */}
          <div className="input-area">
            <textarea
              className="message-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type announcement message here... (Ctrl+Enter to send)"
              rows={4}
            />

            {imagePreview && (
              <div className="input-image-preview">
                <img src={imagePreview} alt="Preview" />
                <button
                  type="button"
                  className="remove-preview-btn"
                  onClick={handleRemoveImage}
                >
                  ✕
                </button>
              </div>
            )}

            {videoPreview && (
              <div className="input-video-preview">
                <video src={videoPreview} controls />
                <button
                  type="button"
                  className="remove-preview-btn"
                  onClick={handleRemoveVideo}
                >
                  ✕
                </button>
              </div>
            )}

            {filePreview && (
              <div className="input-file-preview">
                <span className="file-icon">📄</span>
                <div className="file-info">
                  <div className="file-name">{filePreview.name}</div>
                  <div className="file-size">{filePreview.size}</div>
                </div>
                <button
                  type="button"
                  className="remove-preview-btn"
                  onClick={handleRemoveFile}
                >
                  ✕
                </button>
              </div>
            )}

            <div className="input-controls">
              <label className="file-upload-label">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
                🖼️ Image
              </label>

              <label className="file-upload-label">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  style={{ display: 'none' }}
                />
                🎥 Video
              </label>

              <label className="file-upload-label">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                📎 File
              </label>

              <button
                className="send-btn"
                onClick={handleSendMessage}
                disabled={sending || (!inputText.trim() && !imagePreview && !videoPreview && !filePreview)}
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>

        {/* Edit Modal */}
        {editingId && (
          <div className="edit-modal-overlay" onClick={cancelEdit}>
            <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
              <div className="edit-modal-header">
                <h3>Edit Announcement</h3>
                <button className="modal-close-btn" onClick={cancelEdit}>✕</button>
              </div>

              <div className="edit-modal-content">
                <textarea
                  className="edit-textarea"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  placeholder="Edit announcement message..."
                  rows={4}
                />

                {editImagePreview && (
                  <div className="edit-image-preview">
                    <img src={editImagePreview} alt="Preview" />
                    <button
                      type="button"
                      className="remove-preview-btn"
                      onClick={handleRemoveEditImage}
                    >
                      ✕
                    </button>
                  </div>
                )}

                {editVideoPreview && (
                  <div className="edit-video-preview">
                    <video src={editVideoPreview} controls />
                    <button
                      type="button"
                      className="remove-preview-btn"
                      onClick={handleRemoveEditVideo}
                    >
                      ✕
                    </button>
                  </div>
                )}

                {editFilePreview && (
                  <div className="edit-file-preview">
                    <span className="file-icon">📄</span>
                    <div className="file-info">
                      <div className="file-name">{editFilePreview.name}</div>
                      <div className="file-size">{editFilePreview.size}</div>
                    </div>
                    <button
                      type="button"
                      className="remove-preview-btn"
                      onClick={handleRemoveEditFile}
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div className="edit-file-controls">
                  <label className="file-upload-label">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEditImageUpload}
                      style={{ display: 'none' }}
                    />
                    🖼️ Change Image
                  </label>

                  <label className="file-upload-label">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleEditVideoUpload}
                      style={{ display: 'none' }}
                    />
                    🎥 Change Video
                  </label>

                  <label className="file-upload-label">
                    <input
                      type="file"
                      onChange={handleEditFileUpload}
                      style={{ display: 'none' }}
                    />
                    📎 Change File
                  </label>
                </div>
              </div>

              <div className="edit-modal-footer">
                <button
                  className="btn-cancel"
                  onClick={cancelEdit}
                >
                  Cancel
                </button>
                <button
                  className="btn-save"
                  onClick={handleSaveEdit}
                  disabled={!editText.trim() && !editImagePreview && !editVideoPreview && !editFilePreview}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AdminAnnouncements;
