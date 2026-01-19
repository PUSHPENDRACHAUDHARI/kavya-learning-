import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import AppLayout from '../../components/AppLayout';

const AdminNotes = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const loadNotes = async () => {
    try {
      const res = await axiosClient.get('/api/admin/notes');
      setNotes(res.data.data || []);
    } catch (err) {
      console.error(err);
      alert('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert('Please choose a file');
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);

    setUploading(true);
    try {
      await axiosClient.post('/api/admin/notes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFile(null);
      setTitle('');
      loadNotes();
      alert('Uploaded successfully');
    } catch (err) {
      console.error('Upload error', err);
      alert(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm('Delete this note?');
    if (!confirmDelete) return;
    setDeleting(id);
    try {
      await axiosClient.delete(`/api/admin/notes/${id}`);
      setNotes(notes.filter(n => n._id !== id));
      alert('Deleted');
    } catch (err) {
      console.error('Delete error', err);
      alert('Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return <AppLayout><div style={{ padding: '20px' }}>Loading notes...</div></AppLayout>;

  return (
    <AppLayout showGreeting={false}>
      <div style={{ marginBottom: 20 }}>
        <h2>Notes</h2>
        <form onSubmit={handleUpload} style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 }}>
          <input type="text" placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => setFile(e.target.files[0])} />
          <button className="btn btn-primary" type="submit" disabled={uploading}>{uploading ? 'Uploading...' : 'Upload'}</button>
        </form>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Title</th>
            <th>File</th>
            <th>MIME</th>
            <th>Uploaded By</th>
            <th>Uploaded</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {notes.map(n => (
            <tr key={n._id}>
              <td>{n.title}</td>
              <td><a href={n.url} target="_blank" rel="noreferrer">Open</a></td>
              <td>{n.mimeType}</td>
              <td>{n.uploadedBy?.fullName || n.uploadedBy?.email || '-'}</td>
              <td>{new Date(n.createdAt).toLocaleString()}</td>
              <td>
                <button className="btn btn-danger" onClick={() => handleDelete(n._id)} disabled={deleting === n._id}>{deleting === n._id ? 'Deleting...' : 'Delete'}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AppLayout>
  );
};

export default AdminNotes;
