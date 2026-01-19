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
import { MdSchool } from "react-icons/md";
import logo from "../assets/logo.png";

function Sidebar({ isOpen, setIsOpen }) {
  const [isMobile, setIsMobile] = useState(false);
  const [userRole, setUserRole] = useState(null);
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

  const navItems = [
    // Show Dashboard and Courses only for student users (not instructor, admin, or parent)
    ...(userRole !== 'instructor' && userRole !== 'admin' && userRole !== 'sub-admin' && userRole !== 'parent' ? [
      { path: "/dashboard", label: "Dashboard", icon: <FiHome /> },
      { path: "/courses", label: "Courses", icon: <FiBookOpen /> },
      { path: "/student/enrolled-courses", label: "Enrolled Courses", icon: <FiBookOpen /> },
    ] : []),
    
    // Admin items
    ...(userRole === 'admin' || userRole === 'sub-admin' ? [
      { path: "/admin/dashboard", label: "Admin Dashboard", icon: <TbReportAnalytics /> },
      { path: "/admin/students", label: "Manage Students", icon: <LuUser /> },
      { path: "/admin/courses", label: "Manage Courses", icon: <FiBookOpen /> },
      { path: "/admin/settings", label: "Admin Settings", icon: <TbReportAnalytics /> },
    ] : []),
    
    // Instructor items
    ...(userRole === 'instructor' ? [
      { type: 'section', label: 'Instructor Panel' },
      { path: "/instructor/dashboard", label: "Dashboard", icon: <FiHome /> },
      { path: "/instructor/courses", label: "My Courses", icon: <FiBookOpen /> },
      { path: "/instructor/students", label: "Students", icon: <LuUser /> },
      { path: "/instructor/lessons", label: "Manage Lessons", icon: <FiBookOpen /> },
      { path: "/instructor/analytics", label: "Analytics", icon: <TbReportAnalytics /> },
    ] : []),
    
    // Subscriptions and Leaderboard - shown only to student users
    ...(userRole !== 'instructor' && userRole !== 'admin' && userRole !== 'sub-admin' && userRole !== 'parent' ? [
      {
        path: "/subscription",
        label: "Subscriptions",
        icon: <LuGalleryHorizontalEnd />,
      },
    ] : []),
    ...(userRole === 'parent' ? [
      { path: "/parent/student-report", label: "Student Reports", icon: <MdSchool /> }
    ] : []),
    ...(userRole !== 'parent' ? [
      { path: "/schedule", label: "Schedule", icon: <LuCalendar /> },
    ] : []),
    ...(userRole !== 'instructor' && userRole !== 'admin' && userRole !== 'sub-admin' && userRole !== 'parent' ? [
      { path: "/leaderboard", label: "Leaderboard", icon: <LuTrophy /> },
    ] : []),
    { path: "/profile", label: "Profile", icon: <LuUser /> },
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
          width: "240px",
          overflowY: "auto",
          background: "#fff",
          transition: "transform 0.3s ease",
          transform:
            isMobile && !isOpen ? "translateX(-100%)" : "translateX(0)",
          borderRight: "1px solid #e5e5e5",
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
                    color: '#999',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginTop: '8px',
                  }}>
                    {item.label}
                  </div>
                );
              }
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    isActive ? "nav-link active" : "nav-link"
                  }
                  onClick={() => isMobile && setIsOpen(false)}
                >
                  <span className="nav-icon">{item.icon}</span>
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
