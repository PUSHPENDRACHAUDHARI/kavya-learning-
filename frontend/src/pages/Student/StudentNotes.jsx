import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import AppLayout from '../../components/AppLayout';

const StudentNotes = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await axiosClient.get('/api/student/notes');
      setNotes(res.data.data || []);
    } catch (err) {
      console.error(err);
      alert('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <AppLayout><div className="student-notes-page" style={{ padding: 20, color: 'var(--text)' }}>Loading notes...</div></AppLayout>;

  return (
    <AppLayout>
      <div className="student-notes-page">
        <h2 style={{ color: 'var(--text)' }}>Notes</h2>
        {notes.length === 0 ? (
          <div style={{ color: 'var(--text)' }}>No notes available.</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {notes.map(n => (
              <li key={n._id} style={{ marginBottom: 10, color: 'var(--text)', backgroundColor: 'white', padding: '10px', borderRadius: '4px' }}>
                <a href={n.url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>{n.title}</a>
                <div style={{ fontSize: 12, color: 'black' }}>{new Date(n.createdAt).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppLayout>
  );
};

export default StudentNotes;