import React, { useState, useEffect } from "react";
import "./App.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import Schedule from "./pages/Schedule";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Registration from "./pages/Registration";
import Subscription from "./pages/Subscription";
import PaymentInterface from "./components/PaymentInterface";
import ProtectedRoute from './components/ProtectedRoute';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminStudents from './pages/Admin/AdminStudents';
import AdminCourses from './pages/Admin/AdminCourses';
import AdminEnrollments from './pages/Admin/AdminEnrollments';
import AdminSettings from './pages/Admin/AdminSettings';
// Instructor Pages
import InstructorDashboard from './pages/Instructor/InstructorDashboard';
import InstructorCourses from './pages/Instructor/InstructorCourses';
import InstructorStudents from './pages/Instructor/InstructorStudents';
import InstructorLessons from './pages/Instructor/InstructorLessons';
import InstructorAnalytics from './pages/Instructor/InstructorAnalytics';
// Student Pages
import StudentDashboard from './pages/Student/StudentDashboard';
import StudentCourses from './pages/Student/StudentCourses';
import StudentEnrolledCourses from './pages/Student/StudentEnrolledCourses';
import StudentAchievements from './pages/Student/StudentAchievements';
import StudentActivity from './pages/Student/StudentActivity';
// Parent Pages
import StudentReport from './pages/Parent/StudentReport';


function Layout() {
  const location = useLocation();
  const hideLayout =
    location.pathname === "/" || location.pathname === "/register";

  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
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
  }, []);

  return (
    <div className="app-container">
      {!hideLayout && (
        <>
          {/* Hamburger icon */}
          {isMobile && (
            <button className="mobile-toggle" onClick={() => setIsOpen(true)}>
              ☰
            </button>
          )}

          <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} isMobile={isMobile} />
        </>
      )}

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Registration />} />

          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={<ProtectedRoute requireAdmin={true}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/students" element={<ProtectedRoute requireAdmin={true}><AdminStudents /></ProtectedRoute>} />
          <Route path="/admin/courses" element={<ProtectedRoute requireAdmin={true}><AdminCourses /></ProtectedRoute>} />
          <Route path="/admin/enrollments" element={<ProtectedRoute requireAdmin={true}><AdminEnrollments /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute requireAdmin={true}><AdminSettings /></ProtectedRoute>} />

          {/* Instructor Routes */}
          <Route path="/instructor/dashboard" element={<ProtectedRoute requireRole="instructor"><InstructorDashboard /></ProtectedRoute>} />
          <Route path="/instructor/courses" element={<ProtectedRoute requireRole="instructor"><InstructorCourses /></ProtectedRoute>} />
          <Route path="/instructor/students" element={<ProtectedRoute requireRole="instructor"><InstructorStudents /></ProtectedRoute>} />
          <Route path="/instructor/lessons" element={<ProtectedRoute requireRole="instructor"><InstructorLessons /></ProtectedRoute>} />
          <Route path="/instructor/analytics" element={<ProtectedRoute requireRole="instructor"><InstructorAnalytics /></ProtectedRoute>} />

          {/* Student Routes */}
          <Route path="/dashboard" element={<ProtectedRoute requireRole="student"><Dashboard /></ProtectedRoute>} />
          <Route path="/student/courses" element={<ProtectedRoute requireRole="student"><StudentCourses /></ProtectedRoute>} />
          <Route path="/student/enrolled-courses" element={<ProtectedRoute requireRole="student"><StudentEnrolledCourses /></ProtectedRoute>} />
          <Route path="/student/achievements" element={<ProtectedRoute requireRole="student"><StudentAchievements /></ProtectedRoute>} />
          <Route path="/student/activity" element={<ProtectedRoute requireRole="student"><StudentActivity /></ProtectedRoute>} />

          {/* Public Routes */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/subscription" element={<Subscription />}></Route>
          <Route path="/parent/student-report" element={<ProtectedRoute requireRole="parent"><StudentReport /></ProtectedRoute>} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/payment" element={<PaymentInterface />}></Route>
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/profile" element={<Profile />} />
         
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Layout />
    </Router>
  );
}

export default App;
