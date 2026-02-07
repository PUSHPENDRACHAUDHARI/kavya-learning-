import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Download, Loader } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import '../assets/attendance.css';

const InstructorAttendance = () => {
  const navigate = useNavigate();
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [attendanceDetails, setAttendanceDetails] = useState([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Fetch attendance records on mount
  useEffect(() => {
    fetchAttendanceRecords();
  }, []);

  const fetchAttendanceRecords = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch('/api/attendance/instructor/records', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch attendance records');
      }

      const data = await response.json();
      console.log('📋 Fetched attendance records:', data);

      if (data.success && data.records) {
        setAttendanceRecords(data.records.sort((a, b) => 
          new Date(b.date) - new Date(a.date)
        ));
      }
      setError(null);
    } catch (err) {
      console.error('❌ Error fetching attendance records:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewAttendance = async (eventId, subjectName, date) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`/api/attendance/event/${eventId}/details`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch attendance details');
      }

      const data = await response.json();
      console.log('👥 Fetched attendance details:', data);

      if (data.success) {
        setSelectedEvent({
          eventId,
          title: subjectName,
          date: new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        });
        setAttendanceDetails(data.attendance || []);
        setShowDetailsModal(true);
      }
    } catch (err) {
      console.error('❌ Error fetching attendance details:', err);
      alert('Failed to fetch attendance details: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!attendanceDetails.length) return;

    let csv = 'Student Name,Email,Status,Marked At\n';
    attendanceDetails.forEach(record => {
      const markedAt = record.createdAt 
        ? new Date(record.createdAt).toLocaleString()
        : 'N/A';
      csv += `"${record.studentName}","${record.studentEmail}","${record.status}","${markedAt}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${selectedEvent.eventId}-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <AppLayout title="Instructor Attendance">
      <div className="attendance-container">
        <div className="attendance-header">
          <h1>📋 Attendance Records</h1>
          <button 
            className="btn btn-primary"
            onClick={fetchAttendanceRecords}
            disabled={loading}
          >
            {loading ? '🔄 Refreshing...' : '🔄 Refresh'}
          </button>
        </div>

        {error && (
          <div className="alert alert-danger">
            <strong>Error:</strong> {error}
          </div>
        )}

        {loading && attendanceRecords.length === 0 ? (
          <div className="loading-spinner">
            <Loader size={48} className="spinner" />
            <p>Loading attendance records...</p>
          </div>
        ) : attendanceRecords.length === 0 ? (
          <div className="empty-state">
            <p>No attendance records found</p>
            <small>Attendance will appear here once you mark students present/absent for completed classes</small>
          </div>
        ) : (
          <div className="attendance-table-wrapper">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Subject Name</th>
                  <th>Total Students</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((record, idx) => {
                  const recordDate = new Date(record.date);
                  const formattedDate = recordDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  });

                  return (
                    <tr key={idx}>
                      <td>{formattedDate}</td>
                      <td><strong>{record.subjectName}</strong></td>
                      <td>{record.totalStudents}</td>
                      <td className="present-count">{record.presentCount}</td>
                      <td className="absent-count">{record.absentCount}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-info"
                          onClick={() => handleViewAttendance(
                            record.eventId,
                            record.subjectName,
                            record.date
                          )}
                          disabled={loading}
                        >
                          <Eye size={16} />
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Attendance Details Modal */}
        {showDetailsModal && (
          <div className="modal-backdrop" onClick={() => setShowDetailsModal(false)}>
            <div className="modal-panel attendance-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>📝 Attendance Details</h3>
                <button
                  className="btn-close"
                  onClick={() => setShowDetailsModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <div className="event-info">
                  <div className="info-row">
                    <span className="label">Subject:</span>
                    <span className="value">{selectedEvent?.title}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Date:</span>
                    <span className="value">{selectedEvent?.date}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Total Students:</span>
                    <span className="value">{attendanceDetails.length}</span>
                  </div>
                </div>

                <div className="attendance-list">
                  {attendanceDetails.length === 0 ? (
                    <p className="empty-message">No attendance records found</p>
                  ) : (
                    <div className="students-grid">
                      {attendanceDetails.map((record, idx) => (
                        <div 
                          key={idx} 
                          className={`student-card ${record.status.toLowerCase()}`}
                        >
                          <div className="student-info">
                            <h4>{record.studentName}</h4>
                            <p>{record.studentEmail}</p>
                          </div>
                          <div className={`status-badge ${record.status.toLowerCase()}`}>
                            {record.status}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleDownloadCSV}
                  disabled={attendanceDetails.length === 0}
                >
                  <Download size={16} />
                  Download CSV
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default InstructorAttendance;
