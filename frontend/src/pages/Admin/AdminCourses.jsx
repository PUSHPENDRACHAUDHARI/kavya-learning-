import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEdit, FaTrash, FaBook } from 'react-icons/fa';
import axiosClient from '../../api/axiosClient';
import AppLayout from '../../components/AppLayout';
import CreateCourseModal from '../../components/CreateCourseModal';
import '../../assets/admin-dark-mode.css';

const AdminCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  // Search state
  const [titleQuery, setTitleQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');

  const navigate = useNavigate();

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
            course={editingCourse}
            onClose={() => { setShowForm(false); setEditingCourse(null); }}
            onSuccess={() => {
              loadCourses();
              setShowForm(false);
              setEditingCourse(null);
            }}
          />
        </div>
      )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h1 style={{ fontSize: 36, margin: 0 }}>Courses</h1>
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} style={{ padding: '12px 20px', borderRadius: 8 }}>
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
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Advanced">Advanced</option>
        </select>
      </div>

      <table className="table table-borderless" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>Title</th>
            <th>Category</th>
            <th>Level</th>
            <th>Price</th>
            <th>Students</th>
            <th>Lessons</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredCourses.map((c) => (
            <tr key={c._id}>
              <td>{c.title}</td>
              <td>{c.category}</td>
              <td>{c.level}</td>
              <td>{typeof c.price !== 'undefined' ? (c.price === 0 ? 'Free' : `₹${c.price}`) : (c.amount ? `₹${c.amount}` : '—')}</td>
              <td>{(c.enrolledStudents && Array.isArray(c.enrolledStudents)) ? c.enrolledStudents.length : (c.enrolledCount || 0)}</td>
              <td>{(c.lessons && Array.isArray(c.lessons)) ? c.lessons.length : (c.lessonsCount || 0)}</td>
              <td style={{ display: 'flex', gap: 8 }}>
                <button title="Edit" className="btn btn-light" onClick={() => { setEditingCourse(c); setShowForm(true); }}>
                  <FaEdit />
                </button>
                <button title="Lessons" className="btn btn-light" onClick={() => { navigate(`/admin/lessons?courseId=${c._id}`); }}>
                  <FaBook />
                </button>
                <button title="Delete" className="btn btn-danger" onClick={() => handleDeleteCourse(c._id, c.title)} disabled={deleting === c._id}>
                  <FaTrash />
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
