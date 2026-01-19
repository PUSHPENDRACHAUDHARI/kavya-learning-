import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import styles from './ParentDashboard.module.css';
import AppLayout from '../../components/AppLayout';
import './ParentDashboard.css';

export default function ParentDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState({ children: [], notifications: [], upcomingEvents: [] });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      setError('');
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE}/api/parents/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
        setData(res.data || {});
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load dashboard');
      }
      setLoading(false);
    };

    fetchDashboard();
  }, []);

  const totalChildren = (data.children || []).length;
  const activeCourses = (data.children || []).reduce((set, c) => {
    (c.enrolledCount && c.enrolledCount > 0) && (c.enrolledCourses || []).forEach(ec => set.add(ec.courseId || ec.course));
    return set;
  }, new Set()).size;
  const avgProgress = (data.children && data.children.length) ? Math.round(data.children.reduce((s, c) => s + (c.avgProgress || 0), 0) / data.children.length) : 0;

  if (loading) return <AppLayout><div style={{ padding: 20, textAlign: 'center' }}>Loading parent dashboard...</div></AppLayout>;
  if (error) return <AppLayout><div style={{ padding: 20, textAlign: 'center', color: '#b91c1c' }}>{error}</div></AppLayout>;

  const storedUser = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch (e) { return {}; } })();
  const firstName = (storedUser.fullName || storedUser.name || 'Parent').split(' ')[0];

  return (
    <AppLayout showGreeting={false}>
      <div className={"parent-dashboard " + styles.page}>
        <div className={styles.content}>
          <div className="welcome-section">
            <h1>Hello, {firstName}</h1>
            <p>Welcome back to your learning journey!</p>
          </div>
        <div className="stats-grid">
          <div className="stat-card-plain">
            <div>
              <p style={{margin:0,opacity:0.95}}>Total children</p>
              <h3 style={{marginTop:6}}>{totalChildren}</h3>
            </div>
            <div style={{fontSize:28}}>👪</div>
          </div>

          <div className="stat-card-plain">
            <div>
              <p style={{margin:0,opacity:0.95}}>Active courses</p>
              <h3 style={{marginTop:6}}>{activeCourses}</h3>
            </div>
            <div style={{fontSize:28}}>📚</div>
          </div>

          <div className="stat-card-plain">
            <div>
              <p style={{margin:0,opacity:0.95}}>Average progress</p>
              <h3 style={{marginTop:6}}>{avgProgress}%</h3>
            </div>
            <div style={{fontSize:28}}>📈</div>
          </div>
        </div>

        <section className={styles.childrenSection + ' progress-section'}>
          <h2 className={styles.sectionTitle}>Children</h2>

          {data.children.length === 0 ? (
            <div className={styles.empty}>No children linked yet. Go to Student Reports to link a child.</div>
          ) : (
            <div className={styles.childrenGrid}>
              {data.children.map((c, idx) => (
                <div key={c._id || `child-${idx}`} className={styles.childCard}>
                  <div className={styles.childMeta}>
                    <div className={styles.childName}>{c.fullName}</div>
                    
                  </div>

                  <div className={styles.progressWrap}>
                    <div className={styles.progressLabel}>Progress</div>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{ width: `${Math.min(100, c.avgProgress || 0)}%` }} />
                    </div>
                    <div className={styles.progressPct}>{c.avgProgress || 0}%</div>
                  </div>

                  <div className={styles.childMetaBottom}>
                    <div>Enrolled: {c.enrolledCount}</div>
                    <div>Hours: {c.totalHoursLearned || 0}</div>
                  </div>

                  <div className={styles.cardActions}>
                    <button className={styles.viewBtn} onClick={() => navigate('/parent/student-report', { state: { childId: c._id } })}>View Details</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className={styles.sideSection}>
        <h3>Notifications</h3>
        {data.notifications.length === 0 ? <div className={styles.empty}>No recent notifications</div> : (
          <ul className={styles.notificationsList}>
            {data.notifications.map((n, idx) => (
              <li key={n._id || `note-${idx}`}><strong>{n.title}</strong><div className={styles.noteText}>{n.message}</div><div className={styles.noteTime}>{new Date(n.createdAt).toLocaleString()}</div></li>
            ))}
          </ul>
        )}

        <h3 style={{ marginTop: 18 }}>Upcoming events</h3>
        {data.upcomingEvents.length === 0 ? <div className={styles.empty}>No upcoming events</div> : (
          <ul className={styles.eventsList}>
            {data.upcomingEvents.map((e, idx) => (
              <li key={e._id || `evt-${idx}`}><strong>{e.title}</strong><div className={styles.noteText}>{new Date(e.date).toLocaleString()}</div></li>
            ))}
          </ul>
        )}
      </section>
    </div>
    </AppLayout>
  );
}