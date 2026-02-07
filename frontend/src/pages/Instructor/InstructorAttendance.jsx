import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Download, Loader } from 'lucide-react';
import AppLayout from '../../components/AppLayout';
import './InstructorAttendance.css';

function InstructorAttendance() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceList, setAttendanceList] = useState([]);
  const [attendanceEvent, setAttendanceEvent] = useState(null);

  // Fetch all events on mount
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await axiosClient.get('/api/events');
        setEvents(Array.isArray(res.data) ? res.data : res.data?.data || []);
      } catch (err) {
        console.error('Failed to load events', err);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Handle View Attendance button click
  const handleViewAttendance = async (event) => {
    try {
      setAttendanceLoading(true);
      setAttendanceModalOpen(true);
      setAttendanceEvent(event);
      const api = await import('../../api');
      const res = await api.getAttendanceForEvent(event._id);
      if (res && Array.isArray(res.students)) setAttendanceList(res.students);
      else setAttendanceList([]);
    } catch (err) {
      console.warn('Failed to load attendance', err);
      setAttendanceList([]);
    } finally {
      setAttendanceLoading(false);
    }
  };

  // Format event time
  const formatTime = (event) => {
    const start = event.startTime || 'TBD';
    const end = event.endTime || 'TBD';
    return `${start} - ${end}`;
  };

  // Get event creator name
  const getCreatorName = (event) => {
    if (event.instructor) {
      if (typeof event.instructor === 'string') return event.instructor;
      return event.instructor.fullName || event.instructor.name || event.instructor.email || 'Unknown';
    }
    return 'Unknown';
  };

  // Format event date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'TBD';
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch (e) {
      return 'TBD';
    }
  };

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

        {loading && <div style={{ marginTop: 18 }}>Loading events...</div>}

        {!loading && (
          <div style={{ marginTop: 24 }}>
            {events.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                    <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Name</th>
                    <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Date</th>
                    <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Time</th>
                    <th style={{ padding: 12, textAlign: 'center', fontWeight: 600 }}>Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(event => (
                    <tr key={event._id} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: 12 }}>{getCreatorName(event)}</td>
                      <td style={{ padding: 12 }}>{formatDate(event.date)}</td>
                      <td style={{ padding: 12 }}>{formatTime(event)}</td>
                      <td style={{ padding: 12, textAlign: 'center' }}>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleViewAttendance(event)}
                        >
                          View Attendance
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ marginTop: 18, padding: 18, background: '#fff', borderRadius: 8 }}>
                No events available
              </div>
            )}
          </div>
        )}

        {/* Attendance Modal - Reused from Schedule */}
        {attendanceModalOpen && (
          <div className="attendance-modal-backdrop" style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1100 }} onClick={() => setAttendanceModalOpen(false)}>
            <div className="attendance-modal" style={{ width: '720px', maxHeight: '80vh', overflowY: 'auto', margin: '60px auto', background: '#fff', padding: 20, borderRadius: 8 }} onClick={(e) => e.stopPropagation()}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 style={{ margin: 0 }}>{attendanceEvent ? attendanceEvent.title : 'Attendance'}</h5>
                <div>
                  <button className="btn btn-sm btn-light" onClick={() => setAttendanceModalOpen(false)}>Close</button>
                </div>
              </div>
              {attendanceLoading ? (
                <div>Loading attendance…</div>
              ) : (
                <div>
                  <div style={{ marginBottom: 12 }}>
                    <strong>Present:</strong> {attendanceList.filter(a => (a.status || '').toLowerCase() === 'present').length} &nbsp;
                    <strong>Absent:</strong> {attendanceList.filter(a => (a.status || '').toLowerCase() === 'absent').length}
                    &nbsp; <small>({attendanceList.length} enrolled)</small>
                  </div>
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Status</th>
                        <th>Joined At</th>
                        <th>Left At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceList.map(a => (
                        <tr key={a.studentId || a.email || Math.random()}>
                          <td>{a.name || a.email || a.studentId}</td>
                          <td style={{ textTransform: 'capitalize' }}>{a.status || 'absent'}</td>
                          <td>{a.joinedAt ? new Date(a.joinedAt).toLocaleString() : '-'}</td>
                          <td>{a.leftAt ? new Date(a.leftAt).toLocaleString() : '-'}</td>
                        </tr>
                      ))}
                      {attendanceList.length === 0 && (
                        <tr>
                          <td colSpan={4}>No attendance records yet</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default InstructorAttendance;
