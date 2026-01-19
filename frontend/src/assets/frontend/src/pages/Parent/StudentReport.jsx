import React, { useEffect, useState } from 'react';
import axios from 'axios';
import styles from './StudentReport.module.css';

export default function StudentReport() {
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [report, setReport] = useState(null);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState(null);
  const [linkEmail, setLinkEmail] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkMessage, setLinkMessage] = useState(null);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const token = localStorage.getItem('token');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  useEffect(() => {
    const fetchChildren = async () => {
      setLoadingChildren(true);
      setError(null);
      try {
        const res = await axios.get('/api/parents/students', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setChildren(res.data.children || []);
        if (res.data.children && res.data.children.length === 1) {
          setSelectedChildId(res.data.children[0]._id);
        }
      } catch (err) {
        if (err.response && err.response.status === 404) {
          setError('No parent endpoints found on the server.');
        } else if (err.response && err.response.status === 403) {
          setError('You are not authorized to view parent reports.');
        } else {
          setError(err.message || 'Failed to fetch children');
        }
      } finally {
        setLoadingChildren(false);
      }
    };

    fetchChildren();
  }, [token]);

  const fetchReport = async (childId) => {
    if (!childId) return;
    setLoadingReport(true);
    setError(null);
    try {
      const res = await axios.get(`/api/parents/student/${childId}/report`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReport(res.data.report || null);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setError('Student not found or report not available');
      } else if (err.response && err.response.status === 403) {
        setError('This student is not linked to your account');
      } else {
        setError(err.message || 'Failed to fetch student report');
      }
      setReport(null);
    } finally {
      setLoadingReport(false);
    }
  };

  const handleLinkStudent = async () => {
    if (!linkEmail) return setLinkMessage('Enter student email to link');
    setLinking(true);
    setLinkMessage(null);
    try {
      const res = await axios.post('/api/parents/link', { email: linkEmail }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLinkMessage(res.data.message || 'Student linked');
      setToast({ visible: true, message: res.data.message || 'Student linked', type: 'success' });
      const ch = await axios.get('/api/parents/students', { headers: { Authorization: `Bearer ${token}` } });
      setChildren(ch.data.children || []);
      const linked = ch.data.children && ch.data.children.find(c => c.email === linkEmail);
      if (linked) {
        setSelectedChildId(linked._id);
        await fetchReport(linked._id);
      }
      setLinkEmail('');
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to link student';
      setLinkMessage(msg);
      setToast({ visible: true, message: msg, type: 'error' });
    } finally {
      setLinking(false);
      setTimeout(() => setLinkMessage(null), 5000);
    }
  };

  const handleUnlink = async (studentId) => {
    if (!studentId) return;
    try {
      const res = await axios.delete(`/api/parents/child/${studentId}`, { headers: { Authorization: `Bearer ${token}` } });
      setToast({ visible: true, message: res.data.message || 'Student unlinked', type: 'success' });
      const ch = await axios.get('/api/parents/students', { headers: { Authorization: `Bearer ${token}` } });
      setChildren(ch.data.children || []);
      if (selectedChildId === studentId) {
        setSelectedChildId(null);
        setReport(null);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to unlink student';
      setToast({ visible: true, message: msg, type: 'error' });
    }
  };

  useEffect(() => {
    if (!toast.visible) return;
    const t = setTimeout(() => setToast(s => ({ ...s, visible: false })), 3500);
    return () => clearTimeout(t);
  }, [toast.visible]);

  useEffect(() => {
    if (!selectedChildId) return;
    fetchReport(selectedChildId);
  }, [selectedChildId]);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Student Report Card</h2>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.layout}>
        <div className={styles.leftCardWrap}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>Select Student</div>
              <button onClick={() => setShowLinkForm(s => !s)} className={styles.linkButton}>+ Link Student</button>
            </div>

            <div style={{ minHeight: 120 }}>
              {loadingChildren ? (
                <div>Loading...</div>
              ) : children.length === 0 ? (
                <div style={{ color: '#666' }}>No students linked yet. Click "Link Student" to add one.</div>
              ) : (
                <ul className={styles.studentList}>
                  {children.map(c => (
                    <li key={c._id} className={`${styles.studentItem} ${selectedChildId === c._id ? styles.studentItemActive : ''}`} onClick={() => setSelectedChildId(c._id)}>
                      <div className={styles.studentMeta}>
                        <div className={styles.studentName}>{c.fullName}</div>
                        <div className={styles.studentEmail}>{c.email}</div>
                      </div>
                      <div>
                        <button className={styles.unlinkButton} onClick={(e) => { e.stopPropagation(); handleUnlink(c._id); }}>Unlink</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div style={{ marginTop: 12 }}>
              <button onClick={() => fetchReport(selectedChildId)} disabled={!selectedChildId || loadingReport} className={styles.showButton}>
                {loadingReport ? 'Loading...' : 'Show report'}
              </button>
            </div>

            {showLinkForm && (
              <div style={{ marginTop: 12 }}>
                <input type="email" placeholder="student email" value={linkEmail} onChange={(e) => setLinkEmail(e.target.value)} className={styles.input} />
                <div style={{ marginTop: 8 }}>
                  <button onClick={handleLinkStudent} disabled={linking} className={styles.linkButton}>{linking ? 'Linking...' : 'Link student'}</button>
                </div>
                {linkMessage && <div style={{ marginTop: 8, color: linkMessage.includes('linked') ? 'green' : 'red' }}>{linkMessage}</div>}
              </div>
            )}
          </div>
        </div>

        <div className={styles.rightPanel}>
          {!report ? (
            <div className={styles.dashedBox}>
              Select a student to view their report card
            </div>
          ) : (
            <div className={styles.reportCard}>
              <h3 style={{ marginTop: 0 }}>{report.fullName}</h3>
              <p><strong>Email:</strong> {report.email}</p>
              <p><strong>Total hours learned:</strong> {report.totalHoursLearned || 0}</p>

              <h4>Enrolled courses</h4>
              {report.enrolledCourses && report.enrolledCourses.length ? (
                <ul>
                  {report.enrolledCourses.map((ec) => (
                    <li key={ec.courseId} style={{ marginBottom: 8 }}>
                      <strong>{ec.courseTitle}</strong>
                      <div>Progress: {ec.completionPercentage}%</div>
                      <div>Completed lessons: {ec.completedLessonsCount}</div>
                      <div>Enrolled on: {ec.enrollmentDate ? new Date(ec.enrollmentDate).toLocaleDateString() : '—'}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No enrolled courses.</p>
              )}

              <h4>Achievements</h4>
              {report.achievements && report.achievements.length ? (
                <ul>
                  {report.achievements.map((a, i) => <li key={i}>{a.title || a}</li>)}
                </ul>
              ) : (
                <p>No achievements yet.</p>
              )}
            </div>
          )}
                </div>
              </div>

              {toast.visible && (
                <div className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
                  {toast.message}
                </div>
              )}
            </div>
          );
        }
