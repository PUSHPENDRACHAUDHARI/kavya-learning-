import { useState, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import './InstructorAttendance.css';

function InstructorAttendance() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceList, setAttendanceList] = useState([]);
  const [attendanceEvent, setAttendanceEvent] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/events', { headers: { Authorization: token ? `Bearer ${token}` : '' } });
        if (!res.ok) throw new Error('Failed to load events');
        const body = await res.json();
        // support both direct array or { data: [...] }
        const items = Array.isArray(body) ? body : body?.data || body?.events || [];
        setEvents(items);
      } catch (err) {
        console.error('Failed to load events', err);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const handleViewAttendance = async (event) => {
    setAttendanceLoading(true);
    setAttendanceModalOpen(true);
    setAttendanceEvent(event);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/attendance/event/${event._id}/details`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      if (!res.ok) throw new Error('Failed to fetch attendance');
      const data = await res.json();
      setAttendanceList(Array.isArray(data.attendance) ? data.attendance : data.students || []);
    } catch (err) {
      console.warn('Failed to load attendance', err);
      setAttendanceList([]);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const formatTime = (event) => {
    const start = event.startTime || 'TBD';
    const end = event.endTime || 'TBD';
    return `${start} - ${end}`;
  };

  const getCreatorName = (event) => {
    if (event.instructor) {
      if (typeof event.instructor === 'string') return event.instructor;
      return event.instructor.fullName || event.instructor.name || event.instructor.email || 'Unknown';
    }
    return 'Unknown';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'TBD';
    try { return new Date(dateStr).toLocaleDateString(); } catch (e) { return 'TBD'; }
  };

  return (
    <AppLayout>
      <div style={{ padding: 20 }}>
        <h3>Instructor Attendance</h3>

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

        {attendanceModalOpen && (
          <div className="attendance-modal-backdrop" style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1100 }} onClick={() => setAttendanceModalOpen(false)}>
            <div className="attendance-modal" style={{ width: '720px', maxHeight: '80vh', overflowY: 'auto', margin: '60px auto', background: '#fff', padding: 20, borderRadius: 8 }} onClick={(e) => e.stopPropagation()}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 style={{ margin: 0 }}>{attendanceEvent ? attendanceEvent.title || attendanceEvent.name : 'Attendance'}</h5>
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
}

export default InstructorAttendance;
