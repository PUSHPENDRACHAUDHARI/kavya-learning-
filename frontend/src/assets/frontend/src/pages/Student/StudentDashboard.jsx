import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import AppLayout from '../../components/AppLayout';
import './StudentDashboard.css';

const StudentDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await axiosClient.get('/api/student/dashboard');
      setDashboard(res.data.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <AppLayout><div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div></AppLayout>;
  }

  if (!dashboard) {
    return <AppLayout><div style={{ padding: '20px', textAlign: 'center' }}>Failed to load data</div></AppLayout>;
  }

  return (
    <AppLayout showGreeting={false}>
      <div className="student-dashboard">
        {/* Welcome Header */}
        <div className="welcome-section">
          <h1>Welcome, {dashboard.student.fullName}! 👋</h1>
          <p>Continue your learning journey</p>
        </div>

        {/* Overview Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📚</div>
            <div className="stat-content">
              <h3>{dashboard.overview.totalCoursesEnrolled}</h3>
              <p>Courses Enrolled</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <h3>{dashboard.overview.completedCourses}</h3>
              <p>Courses Completed</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⏱️</div>
            <div className="stat-content">
              <h3>{dashboard.overview.totalStudyHours}h</h3>
              <p>Study Hours</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🏅</div>
            <div className="stat-content">
              <h3>{dashboard.overview.totalAchievements}</h3>
              <p>Achievements</p>
            </div>
          </div>
        </div>

        {/* Progress Summary */}
        <div className="progress-section">
          <h2>Overall Progress</h2>
          <div className="progress-card">
            <div className="progress-label">
              <span>Average Course Progress</span>
              <span className="progress-percentage">{dashboard.overview.averageProgress}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${dashboard.overview.averageProgress}%` }}></div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            <Link to="/student/courses" className="action-button">
              <span>📚</span>
              My Courses
            </Link>
            <Link to="/student/achievements" className="action-button">
              <span>🏅</span>
              Achievements
            </Link>
            <Link to="/student/activity" className="action-button">
              <span>📊</span>
              Study Activity
            </Link>
            <Link to="/student/profile" className="action-button">
              <span>👤</span>
              My Profile
            </Link>
          </div>
        </div>

        {/* Recommendations */}
        <div className="recommendations">
          <h2>Recommendations</h2>
          <div className="recommendation-card">
            <div className="recommendation-header">
              {dashboard.overview.inProgressCourses > 0 ? (
                <>
                  <span className="recommendation-icon">🚀</span>
                  <div>
                    <h4>Keep Learning!</h4>
                    <p>You have {dashboard.overview.inProgressCourses} course(s) in progress</p>
                  </div>
                </>
              ) : dashboard.overview.totalCoursesEnrolled === 0 ? (
                <>
                  <span className="recommendation-icon">🎯</span>
                  <div>
                    <h4>Get Started</h4>
                    <p>Enroll in your first course to begin learning</p>
                  </div>
                </>
              ) : (
                <>
                  <span className="recommendation-icon">⭐</span>
                  <div>
                    <h4>You're Doing Great!</h4>
                    <p>All your courses are completed. Explore new courses!</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default StudentDashboard;
