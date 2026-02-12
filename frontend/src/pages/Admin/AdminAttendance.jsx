import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import '../../pages/Instructor/InstructorAttendance.css';
import './AdminAttendance.css';

function AdminAttendance() {
  const [records, setRecords] = useState([]);
  const [eventsMap, setEventsMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [attendanceList, setAttendanceList] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/attendance/instructor/records', { headers: { Authorization: token ? `Bearer ${token}` : '' } });
        if (!res.ok) throw new Error('Failed to load records');
        const body = await res.json();
        setRecords(body.records || []);
        // fetch events to map titles (admin should see all events)
        try {
          const evRes = await fetch('/api/events', { headers: { Authorization: token ? `Bearer ${token}` : '' } });
          if (evRes.ok) {
            const evBody = await evRes.json();
            const map = {};
            if (Array.isArray(evBody)) {
              evBody.forEach(ev => { if (ev && ev._id) map[String(ev._id)] = ev; });
            }
            setEventsMap(map);
          }
        } catch (e) {
          console.warn('Failed to fetch events map', e);
        }
      } catch (e) {
        console.error(e);
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, records.length]);

  const viewDetails = async (eventId) => {
    setAttendanceLoading(true);
    setModalOpen(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/attendance/event/${eventId}/details`, { headers: { Authorization: token ? `Bearer ${token}` : '' } });
      if (!res.ok) throw new Error('Failed to fetch attendance details');
      const body = await res.json();
      setCurrentEvent(body.event || null);
      setAttendanceList(body.attendance || []);
    } catch (e) {
      console.error(e);
      setCurrentEvent(null);
      setAttendanceList([]);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!eventId) return;
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('Delete this event? This action cannot be undone.')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/events/${eventId}`, { method: 'DELETE', headers: { Authorization: token ? `Bearer ${token}` : '' } });
      if (!res.ok && res.status !== 404) {
        const txt = await res.text().catch(() => 'Delete failed');
        throw new Error(txt || 'Failed to delete');
      }
      // remove from local records and event map
      setRecords(prev => prev.filter(r => String(r.eventId) !== String(eventId)));
      setEventsMap(prev => {
        const copy = { ...prev };
        delete copy[String(eventId)];
        return copy;
      });
      // close modal if showing the same event
      if (currentEvent && String(currentEvent._id) === String(eventId)) {
        setModalOpen(false);
        setAttendanceList([]);
        setCurrentEvent(null);
      }
      // notify other components (Instructor) to remove event locally
      try { window.dispatchEvent(new CustomEvent('eventDeleted', { detail: { eventId } })); } catch (e) { /* ignore */ }
    } catch (e) {
      console.error('Failed to delete event', e);
      alert('Failed to delete event. See console for details.');
    }
  };

  const downloadPDF = () => {
    if (!currentEvent) return;
    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 18;
    let y = 20;
    doc.setFontSize(18);
    doc.text('Attendance Report', margin, y);
    y += 8;
    doc.setFontSize(11);
    doc.text(`Session: ${currentEvent.title || currentEvent.name || '-'}`, margin, y); y += 6;
    doc.text(`Date: ${currentEvent.date ? new Date(currentEvent.date).toLocaleDateString() : '-'}`, margin, y); y += 6;

    const headers = [['Student', 'Status', 'Joined At']];
    const body = attendanceList.map(a => [a.studentName || a.student || a.studentEmail || '-', a.status || '-', a.joinedAt ? new Date(a.joinedAt).toLocaleString() : '-']);

    if (doc.autoTable) {
      doc.autoTable({ startY: y, head: headers, body, margin: { left: margin, right: margin } });
    } else {
      // fallback simple text
      y += 6;
      body.forEach(row => {
        doc.text(row.join(' | '), margin, y);
        y += 6;
      });
    }

    const fn = `attendance_admin_${currentEvent._id || Date.now()}.pdf`;
    doc.save(fn);
  };
  // derived lists for display (map aggregated records into rows using eventsMap)
  const term = (searchTerm || '').toString().trim().toLowerCase();
  const mapped = records.map(r => {
    const ev = r.eventId ? eventsMap[String(r.eventId)] : null;
    return {
      _id: r.eventId || `${r.subjectName || 'session'}_${r.date || ''}`,
      title: (ev && (ev.title || ev.name)) || r.subjectName || '-',
      instructor: ev && ev.instructor ? (ev.instructor.fullName || ev.instructor.name) : (ev && ev.instructorName) || '-',
      date: r.date || (ev && ev.date) || null,
      startTime: ev && ev.startTime ? ev.startTime : null,
      endTime: ev && ev.endTime ? ev.endTime : null,
      presentCount: r.presentCount || 0,
      absentCount: r.absentCount || 0
    };
  });

  // filter out rows that have no meaningful display data (avoid rows showing only '-')
  const meaningfulMapped = mapped.filter(m => {
    const hasTitle = m.title && m.title !== '-';
    const hasInstructor = m.instructor && m.instructor !== '-';
    const hasDate = !!m.date;
    const hasTime = !!(m.startTime || m.endTime);
    const hasCounts = (m.presentCount && m.presentCount > 0) || (m.absentCount && m.absentCount > 0);
    return hasTitle || hasInstructor || hasDate || hasTime || hasCounts;
  });

  const source = meaningfulMapped; // use this as the base list for search/pagination
  const filtered = term ? source.filter(m => ((m.title || '') + '').toLowerCase().includes(term)) : source;
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (currentPage - 1) * pageSize;
  const end = Math.min(total, start + pageSize);
  const paged = filtered.slice(start, end);

  return (
    <AppLayout>
      <div className="attendance-container" style={{ padding: 20 }}>
        <h3>Admin Attendance</h3>

        {loading && <div style={{ marginTop: 18 }}>Loading attendance records...</div>}

        {!loading && (
          <div style={{ marginTop: 24 }}>
            {source.length === 0 ? (
              <div style={{ marginTop: 18, padding: 18, background: '#fff', borderRadius: 8 }}>No attendance records found</div>
            ) : (
              <>
              <div className="attendance-header" style={{ marginBottom: 12 }}>
                <div className="search-group" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label style={{ marginRight: 6, color: '#333', fontWeight: 600 }}>Search:</label>
                  <input
                    className="search-input"
                    type="search"
                    placeholder="Search session name"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ccc', minWidth: 260 }}
                  />
                </div>
                <div className="total-events" style={{ color: '#555', fontSize: 14 }}>
                  <strong>Total Events:</strong> {source.length}
                </div>
              </div>

              <div className="attendance-table-wrapper">
                <table className="attendance-table" style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                      <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Name</th>
                      <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Session</th>
                      <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Date</th>
                      <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Time</th>
                      <th style={{ padding: 12, textAlign: 'center', fontWeight: 600 }}>Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map(ev => (
                      <tr key={String(ev._id)} style={{ borderBottom: '1px solid #dee2e6' }}>
                        <td style={{ padding: 12 }}>{ev.instructor || '-'}</td>
                        <td style={{ padding: 12 }}>{ev.title || '-'}</td>
                        <td style={{ padding: 12 }}>{ev.date ? new Date(ev.date).toLocaleDateString() : '-'}</td>
                        <td style={{ padding: 12 }}>{ev.startTime && ev.endTime ? `${ev.startTime} - ${ev.endTime}` : '-'}</td>
                        <td style={{ padding: 12, textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                            <button className="btn btn-sm btn-outline-primary" onClick={() => viewDetails(ev._id)}>View Attendance</button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteEvent(ev._id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                  <div style={{ color: '#555' }}>
                    Showing {total > 0 ? (start + 1) : 0} - {total > 0 ? end : 0} of {total}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button className="btn btn-sm btn-light" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>First</button>
                    <button className="btn btn-sm btn-light" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</button>
                    <span style={{ minWidth: 120, textAlign: 'center' }}>Page {currentPage} of {totalPages}</span>
                    <button className="btn btn-sm btn-light" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>Next</button>
                    <button className="btn btn-sm btn-light" onClick={() => setCurrentPage(totalPages)} disabled={currentPage >= totalPages}>Last</button>
                  </div>
                </div>
              </div>
              </>
            )}
          </div>
        )}

        {modalOpen && (
          <div className="modal-backdrop" onClick={() => { setModalOpen(false); setAttendanceList([]); }}>
            <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{currentEvent ? (currentEvent.title || currentEvent.name) : 'Attendance Details'}</h3>
                <div>
                  <button className="btn btn-sm btn-success" onClick={downloadPDF} disabled={attendanceLoading}>Download PDF</button>
                  <button className="btn btn-sm btn-light" onClick={() => setModalOpen(false)}>Close</button>
                </div>
              </div>
              <div className="modal-body">
                {attendanceLoading ? (
                  <div>Loading…</div>
                ) : (
                  <div>
                    <div style={{ marginBottom: 12 }}>
                      <strong>Present:</strong> {attendanceList.filter(a => (a.status || '').toLowerCase() === 'present').length} &nbsp;
                      <strong>Absent:</strong> {attendanceList.filter(a => (a.status || '').toLowerCase() === 'absent').length}
                    </div>
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Status</th>
                          <th>Joined At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceList.map(a => (
                          <tr key={a.studentId || a.studentEmail || Math.random()}>
                            <td>{a.studentName || a.student || a.studentEmail || '-'}</td>
                            <td style={{ textTransform: 'capitalize' }}>{a.status || '-'}</td>
                            <td>{a.joinedAt ? new Date(a.joinedAt).toLocaleString() : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default AdminAttendance;
