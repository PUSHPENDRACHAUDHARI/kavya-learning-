import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import AppLayout from '../../components/AppLayout';
import './StudentActivity.css';

const StudentActivity = () => {
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivity();
  }, []);

  const loadActivity = async () => {
    try {
      const res = await axiosClient.get('/api/student/activity');
      setActivity(res.data.data);
    } catch (error) {
      console.error('Failed to load activity:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <AppLayout><div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div></AppLayout>;
  }

  if (!activity) {
    return <AppLayout><div style={{ padding: '20px', textAlign: 'center' }}>Failed to load data</div></AppLayout>;
  }

  // Calculate max hours for chart scaling
  const maxHours = activity.hoursByCourse.length > 0 
    ? Math.max(...activity.hoursByCourse.map(c => c.hoursSpent), 1)
    : 1;

  return (
    <AppLayout showGreeting={false}>
      <div className="student-activity">
        <h1>Study Activity 📊</h1>

        {/* Overview Cards */}
        <div className="activity-overview">
          <div className="overview-card">
            <div className="card-icon">⏱️</div>
            <div className="card-content">
              <h3>{activity.totalHours}</h3>
              <p>Total Study Hours</p>
            </div>
          </div>

          <div className="overview-card">
            <div className="card-icon">🔥</div>
            <div className="card-content">
              <h3>{activity.streakDays}</h3>
              <p>Day Streak</p>
            </div>
          </div>

          <div className="overview-card">
            <div className="card-icon">📅</div>
            <div className="card-content">
              <h3>{activity.lastLoginDate ? new Date(activity.lastLoginDate).toLocaleDateString() : 'N/A'}</h3>
              <p>Last Active</p>
            </div>
          </div>
        </div>

        {/* Study Hours by Course */}
        <div className="activity-section">
          <h2>Study Hours by Course</h2>
          
          {activity.hoursByCourse.length === 0 ? (
            <div className="empty-message">
              <p>No study data available yet. Start learning to track your progress!</p>
            </div>
          ) : (
            <div className="course-hours-list">
              {activity.hoursByCourse.map((course, idx) => (
                <div key={idx} className="course-hour-item">
                  <div className="course-info">
                    <h4>{course.course}</h4>
                    <span className="hours-badge">{course.hoursSpent} hours</span>
                  </div>
                  <div className="hour-bar-container">
                    <div className="hour-bar">
                      <div 
                        className="hour-fill" 
                        style={{ width: `${(course.hoursSpent / maxHours) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Stats */}
        <div className="activity-section">
          <h2>Activity Summary</h2>
          <div className="summary-grid">
            <div className="summary-item">
              <h4>Average Daily Study</h4>
              <p className="stat-value">
                {activity.totalHours > 0 ? Math.round(activity.totalHours / Math.max(activity.streakDays, 1)) : 0}h/day
              </p>
            </div>
            <div className="summary-item">
              <h4>Consistency</h4>
              <p className="stat-value">{activity.streakDays} days in a row</p>
            </div>
            <div className="summary-item">
              <h4>Total Courses Studied</h4>
              <p className="stat-value">{activity.hoursByCourse.length}</p>
            </div>
            <div className="summary-item">
              <h4>Most Active Course</h4>
              <p className="stat-value">
                {activity.hoursByCourse.length > 0 
                  ? activity.hoursByCourse.reduce((max, c) => c.hoursSpent > max.hoursSpent ? c : max).course 
                  : 'N/A'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Motivational Message */}
        <div className="motivation-card">
          <div className="motivation-icon">🌟</div>
          <h3>Keep It Up!</h3>
          {activity.streakDays > 0 ? (
            <p>You've been studying for {activity.streakDays} days! Your dedication is amazing 🎉</p>
          ) : (
            <p>Start your learning journey today and maintain a consistent streak!</p>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default StudentActivity;
