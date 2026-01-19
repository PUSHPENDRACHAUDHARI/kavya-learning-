import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { IoLogOutOutline, IoPersonOutline } from "react-icons/io5";
import notification from "../assets/notification.png";
import profile from "../assets/profile.png";
import avatarFemale from "../assets/avatar-female.svg";
import * as api from "../api";
 
function Header({ onToggleSidebar, children }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userGender, setUserGender] = useState("");
  const [userAvatar, setUserAvatar] = useState("");
  const [userInitials, setUserInitials] = useState("");
 
  // Notifications fetched from API
  const [notifications, setNotifications] = useState([]);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showNotificationDetail, setShowNotificationDetail] = useState(false);

  const handleNotificationClick = (notif) => {
    // Mark as read via API
    if (notif.unread) {
      api.markNotificationAsRead(notif._id).catch(err => console.error('Error marking as read:', err));
    }

    // Update local state
    setNotifications((prev) => prev.map(n => n._id === notif._id ? { ...n, unread: false, readAt: new Date() } : n));

    // Set selected and open detail card
    setSelectedNotification({ ...notif, unread: false });
    setShowNotifications(false);
    setShowNotificationDetail(true);
  };

  const handleDeleteNotification = (id) => {
    // Delete via API
    setLoading(true);
    api.deleteNotification(id)
      .then(() => {
        setNotifications((prev) => prev.filter(n => n._id !== id));
        setShowNotificationDetail(false);
        setSelectedNotification(null);
      })
      .catch(err => console.error('Error deleting notification:', err))
      .finally(() => setLoading(false));
  };

  const handleOpenFromDetail = () => {
    if (!selectedNotification) return;
    const route = selectedNotification.route;
    setShowNotificationDetail(false);
    setSelectedNotification(null);
    if (route) navigate(route);
  };

  // Fetch notifications on mount
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await api.getNotifications(10, 1);
        if (data.success && Array.isArray(data.notifications)) {
          // Convert createdAt string to relative time format
          const notificationsWithTime = data.notifications.map(notif => ({
            ...notif,
            time: getRelativeTime(notif.createdAt),
          }));
          setNotifications(notificationsWithTime);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
        // Fallback to empty array if API fails
        setNotifications([]);
      }
    };

    // Load user avatar and gender from localStorage (normalize gender)
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        const genderNormalized = (user.gender || "").toString().toLowerCase();
        setUserGender(genderNormalized);
        setUserAvatar(user.avatar || "");
        
        // Generate initials: get first char of first and last name, or first 2 chars if single word
        const fullName = (user.fullName || "").trim();
        let initials = "";
        if (fullName.length > 0) {
          const parts = fullName.split(/\s+/); // Split by whitespace
          if (parts.length >= 2) {
            // Multi-word name: first char of first + first char of last
            initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
          } else {
            // Single word: first two chars
            initials = fullName.substring(0, 2).toUpperCase();
          }
        }
        setUserInitials(initials);
      } catch (e) {
        console.error("Error parsing stored user:", e);
      }
    }

    fetchNotifications();

    // Refresh notifications every 10 seconds
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  // Convert ISO timestamp to relative time (e.g., "2 hours ago")
  const getRelativeTime = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };
 
  // Close dropdowns if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Listen for updates to the stored user (so Header updates when Dashboard saves profile)
  useEffect(() => {
    const handleUserUpdated = () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          const genderNormalized = (user.gender || "").toString().toLowerCase();
          setUserGender(genderNormalized);
          setUserAvatar(user.avatar || "");

          const fullName = (user.fullName || "").trim();
          let initials = "";
          if (fullName.length > 0) {
            const parts = fullName.split(/\s+/);
            if (parts.length >= 2) initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
            else initials = fullName.substring(0, 2).toUpperCase();
          }
          setUserInitials(initials);
        } catch (e) {
          console.error("Error parsing stored user:", e);
        }
      } else {
        setUserGender("");
        setUserAvatar("");
        setUserInitials("");
      }
    };

    window.addEventListener('userUpdated', handleUserUpdated);
    return () => window.removeEventListener('userUpdated', handleUserUpdated);
  }, []);
 
  const handleLogout = () => {
    // Clear session and user role
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userRole");
   
    // Close dropdown
    setShowDropdown(false);
 
    // Redirect to login page with success message
    navigate("/", {
      replace: true,
      state: { message: "You have successfully logged out" }
    });
  };

  const goToProfile = () => {
    // Close dropdown and navigate to profile page
    setShowDropdown(false);
    navigate("/profile");
  };
 
  const unreadCount = notifications.filter(n => n.unread).length;
 
  return (
    <header className="header-wrapper" style={{ position: "relative" }}>
      <div className="header-left">
        <button className="mobile-toggle" onClick={onToggleSidebar}>☰</button>
        <div className="header-title">{children}</div>
      </div>
 
      <div className="header-right" style={{ position: "relative" }}>
        {/* Notification Icon */}
        <div ref={notificationRef} style={{ display: "inline-block", position: "relative", marginRight: "15px" }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <img
              src={notification}
              alt="Notification"
              className="header-notification"
              style={{ cursor: "pointer" }}
              onClick={() => setShowNotifications(!showNotifications)}
            />
            {/* Notification Badge */}
            {unreadCount > 0 && (
              <span style={{
                position: "absolute",
                top: "-5px",
                right: "-5px",
                backgroundColor: "#EF4444",
                color: "white",
                borderRadius: "50%",
                width: "20px",
                height: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: "bold"
              }}>
                {unreadCount}
              </span>
            )}
          </div>
 
          {/* Notifications Dropdown */}
          {showNotifications && (
            <div
              style={{
                position: "absolute",
                top: "50px",
                right: "0",
                backgroundColor: "#fff",
                border: "1px solid #ddd",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                width: "350px",
                maxHeight: "400px",
                overflowY: "auto",
                zIndex: 100,
              }}
            >
              {/* Header */}
              <div style={{
                padding: "15px 20px",
                borderBottom: "1px solid #e5e5e5",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                position: "sticky",
                top: 0,
                backgroundColor: "#fff",
                zIndex: 1
              }}>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#1A365D" }}>
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span style={{ fontSize: "12px", color: "#2B6CB0", fontWeight: "500" }}>
                    {unreadCount} new
                  </span>
                )}
              </div>
 
              {/* Notification List */}
              {notifications && notifications.length > 0 ? (
                notifications.map((notif) => (
                  <div
                    key={notif._id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleNotificationClick(notif)}
                    onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') handleNotificationClick(notif); }}
                    style={{
                      padding: "15px 20px",
                      borderBottom: "1px solid #f0f0f0",
                      cursor: "pointer",
                      backgroundColor: notif.unread ? "#F0F9FF" : "white",
                      transition: "background-color 0.2s",
                      outline: 'none'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#F0F9FF"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = notif.unread ? "#F0F9FF" : "white"}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                      {notif.unread && (
                        <div style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          backgroundColor: "#2B6CB0",
                          marginTop: "6px",
                          flexShrink: 0
                        }}></div>
                      )}
                      <div style={{ flex: 1 }}>
                        <h4 style={{
                          margin: "0 0 5px 0",
                          fontSize: "14px",
                          fontWeight: notif.unread ? "600" : "500",
                          color: "#1A365D"
                        }}>
                          {notif.title}
                        </h4>
                        <p style={{
                          margin: "0 0 5px 0",
                          fontSize: "13px",
                          color: "#4A5568",
                          lineHeight: "1.4"
                        }}>
                          {notif.message}
                        </p>
                        <span style={{ fontSize: "12px", color: "#718096" }}>
                          {notif.time}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: "20px", textAlign: "center", color: "#718096" }}>
                  No notifications
                </div>
              )}
 
              {/* End list */}
            </div>
          )}
        </div>

        {/* Notification Detail Card (modal-like) */}
        {showNotificationDetail && selectedNotification && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200
          }}
            onClick={() => { setShowNotificationDetail(false); setSelectedNotification(null); }}
          >
            <div role="dialog" aria-modal="true" aria-label="Notification details" onClick={(e) => e.stopPropagation()} style={{
              width: '420px',
              background: '#fff',
              borderRadius: '10px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              padding: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#0B2545' }}>{selectedNotification.title}</h3>
                <span style={{ fontSize: '12px', color: '#718096' }}>{selectedNotification.time}</span>
              </div>
              <p style={{ marginTop: '12px', color: '#4A5568', lineHeight: 1.5 }}>{selectedNotification.message}</p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
                <button onClick={() => handleDeleteNotification(selectedNotification._id)} style={{ padding: '8px 12px', background: '#EF4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  Delete
                </button>
                <button onClick={() => { setShowNotificationDetail(false); setSelectedNotification(null); }} style={{ padding: '8px 12px', background: '#E2E8F0', color: '#1A365D', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
 
        {/* Profile Avatar */}
        <div ref={dropdownRef} style={{ display: "inline-block", position: "relative" }}>
          {userAvatar ? (
            <img
              src={userAvatar}
              alt="Profile"
              className="header-profile"
              style={{ cursor: "pointer", width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover" }}
              onClick={() => setShowDropdown(!showDropdown)}
            />
          ) : userGender === "female" ? (
            <div
              style={{
                cursor: "pointer",
                width: "45px",
                height: "45px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <img
                src={avatarFemale}
                alt="Female Avatar"
                style={{ width: "36px", height: "36px" }}
              />
            </div>
          ) : (
            <div
              style={{
                cursor: "pointer",
                width: "45px",
                height: "45px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <img
                src={profile}
                alt="Male Avatar"
                style={{ width: "36px", height: "36px" }}
              />
            </div>
      
          )}
 
          {/* Profile Dropdown */}
          {showDropdown && (
            <div
              style={{
                position: "absolute",
                top: "50px",
                right: "0",
                backgroundColor: "#fff",
                border: "1px solid #ddd",
                borderRadius: "8px",
                boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                padding: "10px 0",
                zIndex: 100,
                minWidth: "200px",
                display: "flex",
                flexDirection: "column",
                gap: "0",
              }}
            >
              {/* Profile Button */}
              <button
                onClick={goToProfile}
                style={{
                  width: "100%",
                  padding: "12px 20px",
                  background: "transparent",
                  color: "#1A365D",
                  border: "none",
                  borderBottom: "1px solid #e2e8f0",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: "14px",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  gap: "10px",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f5f5f5"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              >
                <IoPersonOutline size={18} />
                Profile
              </button>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                style={{
                  width: "100%",
                  padding: "12px 20px",
                  background: "transparent",
                  color: "#EF4444",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: "14px",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  gap: "10px",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#fff5f5"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              >
                <IoLogOutOutline size={18} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
 
export default Header;