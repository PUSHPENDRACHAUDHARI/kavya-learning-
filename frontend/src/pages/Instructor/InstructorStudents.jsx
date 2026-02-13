import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import AppLayout from '../../components/AppLayout';
import { FiArrowLeft } from 'react-icons/fi';
import './InstructorStudents.css';

const InstructorStudents = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState(null);

  const filteredStudents = students || [];

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const res = await axiosClient.get('/api/instructor/students');
      setStudents(res.data.data || []);
    } catch (error) {
      console.error('Failed to load students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewStudent = async (studentId) => {
    // Ensure correct id passed and reset previous state
    if (!studentId) return;
    setSelectedStudent(studentId);
    setStudentDetails(null);
    setStudentError(null);
    setStudentLoading(true);
    try {
      const res = await axiosClient.get(`/api/instructor/students/${studentId}`);
      setStudentDetails(res.data.data || null);
    } catch (error) {
      console.error('Failed to load student details:', error);
      setStudentError(error?.response?.data?.message || error.message || 'Failed to load student details');
    } finally {
      setStudentLoading(false);
    }
  };

  

  const handleRemoveStudent = async (studentId) => {
    if (!window.confirm('Remove this student from your courses? This will unenroll them from courses you teach.')) return;
    try {
      setActionLoading(studentId);
      await axiosClient.delete(`/api/instructor/students/${studentId}`);
      await loadStudents();
      // close details if showing
      if (selectedStudent === studentId) handleCloseDetails();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to remove student');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCloseDetails = () => {
    setSelectedStudent(null);
    setStudentDetails(null);
    setStudentError(null);
    setStudentLoading(false);
  };

  if (loading) {
    return <AppLayout><div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div></AppLayout>;
  }

  return (
    <AppLayout showGreeting={false}>
      <div style={{ padding: '20px' }}>
        <div className="students-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ marginLeft: '0' }}>
            <h1 style={{ marginBottom: '20px', fontSize: '28px' }}>Students</h1>
          </div>
            <button 
              className="back-button" 
              onClick={() => navigate('/instructor/dashboard')}
              title="Go back"
              style={{ alignSelf: 'flex-start' }}
            >
              <FiArrowLeft /> Back
            </button>
            {/* search removed per request */}
          </div>
          
        </div>

        {/* Student List */}
        <div style={{
          background: '#fff',
          borderRadius: '15px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '20px',
          overflowX: 'auto'
        }}>
          {filteredStudents.length === 0 ? (
            <p>No students match your search.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee', background: '#f8f9fa' }}>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Email</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Courses</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(student => (
                  <tr key={student._id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}><strong>{student.fullName}</strong></td>
                    <td style={{ padding: '12px' }}>{student.email}</td>
                    <td style={{ padding: '12px' }}>
                      {(
                        // Prefer authoritative stats if available
                        (student.stats && typeof student.stats.totalCoursesEnrolled === 'number')
                          ? student.stats.totalCoursesEnrolled
                          // Some list endpoints attach total at top-level as `totalCoursesEnrolled` — prefer that next
                          : (typeof student.totalCoursesEnrolled === 'number'
                              ? student.totalCoursesEnrolled
                              // Otherwise derive from enrolledCourses array when present
                              : (Array.isArray(student.enrolledCourses) ? student.enrolledCourses.length : (student.enrolledInCourseCount || 0))
                            )
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        background: student.status === 'active' ? '#d4edda' : '#f8d7da',
                        color: student.status === 'active' ? '#155724' : '#721c24'
                      }}>
                        {student.status || 'active'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button 
                        onClick={() => handleViewStudent(student._id)}
                        style={{
                          padding: '6px 12px',
                          background: '#2b6cb0',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        View Details
                      </button>

                      <button
                        onClick={() => handleRemoveStudent(student._id)}
                        disabled={actionLoading === student._id}
                        style={{
                          padding: '6px 12px',
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        {actionLoading === student._id ? 'Removing...' : 'Remove'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Student Details Modal */}
        {selectedStudent && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              borderRadius: '15px',
              padding: '30px',
              maxWidth: '800px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3>Student Details</h3>
                <button 
                  onClick={handleCloseDetails}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ paddingBottom: 10 }}>
                {studentLoading && <div style={{ padding: 20 }}>Loading student details...</div>}
                {studentError && <div style={{ padding: 20, color: 'red' }}>Error: {studentError}</div>}
                {!studentLoading && !studentError && !studentDetails && <div style={{ padding: 20 }}>No details available for this student.</div>}

                {!studentLoading && !studentError && studentDetails && (
                  <div>
                    {/* Personal Info */}
                    <div style={{ marginBottom: '20px' }}>
                      <h4>Personal Information</h4>
                      <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
                        <p><strong>Name:</strong> {studentDetails.fullName || '—'}</p>
                        <p><strong>Email:</strong> {studentDetails.email || '—'}</p>
                        <p><strong>Phone:</strong> {studentDetails.phone || 'N/A'}</p>
                        <p><strong>Status:</strong> {studentDetails.status || '—'}</p>
                        <p><strong>Enrollment Date:</strong> {studentDetails.enrollmentDate ? new Date(studentDetails.enrollmentDate).toLocaleDateString() : '—'}</p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div style={{ marginBottom: '20px' }}>
                      <h4>Statistics</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div style={{ background: '#d4edda', padding: '15px', borderRadius: '8px' }}>
                          <p><strong>Total Courses:</strong> {studentDetails.stats?.totalCoursesEnrolled ?? 0}</p>
                        </div>
                        <div style={{ background: '#d1ecf1', padding: '15px', borderRadius: '8px' }}>
                          <p><strong>Completed:</strong> {studentDetails.stats?.completedCourses ?? 0}</p>
                        </div>
                        <div style={{ background: '#fff3cd', padding: '15px', borderRadius: '8px' }}>
                          <p><strong>Average Progress:</strong> {studentDetails.stats?.averageProgress ?? 0}%</p>
                        </div>
                        <div style={{ background: '#e2e3e5', padding: '15px', borderRadius: '8px' }}>
                          <p><strong>Total Hours:</strong> {studentDetails.totalHoursLearned ?? 0}h</p>
                        </div>
                      </div>
                    </div>

                    {/* Enrolled Courses */}
                    <div style={{ marginBottom: '20px' }}>
                      <h4>Enrolled Courses</h4>
                      {(studentDetails.enrolledCourses && studentDetails.enrolledCourses.length > 0) ? (
                        <div>
                          {studentDetails.enrolledCourses.map((ec, idx) => (
                            <div key={idx} style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '10px' }}>
                              <p><strong>{(ec.course && ec.course.title) || 'Unknown Course'}</strong></p>
                              <p>Progress: {Number(ec.completionPercentage) || 0}%</p>
                              <div style={{ background: '#e9ecef', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                                <div style={{ background: '#2b6cb0', height: '100%', width: `${Number(ec.completionPercentage) || 0}%` }}></div>
                              </div>
                              <p style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>
                                Hours Spent: {ec.hoursSpent ?? 0} | Lessons: {ec.completedLessons?.length || 0}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>No courses enrolled</p>
                      )}
                    </div>

                    {/* Achievements */}
                    <div>
                      <h4>Achievements</h4>
                      {(studentDetails.achievements && studentDetails.achievements.length > 0) ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' }}>
                          {studentDetails.achievements.map((achievement, idx) => (
                            <div key={idx} style={{
                              background: '#fff3cd',
                              padding: '10px',
                              borderRadius: '8px',
                              textAlign: 'center'
                            }}>
                              <p style={{ marginBottom: '5px' }}>🏅</p>
                              <p style={{ fontSize: '12px' }}>{achievement.title}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>No achievements yet</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default InstructorStudents;
