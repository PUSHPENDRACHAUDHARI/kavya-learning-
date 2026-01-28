import React, { useEffect, useState } from 'react';
import AppLayout from '../../components/AppLayout';
import axiosClient from '../../api/axiosClient';
import './InstructorAttendance.css';

function InstructorAttendance() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await axiosClient.get('/api/instructor/courses');
        const data = res.data && (res.data.data || res.data) ? (res.data.data || res.data) : [];
        setCourses(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load instructor courses', err);
        setCourses([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedCourse) return;
    (async () => {
      setLoading(true);
      try {
        const res = await axiosClient.get(`/api/attendance/course/${selectedCourse}`);
        setAttendanceData(res.data || null);
      } catch (err) {
        console.error('Failed to load attendance', err);
        setAttendanceData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedCourse]);

  return (
    <AppLayout showGreeting={false}>
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Attendance</h2>
        </div>

        <div style={{ marginTop: 18, marginBottom: 18 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>Select Subject</label>
          <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className="form-control" style={{ maxWidth: 420 }}>
            <option value="">-- Select a subject --</option>
            {courses.map(c => (
              <option key={c._id} value={c._id}>{c.title}</option>
            ))}
          </select>
        </div>

        {loading && <div>Loading attendance...</div>}

        {!loading && attendanceData && (
          <div style={{ background: '#fff', padding: 18, borderRadius: 12 }}>
            <h3 style={{ marginTop: 0 }}>{attendanceData.course?.title || '—'}</h3>
            <div style={{ color: '#666', marginBottom: 12 }}>
              <div><strong>Instructor:</strong> {attendanceData.instructor?.fullName || attendanceData.instructor?.name || '—'}</div>
              <div><strong>Meeting Date:</strong> {attendanceData.event && attendanceData.event.date ? new Date(attendanceData.event.date).toLocaleString() : 'No scheduled meeting'}</div>
            </div>

            {attendanceData.event ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                    <th style={{ padding: 8 }}>Student Name</th>
                    <th style={{ padding: 8 }}>Email</th>
                    <th style={{ padding: 8 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.attendance && attendanceData.attendance.length > 0 ? (
                    attendanceData.attendance.map(a => (
                      <tr key={a.student._id} style={{ borderBottom: '1px solid #f1f1f1' }}>
                        <td style={{ padding: 8 }}>{a.student.fullName}</td>
                        <td style={{ padding: 8 }}>{a.student.email}</td>
                        <td style={{ padding: 8 }}>{a.status}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} style={{ padding: 12 }}>No attendance data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <div>No scheduled meeting for this subject.</div>
            )}
          </div>
        )}

        {!loading && !attendanceData && selectedCourse && (
          <div style={{ marginTop: 12 }}>No attendance data available</div>
        )}
      </div>
    </AppLayout>
  );
}

export default InstructorAttendance;
