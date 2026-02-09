import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
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
        const res = await fetch('/api/events/my-events', { headers: { Authorization: token ? `Bearer ${token}` : '' } });
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
      const rawList = Array.isArray(data.attendance) ? data.attendance : data.students || [];

      // Normalize attendance items to ensure joinedAt/leftAt and names are available
      const normalized = rawList.map(item => {
        // support nested student objects and different key names
        const studentName = item.studentName || item.student?.fullName || item.student?.name || item.studentId?.fullName || item.name || item.studentEmail || item.email || '';
        const studentEmail = item.studentEmail || item.student?.email || item.email || '';
        const status = item.status || item.attendanceStatus || (item.present ? 'Present' : (item.absent ? 'Absent' : 'Absent'));
        const joinedAt = item.joinedAt || item.joined_at || item.joinedAtISO || item.joinedAtTime || item.accessedAt || item.joined || item.createdAt || null;
        const leftAt = item.leftAt || item.left_at || item.leftAtISO || item.leftAtTime || item.left || null;
        return {
          ...item,
          studentName,
          studentEmail,
          status,
          joinedAt,
          leftAt
        };
      });

      setAttendanceList(normalized);
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

  const handleDeleteEvent = async (eventToDelete) => {
    if (!eventToDelete || !eventToDelete._id) {
      alert('Cannot delete: invalid event');
      return;
    }
    // Confirm with user
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('Delete this event? This action cannot be undone.')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/events/${eventToDelete._id}`, {
        method: 'DELETE',
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      // If server returns 404 or success, remove locally to avoid UI stuck
      if (!res.ok && res.status !== 404) {
        const errText = await res.text().catch(() => 'Delete failed');
        throw new Error(errText || 'Failed to delete event');
      }
      // Remove locally
      setEvents(prev => prev.filter(e => e._id !== eventToDelete._id));
    } catch (err) {
      console.error('Failed to delete event', err);
      alert('Failed to delete event. Check console for details.');
    }
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

  const handleDownloadAttendance = () => {
    if (!attendanceEvent || attendanceList.length === 0) {
      alert('No attendance data to download');
      return;
    }

    try {
      // Create PDF document in portrait mode (A4) to match desired layout
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginLeft = 20;
      let yPosition = 25;

      // Title (left-aligned, larger)
      doc.setFontSize(22);
      doc.setFont(undefined, 'bold');
      doc.text('Attendance Report', marginLeft, yPosition);
      yPosition += 12;

      // Event details block (left stacked)
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      const eventTitle = attendanceEvent.title || attendanceEvent.name || 'Unknown';
      const eventDate = formatDate(attendanceEvent.date);
      const eventTime = formatTime(attendanceEvent);
      const instructorName = getCreatorName(attendanceEvent);

      // Arrange details in a vertical list similar to Image 2
      doc.text(`Session: ${eventTitle}`, marginLeft, yPosition);
      yPosition += 7;
      doc.text(`Date: ${eventDate}`, marginLeft, yPosition);
      yPosition += 7;
      doc.text(`Time: ${eventTime}`, marginLeft, yPosition);
      yPosition += 7;
      doc.text(`Instructor: ${instructorName}`, marginLeft, yPosition);
      yPosition += 12;

      // Statistics (separated)
      const presentCount = attendanceList.filter(a => (a.status || '').toLowerCase() === 'present').length;
      const absentCount = attendanceList.filter(a => (a.status || '').toLowerCase() === 'absent').length;
      const totalCount = attendanceList.length;

      doc.setFont(undefined, 'bold');
      doc.setFontSize(12);
      doc.text(`Present: ${presentCount}   Absent: ${absentCount}   Total: ${totalCount}`, marginLeft, yPosition);
      yPosition += 10;

      // Prepare table data and headers
      const tableHeaders = ['Student Name', 'Status', 'Joined At', 'Left At'];
      const tableData = attendanceList.map(a => {
        const studentName = a.studentName || a.name || a.email || a.studentId || 'Unknown';
        const status = (a.status || 'Absent');
        const joinedAt = a.joinedAt ? new Date(a.joinedAt).toLocaleString() : '-';
        const leftAt = a.leftAt ? new Date(a.leftAt).toLocaleString() : '-';
        return [studentName, status, joinedAt, leftAt];
      });

      // Use autoTable with striped/grid style and a blue header like Image 2
      if (typeof doc.autoTable === 'function') {
        try {
          doc.autoTable({
            startY: yPosition,
            head: [tableHeaders],
            body: tableData,
            theme: 'striped',
            headStyles: {
              fillColor: [41, 108, 176],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              halign: 'left'
            },
            bodyStyles: { fontSize: 10, textColor: [34, 34, 34] },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 30 }, 2: { cellWidth: 40 }, 3: { cellWidth: 40 } },
            margin: { left: marginLeft, right: marginLeft },
            didDrawPage: function(data) {
              // Footer with timestamp and page number
              const pageSize = doc.internal.pageSize;
              const pH = pageSize.getHeight();
              const pW = pageSize.getWidth();
              doc.setFontSize(9);
              doc.setFont(undefined, 'normal');
              doc.text(`Generated on ${new Date().toLocaleString()}`, marginLeft, pH - 10);
              doc.text(`Page ${data.pageNumber}`, pW - marginLeft - 30, pH - 10);
            }
          });
        } catch (e) {
          console.warn('autoTable failed, falling back to manual table render', e);
          renderManualTable();
        }
      } else {
        renderManualTable();
      }

      // Manual table renderer (fallback when autoTable not available)
      function renderManualTable() {
        const marginLeft = 15;
        const marginRight = 15;
        const usableWidth = pageWidth - marginLeft - marginRight;
        const lineHeight = 6;
        let cursorY = yPosition;

        // Header
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text(tableHeaders.join(' | '), marginLeft, cursorY);
        cursorY += lineHeight;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);

        for (let i = 0; i < tableData.length; i++) {
          const row = tableData[i];
          const rowText = row.join(' | ');
          // add page if needed
          if (cursorY > pageHeight - 20) {
            doc.addPage();
            cursorY = 20;
          }
          doc.text(rowText, marginLeft, cursorY);
          cursorY += lineHeight;
        }

        // Add footer to all pages
        const pageCount = doc.internal.getNumberOfPages();
        for (let p = 1; p <= pageCount; p++) {
          doc.setPage(p);
          doc.setFontSize(8);
          doc.setFont(undefined, 'normal');
          doc.text(`Generated on ${new Date().toLocaleString()}`, 15, pageHeight - 10);
          doc.text(`Page ${p} of ${pageCount}`, pageWidth - 40, pageHeight - 10);
        }
      }

      // Generate filename and download: attendance_<sessionName>_<date>.pdf
      const sessionIsoDate = attendanceEvent && attendanceEvent.date ? new Date(attendanceEvent.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const safeTitle = eventTitle.replace(/[^a-zA-Z0-9-_]/g, '_');
      const filename = `attendance_${safeTitle}_${sessionIsoDate}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    }
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
                    <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Session</th>
                    <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Date</th>
                    <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Time</th>
                    <th style={{ padding: 12, textAlign: 'center', fontWeight: 600 }}>Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(event => (
                      <tr key={event._id} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: 12 }}>{getCreatorName(event)}</td>
                      <td style={{ padding: 12 }}>{event.title || event.name || '-'}</td>
                      <td style={{ padding: 12 }}>{formatDate(event.date)}</td>
                      <td style={{ padding: 12 }}>{formatTime(event)}</td>
                      <td style={{ padding: 12, textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleViewAttendance(event)}
                          >
                            View Attendance
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDeleteEvent(event)}
                          >
                            Delete
                          </button>
                        </div>
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
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-sm btn-success" onClick={handleDownloadAttendance} disabled={attendanceLoading}>Download PDF</button>
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
                        <th>Session</th>
                        <th>Status</th>
                        <th>Joined At</th>
                        <th>Left At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceList.map(a => (
                        <tr key={a._id || a.studentId || a.email || Math.random()}>
                          <td>{a.studentName || a.name || a.studentEmail || a.email || a.studentId || 'Unknown'}</td>
                          <td>{attendanceEvent ? attendanceEvent.title || attendanceEvent.name : '-'}</td>
                          <td style={{ textTransform: 'capitalize' }}>{a.status || 'absent'}</td>
                          <td>{a.joinedAt ? new Date(a.joinedAt).toLocaleString() : '-'}</td>
                          <td>{a.leftAt ? new Date(a.leftAt).toLocaleString() : '-'}</td>
                        </tr>
                      ))}
                      {attendanceList.length === 0 && (
                        <tr>
                          <td colSpan={5}>No attendance records yet</td>
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
