import React, { useEffect, useState, useMemo } from 'react';
import axiosClient from '../../api/axiosClient';
import AppLayout from '../../components/AppLayout';
import CreateCourseModal from '../../components/CreateCourseModal';
import '../../assets/admin-dark-mode.css';

const AdminCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  // Search state
  const [titleQuery, setTitleQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');

  const loadCourses = async () => {
    try {
      const res = await axiosClient.get('/api/admin/courses');
      setCourses(res.data.data || res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId, courseName) => {
    // Show confirmation dialog
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the course "${courseName}"?\n\nThis will remove the course from:\n- Admin Panel\n- All student enrollments\n- Subscription pages\n- Course listings\n\nThis action cannot be undone.`
    );

    if (!confirmDelete) {
      return;
    }

    setDeleting(courseId);
    setDeleteError('');

    try {
      await axiosClient.delete(`/api/admin/courses/${courseId}`);
      
      // Remove course from local state
      setCourses(courses.filter(c => c._id !== courseId));
      
      // Show success message
      alert('Course deleted successfully!');
    } catch (err) {
      console.error('Error deleting course:', err);
      const errorMessage = err.response?.data?.message || 'Failed to delete course. Please try again.';
      setDeleteError(errorMessage);
      alert(`Error: ${errorMessage}`);
    } finally {
      setDeleting(null);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const filteredCourses = useMemo(() => {
    let out = courses.filter((c) => {
      const q = (titleQuery || '').toLowerCase().trim();
      if (q && !(c.title || '').toLowerCase().includes(q)) return false;
      if (levelFilter && levelFilter !== 'all') {
        return (c.level || '').toLowerCase() === levelFilter;
      }
      return true;
    });
    return out;
  }, [courses, titleQuery, levelFilter]);

  if (loading) return <AppLayout><div style={{ padding: '20px', textAlign: 'center' }}>Loading courses...</div></AppLayout>;

  return (
    <AppLayout showGreeting={false}>
      {/* FORM SECTION */}
      {showForm && (
        <div className="add-course-panel" style={{
          background: '#fff',
          borderRadius: '15px',
          padding: '30px',
          marginBottom: '30px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h3>Add New Course</h3>
            <button 
              className="btn btn-secondary" 
              onClick={() => setShowForm(false)}
              style={{ padding: '8px 16px' }}
            >
              ✕ Close
            </button>
          </div>
          <CreateCourseModal
            isOpen={true}
            onClose={() => setShowForm(false)}
            onSuccess={() => {
              loadCourses();
              setShowForm(false);
            }}
          />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 className="admin-heading">Courses</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Hide Form" : "Add Course"}
        </button>
      </div>
      {/* Search controls */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search by title..."
          value={titleQuery}
          onChange={e => setTitleQuery(e.target.value)}
          style={{ padding: 8, width: 280 }}
        />

        <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)} style={{ padding: 8 }}>
          <option value="all">All levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advance">Advance</option>
        </select>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Category</th>
            <th>Level</th>
            <th>Status</th>
            <th>Duration (hrs)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredCourses.map((c) => (
            <tr key={c._id}>
              <td>{c.title}</td>
              <td>{c.category}</td>
              <td>{c.level}</td>
              <td>{c.status}</td>
              <td>{c.durationHours}</td>
              <td>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDeleteCourse(c._id, c.title)}
                  disabled={deleting === c._id}
                  style={{
                    padding: '6px 12px',
                    fontSize: '14px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: deleting === c._id ? 'not-allowed' : 'pointer',
                    opacity: deleting === c._id ? 0.6 : 1
                  }}
                >
                  {deleting === c._id ? 'Deleting...' : 'Delete'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AppLayout>
  );
};

export default AdminCourses;
