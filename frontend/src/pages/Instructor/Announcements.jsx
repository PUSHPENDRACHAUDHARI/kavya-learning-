import React, { useEffect, useState } from 'react';
import AppLayout from '../../components/AppLayout';
import { listPublicAnnouncements } from '../../api/announcementService';
import './Announcements.css';

const InstructorAnnouncements = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMarkedSeen, setHasMarkedSeen] = useState(false);

  useEffect(() => {
    // Load announcements from backend
    const loadMessages = async () => {
      try {
        const data = await listPublicAnnouncements();
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
        
        // Mark announcements as seen ONLY on first load
        if (!hasMarkedSeen && announcementData.length > 0) {
          localStorage.setItem('instructorLastSeenAnnouncementCount', announcementData.length.toString());
          setHasMarkedSeen(true);
        }
        
        setMessages(announcementData);
        setError(null);
      } catch (err) {
        console.error('Error loading announcements:', err);
        setError('Failed to load announcements');
      } finally {
        setLoading(false);
      }
    };

    loadMessages();

    // Refresh announcements every 5 seconds for real-time updates
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [hasMarkedSeen]);

  return (
    <AppLayout>
      <div className="announcements-page">
        <h2>Announcements</h2>

        {loading ? (
          <p>Loading announcements...</p>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : messages.length === 0 ? (
          <div className="no-announcements">No announcements yet.</div>
        ) : (
          <div className="messages-list">
            {messages.map((msg) => (
              <div key={msg._id || msg.id} className="announcement-message">
                <div className="message-header">
                  <span className="admin-badge">Admin Announcement</span>
                  <span className="message-time">{new Date(msg.createdAt).toLocaleString()}</span>
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
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default InstructorAnnouncements;
