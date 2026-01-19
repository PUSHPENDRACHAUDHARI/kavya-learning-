import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FiHome, FiBookOpen } from "react-icons/fi";
import { IoLogOutOutline } from "react-icons/io5";

import {
  LuCalendar,
  LuTrophy,
  LuUser,
  LuGalleryHorizontalEnd,
} from "react-icons/lu";
import { TbReportAnalytics } from "react-icons/tb";
import { MdSchool, MdMessage, MdCreditCard, MdAnnouncement } from "react-icons/md";
import { MdAutoStories } from "react-icons/md";
import { AiOutlineBook } from "react-icons/ai";
import logo from "../assets/logo.png";
import { listPublicAnnouncements } from "../api/announcementService";

function Sidebar({ isOpen, setIsOpen }) {
  const [isMobile, setIsMobile] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [hasNewAnnouncements, setHasNewAnnouncements] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const navigate = useNavigate();

  // Detect screen size and get user role
  useEffect(() => {
    const role = localStorage.getItem('userRole');
    setUserRole(role);

    const checkScreen = () => {
      if (window.innerWidth <= 1024) {
        setIsMobile(true);
        setIsOpen(false);
      } else {
        setIsMobile(false);
        setIsOpen(true);
      }
    };

    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, [setIsOpen]);

  // Check for new announcements every 3 seconds
  useEffect(() => {
    const checkAnnouncements = async () => {
      try {
        const announcements = await listPublicAnnouncements();
        const announcementData = Array.isArray(announcements) ? announcements : [];
        
        // Determine the appropriate localStorage key based on user role
        let lastSeenKey = 'studentLastSeenAnnouncementCount';
        if (userRole === 'instructor') {
          lastSeenKey = 'instructorLastSeenAnnouncementCount';
        } else if (userRole === 'parent') {
          lastSeenKey = 'parentLastSeenAnnouncementCount';
        } else if (userRole === 'admin' || userRole === 'sub-admin') {
          lastSeenKey = 'adminLastSeenAnnouncementCount';
        }
        
        const lastSeenCount = parseInt(localStorage.getItem(lastSeenKey) || '0', 10);
        setHasNewAnnouncements(announcementData.length > lastSeenCount);
      } catch (err) {
        console.error('Error checking announcements:', err);
      }
    };

    if (userRole) {
      checkAnnouncements();
      const interval = setInterval(checkAnnouncements, 3000);
      return () => clearInterval(interval);
    }
  }, [userRole]);

  // Check for unread messages every 2 seconds
  useEffect(() => {
    const checkUnreadMessages = async () => {
      try {
        // Check localStorage for unread message count
        const currentUnread = localStorage.getItem('currentUnreadMessageCount') || '0';
        const lastSeen = parseInt(localStorage.getItem('lastSeenMessageCount') || '0', 10);
        const unreadCount = parseInt(currentUnread, 10);
        
        setHasUnreadMessages(unreadCount > lastSeen);
      } catch (err) {
        console.error('Error checking unread messages:', err);
      }
    };

    checkUnreadMessages();
    const interval = setInterval(checkUnreadMessages, 2000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    // Show Dashboard and Courses only for student users (not instructor, admin, or parent)
      ...(userRole !== 'instructor' && userRole !== 'admin' && userRole !== 'sub-admin' && userRole !== 'parent' ? [
      { path: "/dashboard", label: "Dashboard", icon: <FiHome /> },
      { path: "/courses", label: "Courses", icon: <AiOutlineBook /> },
      // Enrolled Courses (visible only to students) - placed directly below Courses
      { path: "/student/enrolled-courses", label: "Enrolled Courses", icon: <MdAutoStories /> },
      { path: "/student/notes", label: "Notes", icon: <LuGalleryHorizontalEnd /> },
      { path: "/student/announcements", label: "Announcements", icon: <MdAnnouncement /> },
      ...(userRole === 'student' ? [{ path: "/messages", label: "Messages", icon: <MdMessage /> }] : []),
    ] : []),
    
    // Admin items
    ...(userRole === 'admin' || userRole === 'sub-admin' ? [
      { path: "/admin/dashboard", label: "Admin Dashboard", icon: <TbReportAnalytics /> },
      { path: "/admin/announcements", label: "Announcements", icon: <MdAnnouncement /> },
      { path: "/admin/students", label: "Manage Students", icon: <LuUser /> },
      { path: "/admin/courses", label: "Manage Courses", icon: <AiOutlineBook /> },
      { path: "/admin/notes", label: "Notes", icon: <LuGalleryHorizontalEnd /> },
      { path: "/admin/settings", label: "Admin Settings", icon: <TbReportAnalytics /> },
    ] : []),
    
    // Instructor items
    ...(userRole === 'instructor' ? [
      { type: 'section', label: 'Instructor Panel' },
      { path: "/instructor/dashboard", label: "Dashboard", icon: <FiHome /> },
      { path: "/instructor/courses", label: "My Courses", icon: <AiOutlineBook /> },
      { path: "/instructor/students", label: "Students", icon: <LuUser /> },
      { path: "/instructor/lessons", label: "Manage Lessons", icon: <MdAutoStories /> },
      { path: "/instructor/analytics", label: "Analytics", icon: <TbReportAnalytics /> },
      { path: "/instructor/announcements", label: "Announcements", icon: <MdAnnouncement /> },
    ] : []),
    
    // Subscriptions and Leaderboard - shown only to student users
    ...(userRole !== 'instructor' && userRole !== 'admin' && userRole !== 'sub-admin' && userRole !== 'parent' ? [
      {
        path: "/subscription",
        label: "Subscriptions",
        icon: <MdCreditCard />,
      },
    ] : []),
    ...(userRole === 'parent' ? [
      { path: "/profile", label: "Profile", icon: <LuUser /> },
      { path: "/parent/student-report", label: "Student Reports", icon: <MdSchool /> },
      { path: "/parent/announcements", label: "Announcements", icon: <MdAnnouncement /> }
      // Messages intentionally omitted for parent users
    ] : []),
    ...(userRole !== 'parent' ? [
      { path: "/schedule", label: "Schedule", icon: <LuCalendar /> },
    ] : []),
    ...(userRole !== 'instructor' && userRole !== 'admin' && userRole !== 'sub-admin' && userRole !== 'parent' ? [
      { path: "/leaderboard", label: "Leaderboard", icon: <LuTrophy /> },
    ] : []),
    ...(userRole === 'parent' ? [] : [{ path: "/profile", label: "Profile", icon: <LuUser /> }]),
  ];

  const handleLogout = () => {
    navigate("/"); // Redirect to login page
  };

  return (
    <>
      {isMobile && (
        <button
          className="mobile-toggle"
          onClick={() => setIsOpen(!isOpen)}
          style={{ zIndex: 5000 }}
        >
          ☰
        </button>
      )}

      <aside
        className={`sidebar ${isOpen ? "open" : ""}`}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          height: "100vh",
          width: "260px",
          overflowY: "auto",
          transition: "transform 0.3s ease",
          transform:
            isMobile && !isOpen ? "translateX(-100%)" : "translateX(0)",
          borderRight: "1px solid var(--border)",
          backgroundColor: "var(--sidebar-bg)",
          zIndex: 3000,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div className="logo">
            <img src={logo} alt="Logo" />
          </div>

          <nav>
            {navItems.map((item) => {
              if (item.type === 'section') {
                return (
                  <div key={item.label} style={{
                    padding: '12px 16px 8px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: 'var(--muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginTop: '8px',
                  }}>
                    {item.label}
                  </div>
                );
              }
              
              // Check if this is an announcements link or messages link
              const isAnnouncementLink = item.path && item.path.includes('announcements');
              const isMessagesLink = item.path === '/messages';
              
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    isActive ? "nav-link active" : "nav-link"
                  }
                  style={({ isActive }) => {
                    const highlightCond = (isAnnouncementLink && hasNewAnnouncements && !isActive) || (isMessagesLink && hasUnreadMessages && !isActive);
                    return {
                      color: isActive ? '#fff' : (highlightCond ? '#000000' : 'inherit'),
                      fontWeight: highlightCond ? 'bold' : (isActive ? 700 : 'inherit'),
                      backgroundColor: isActive ? '#2b6cb0' : (highlightCond ? '#f0f0f0' : 'inherit'),
                    };
                  }}
                  onClick={() => isMobile && setIsOpen(false)}
                >
                  {(() => {
                    const iconIsStudentReport = item.path === '/parent/student-report';
                    const iconStyle = iconIsStudentReport && userRole === 'parent' ? { color: '#000' } : undefined;
                    return <span className="nav-icon" style={iconStyle}>{item.icon}</span>;
                  })()}
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
