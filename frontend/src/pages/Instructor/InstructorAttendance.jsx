import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import AppLayout from '../../components/AppLayout';
import './InstructorAttendance.css';

function InstructorAttendance() {
  const [events, setEvents] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;
  // searchTerm removed per request
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
    setCurrentPage(1);
  }, []);

  // listen for events deleted elsewhere (admin) and remove locally
  useEffect(() => {
    const handler = (e) => {
      const id = e?.detail?.eventId;
      if (!id) return;
      setEvents(prev => prev.filter(ev => String(ev._id) !== String(id)));
    };
    window.addEventListener('eventDeleted', handler);
    return () => window.removeEventListener('eventDeleted', handler);
  }, []);

  // Reset to first page when events change
  useEffect(() => {
    setCurrentPage(1);
  }, [events.length]);

  // Derived lists for filtering and pagination
  const term = '';

  // remove events that have no meaningful display data (avoid rows with only '-')
  const meaningfulEvents = events.filter(ev => {
    const title = (ev.title || ev.name || '').toString().trim();
    const hasInstructor = !!(ev.instructor || ev.instructorName);
    const hasDate = !!ev.date;
    const hasTime = !!(ev.startTime || ev.endTime);
    return title !== '' || hasInstructor || hasDate || hasTime;
  });

  const filteredEvents = meaningfulEvents;
  const totalFiltered = filteredEvents.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(totalFiltered, startIndex + pageSize);
  const pagedEvents = filteredEvents.slice(startIndex, endIndex);

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

      // Prepare table data and headers (include Left At column)
      const tableHeaders = ['Student Name', 'Status', 'Joined At', 'Left At'];
      const tableData = attendanceList.map(a => {
        const studentName = a.studentName || a.name || a.email || a.studentId || 'Unknown';
        const status = a.status || 'Absent';
        const isPresent = String(status || '').toLowerCase() === 'present';
        const joinedAt = isPresent && a.joinedAt ? new Date(a.joinedAt).toLocaleString() : '-';
        const leftAt = isPresent && a.leftAt ? new Date(a.leftAt).toLocaleString() : '-';
        // For absent students ensure Joined/Left show '-'
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
            columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 30 }, 2: { cellWidth: 45 }, 3: { cellWidth: 45 } },
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

        // Define column X positions based on usableWidth
        const colWidths = [usableWidth * 0.45, usableWidth * 0.15, usableWidth * 0.2, usableWidth * 0.2];
        const colX = [marginLeft, marginLeft + colWidths[0], marginLeft + colWidths[0] + colWidths[1], marginLeft + colWidths[0] + colWidths[1] + colWidths[2]];

        // Draw header background
        doc.setFillColor(41, 108, 176);
        doc.rect(marginLeft - 2, cursorY - 6, usableWidth + 4, 8, 'F');

        // Header text
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        doc.text(tableHeaders[0], colX[0], cursorY);
        doc.text(tableHeaders[1], colX[1], cursorY);
        doc.text(tableHeaders[2], colX[2], cursorY);
        doc.text(tableHeaders[3], colX[3], cursorY);
        cursorY += lineHeight;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        doc.setTextColor(34, 34, 34);

        // Rows
        for (let i = 0; i < tableData.length; i++) {
          const row = tableData[i];
          // page break
          if (cursorY > pageHeight - 30) {
            doc.addPage();
            cursorY = 20;
          }

          // Row text aligned to columns
          doc.text(String(row[0] || '-'), colX[0], cursorY, { maxWidth: colWidths[0] - 4 });
          doc.text(String(row[1] || '-'), colX[1], cursorY, { maxWidth: colWidths[1] - 4 });
          doc.text(String(row[2] || '-'), colX[2], cursorY, { maxWidth: colWidths[2] - 4 });
          doc.text(String(row[3] || '-'), colX[3], cursorY, { maxWidth: colWidths[3] - 4 });

          // Optional row separator
          cursorY += lineHeight;
        }

        // Footer on all pages
        const pageCount = doc.internal.getNumberOfPages();
        for (let p = 1; p <= pageCount; p++) {
          doc.setPage(p);
          doc.setFontSize(8);
          doc.setFont(undefined, 'normal');
          doc.setTextColor(60,60,60);
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
      <div className="attendance-container" style={{ padding: 20 }}>
        <h3>Instructor Attendance</h3>

        {loading && <div style={{ marginTop: 18 }}>Loading events...</div>}

        {!loading && (
          <div style={{ marginTop: 24 }}>
            {events.length > 0 ? (
              <>
                <div className="attendance-header" style={{ marginBottom: 12 }}>
                <div className="search-group" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {/* search removed per request */}
                </div>
                <div className="total-events" style={{ color: '#555', fontSize: 14 }}>
                  <strong>Total Events:</strong> {meaningfulEvents.length}
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
                  {pagedEvents.map(event => (
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

              {/* Pagination Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <div style={{ color: '#555' }}>
                  Showing {filteredEvents && filteredEvents.length > 0 ? (Math.min(filteredEvents.length, (currentPage - 1) * pageSize + 1)) : 0} - {filteredEvents && filteredEvents.length > 0 ? Math.min(filteredEvents.length, currentPage * pageSize) : 0} of {filteredEvents ? filteredEvents.length : 0}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button className="btn btn-sm btn-light" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>First</button>
                  <button className="btn btn-sm btn-light" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</button>
                  <span style={{ minWidth: 120, textAlign: 'center' }}>Page {currentPage} of {Math.max(1, Math.ceil((filteredEvents ? filteredEvents.length : 0) / pageSize))}</span>
                  <button className="btn btn-sm btn-light" onClick={() => setCurrentPage(p => Math.min(Math.max(1, Math.ceil((filteredEvents ? filteredEvents.length : 0) / pageSize)), p + 1))} disabled={currentPage >= Math.ceil((filteredEvents ? filteredEvents.length : 0) / pageSize)}>Next</button>
                  <button className="btn btn-sm btn-light" onClick={() => setCurrentPage(Math.max(1, Math.ceil((filteredEvents ? filteredEvents.length : 0) / pageSize)))} disabled={currentPage >= Math.ceil((filteredEvents ? filteredEvents.length : 0) / pageSize)}>Last</button>
                </div>
              </div>
              </div>
              </>
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
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceList.map(a => {
                        const status = a.status || 'absent';
                        const isPresent = String(status).toLowerCase() === 'present';
                        const displayJoined = isPresent && a.joinedAt ? new Date(a.joinedAt).toLocaleString() : '-';
                        const displayLeft = isPresent && a.leftAt ? new Date(a.leftAt).toLocaleString() : '-';
                        return (
                        <tr key={a._id || a.studentId || a.email || Math.random()}>
                          <td>{a.studentName || a.name || a.studentEmail || a.email || a.studentId || 'Unknown'}</td>
                          <td>{attendanceEvent ? attendanceEvent.title || attendanceEvent.name : '-'}</td>
                          <td style={{ textTransform: 'capitalize' }}>{status}</td>
                          <td>{displayJoined}</td>
                        </tr>
                        );
                      })}
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
