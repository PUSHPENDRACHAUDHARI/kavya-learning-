import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import AppLayout from '../../components/AppLayout';
import './StudentCourses.css';

const StudentCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const res = await axiosClient.get('/api/student/courses');
      setCourses(res.data.data || []);
    } catch (error) {
      console.error('Failed to load courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueLearning = (courseId) => {
    navigate(`/student/courses/${courseId}`);
  };

  if (loading) {
    return <AppLayout><div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div></AppLayout>;
  }

  return (
    <AppLayout showGreeting={false}>
      <div className="student-courses">
        <h1>My Courses</h1>

        {courses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <h2>No Courses Yet</h2>
            <p>Start your learning journey by enrolling in a course</p>
            <button className="btn btn-primary" onClick={() => navigate('/courses')}>
              Browse Courses
            </button>
          </div>
        ) : (
          <>
            {/* Filter Tabs */}
            <div className="filter-tabs">
              <button className="tab active">All Courses</button>
              <button className="tab">In Progress</button>
              <button className="tab">Completed</button>
            </div>

            {/* Courses Grid */}
            <div className="courses-grid">
              {courses.map(course => (
                <div key={course._id} className="course-card">
                  {/* Course Thumbnail */}
                  {course.thumbnail && (
                    <div className="course-thumbnail">
                      <img src={course.thumbnail} alt={course.title} />
                    </div>
                  )}

                  {/* Course Content */}
                  <div className="course-body">
                    <h3>{course.title}</h3>
                    <p className="instructor">
                      By {course.instructor?.fullName || 'Unknown Instructor'}
                    </p>

                    {/* Progress Bar */}
                    <div className="progress-section">
                      <div className="progress-info">
                        <span>Progress</span>
                        <span className="progress-percentage">{course.completionPercentage}%</span>
                      </div>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${course.completionPercentage}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Course Stats */}
                    <div className="course-stats">
                      <div className="stat">
                        <span className="label">Lessons</span>
                        <span className="value">{course.completedLessons}/{course.totalLessons}</span>
                      </div>
                      <div className="stat">
                        <span className="label">Hours</span>
                        <span className="value">{course.hoursSpent}h</span>
                      </div>
                      <div className="stat">
                        <span className="label">Level</span>
                        <span className="value">{course.level}</span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    {course.completionPercentage === 100 && course.certificateDownloadedAt && (
                      <div className="status-badge completed">
                        ✓ Completed
                      </div>
                    )}

                    {/* Continue Button */}
                    <button 
                      className="btn btn-continue"
                      onClick={() => handleContinueLearning(course._id)}
                    >
                      {course.completionPercentage === 100 ? 'Review' : 'Continue Learning'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default StudentCourses;
