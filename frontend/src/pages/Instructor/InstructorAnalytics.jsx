import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import AppLayout from '../../components/AppLayout';
import { FiArrowLeft } from 'react-icons/fi';
import './InstructorAnalytics.css';

const InstructorAnalytics = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState({
    totalStudents: 0,
    totalEnrollments: 0,
    averageProgress: 0,
    completionRate: 0,
    courseMetrics: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const [coursesRes, studentsRes] = await Promise.all([
        axiosClient.get('/api/instructor/courses'),
        axiosClient.get('/api/instructor/students')
      ]);

      const coursesData = coursesRes.data.data || [];
      const studentsData = studentsRes.data.data || [];

      // Calculate metrics
      const totalStudents = studentsData.length;
      const totalEnrollments = studentsData.reduce((sum, s) => sum + (s.enrolledInCourseCount || 0), 0);
      const averageProgress = studentsData.length > 0
        ? (studentsData.reduce((sum, s) => sum + (s.averageProgress || 0), 0) / studentsData.length).toFixed(2)
        : 0;

      // Calculate completion rate
      const completedStudents = studentsData.filter(s => (s.averageProgress || 0) >= 100).length;
      const completionRate = totalStudents > 0 ? ((completedStudents / totalStudents) * 100).toFixed(2) : 0;

      // Course metrics - calculate real average progress per course
      const courseMetrics = coursesData.map(course => {
        const enrolledInCourse = studentsData.filter(s => 
          s.enrolledCourses?.some(ec => ec.course?._id === course._id || ec.course === course._id)
        );
        const enrollmentCount = enrolledInCourse.length;
        
        // Calculate average progress from enrolled students' completion percentages
        let totalProgress = 0;
        enrolledInCourse.forEach(student => {
          const enrollment = student.enrolledCourses?.find(ec => 
            (ec.course?._id === course._id || ec.course === course._id)
          );
          totalProgress += (enrollment?.completionPercentage || 0);
        });
        
        const averageProgress = enrollmentCount > 0 ? (totalProgress / enrollmentCount).toFixed(2) : 0;
        
        return {
          id: course._id,
          title: course.title,
          enrollmentCount,
          averageProgress,
          lessonsCount: course.lessons?.length || 0
        };
      });

      setAnalytics({
        totalStudents,
        totalEnrollments,
        averageProgress,
        completionRate,
        courseMetrics
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <AppLayout><div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div></AppLayout>;
  }

  return (
    <AppLayout showGreeting={false}>
      <div className="instructor-analytics">
        <div className="analytics-header">
          <button
            className="back-button"
            onClick={() => navigate('/instructor/dashboard')}
            title="Go back"
          >
            <FiArrowLeft /> Back
          </button>
          <h1>Analytics & Insights</h1>
        </div>

        {/* Overview Cards */}
        <div className="analytics-overview">
          <div className="analytics-card">
            <div className="card-icon">👥</div>
            <div className="card-content">
              <h3>{analytics.totalStudents}</h3>
              <p>Total Students</p>
            </div>
          </div>

          <div className="analytics-card">
            <div className="card-icon">📚</div>
            <div className="card-content">
              <h3>{analytics.totalEnrollments}</h3>
              <p>Total Enrollments</p>
            </div>
          </div>

          <div className="analytics-card">
            <div className="card-icon">📊</div>
            <div className="card-content">
              <h3>{analytics.averageProgress}%</h3>
              <p>Avg. Progress</p>
            </div>
          </div>

          <div className="analytics-card">
            <div className="card-icon">✅</div>
            <div className="card-content">
              <h3>{analytics.completionRate}%</h3>
              <p>Completion Rate</p>
            </div>
          </div>
        </div>

        {/* Course Performance */}
        <div className="course-performance">
          <h2>Course Performance</h2>
          <div className="performance-table-container">
            {analytics.courseMetrics.length === 0 ? (
              <p className="no-data">No course data available</p>
            ) : (
              <table className="performance-table">
                <thead>
                  <tr>
                    <th>Course Name</th>
                    <th>Enrollments</th>
                    <th>Avg. Progress</th>
                    <th>Lessons</th>
                    <th>Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.courseMetrics.map(course => (
                    <tr key={course.id}>
                      <td><strong>{course.title}</strong></td>
                      <td>{course.enrollmentCount}</td>
                      <td>{course.averageProgress}%</td>
                      <td>{course.lessonsCount}</td>
                      <td>
                        <div className="progress-bar-small">
                          <div
                            className="progress-fill-small"
                            style={{ 
                              width: `${course.averageProgress}%`,
                              backgroundColor: '#3b82f6',
                              transition: 'width 0.3s ease'
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Insights Section */}
        <div className="insights-section">
          <h2>Key Insights</h2>
          <div className="insights-grid">
            <div className="insight-card">
              <h3>📈 Performance Trend</h3>
              <p>Your courses are performing {analytics.completionRate > 50 ? 'excellently' : 'well'}. Keep engaging your students with interactive content.</p>
            </div>
            <div className="insight-card">
              <h3>🎯 Student Engagement</h3>
              <p>Average student progress is {analytics.averageProgress}%. Focus on lessons with lower completion rates.</p>
            </div>
            <div className="insight-card">
              <h3>📊 Enrollment Growth</h3>
              <p>You have {analytics.totalStudents} active students across {analytics.courseMetrics.length} courses.</p>
            </div>
            <div className="insight-card">
              <h3>🏆 Top Achievement</h3>
              <p>{analytics.completionRate}% of students have completed at least one course. Celebrate with your class!</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default InstructorAnalytics;
