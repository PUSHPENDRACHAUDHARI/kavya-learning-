import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import AppLayout from '../../components/AppLayout';
import './InstructorDashboard.css';
import { FiArrowLeft } from 'react-icons/fi';

const InstructorDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    totalLessons: 0,
    averageStudentProgress: 0
  });
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [coursesRes, studentsRes] = await Promise.all([
        axiosClient.get('/api/instructor/courses'),
        axiosClient.get('/api/instructor/students')
      ]);

      const coursesData = coursesRes.data.data || [];
      const studentsData = studentsRes.data.data || [];

      // Calculate total lessons
      const totalLessons = coursesData.reduce((sum, course) => sum + (course.lessons?.length || 0), 0);

      // Calculate average progress
      let totalProgress = 0;
      let progressCount = 0;
      studentsData.forEach(student => {
        if (student.enrolledCourses) {
          student.enrolledCourses.forEach(enrollment => {
            totalProgress += enrollment.completionPercentage || 0;
            progressCount += 1;
          });
        }
      });

      setCourses(coursesData);
      setStats({
        totalCourses: coursesData.length,
        totalStudents: studentsData.length,
        totalLessons,
        averageStudentProgress: progressCount > 0 ? Math.round(totalProgress / progressCount) : 0
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <AppLayout><div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div></AppLayout>;
  }

  return (
    <AppLayout showGreeting={false}>
      <div className="instructor-dashboard">
        <div className="dashboard-header">
          {/* <button 
            className="back-button" 
            onClick={() => navigate('/dashboard')}
            title="Go back"
          >
            <FiArrowLeft /> Back
          </button> */}
          <h1>Instructor Dashboard</h1>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📚</div>
            <div className="stat-content">
              <h3>{stats.totalCourses}</h3>
              <p>Total Courses</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">👨‍🎓</div>
            <div className="stat-content">
              <h3>{stats.totalStudents}</h3>
              <p>Total Students</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📝</div>
            <div className="stat-content">
              <h3>{stats.totalLessons}</h3>
              <p>Total Lessons</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <h3>{stats.averageStudentProgress}%</h3>
              <p>Progress</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            <Link to="/instructor/courses" className="action-button">
              <span>📚</span>
              Manage Courses
            </Link>
            <Link to="/instructor/lessons" className="action-button">
              <span>📝</span>
              Manage Lessons
            </Link>
            <Link to="/instructor/students" className="action-button">
              <span>👥</span>
              View Students
            </Link>
            <Link to="/instructor/analytics" className="action-button">
              <span>📊</span>
              Analytics
            </Link>
          </div>
        </div>

        {/* Recent Courses */}
        <div className="recent-courses">
          <h2>Your Courses</h2>
          {courses.length === 0 ? (
            <p>No courses created yet. <Link to="/instructor/courses">Create a course</Link></p>
          ) : (
            <div className="courses-table">
              <table>
                <thead>
                  <tr>
                    <th>Course Title</th>
                    <th>Category</th>
                    <th>Level</th>
                    <th>Students</th>
                    <th>Lessons</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map(course => (
                    <tr key={course._id}>
                      <td><strong>{course.title}</strong></td>
                      <td>{course.category}</td>
                      <td>{course.level}</td>
                      <td>{course.enrolledStudents?.length || 0}</td>
                      <td>{course.lessons?.length || 0}</td>
                      <td>
                        <span className={`badge ${course.isPublished ? 'published' : 'draft'}`}>
                          {course.isPublished ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td>
                        <Link to={`/instructor/courses/${course._id}`} className="btn-sm">Edit</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default InstructorDashboard;
