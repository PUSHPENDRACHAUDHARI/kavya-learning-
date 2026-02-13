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
  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [totalCourses, setTotalCourses] = useState(0);

  const navigate = useNavigate();

  const loadCourses = async (opts = {}) => {
    try {
      const page = opts.page || currentPage || 1;
      const limit = opts.limit || itemsPerPage;
      let url = `/api/admin/courses?page=${page}&limit=${limit}`;
      if (opts.search && String(opts.search).trim() !== '') {
        url += `&search=${encodeURIComponent(String(opts.search).trim())}`;
      }
      const res = await axiosClient.get(url);
      setCourses(res.data.data || res.data);
      setTotalCourses(res.data.total || 0);
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
      
      // Reload courses with current search/filter context
      await loadCourses({ page: 1, limit: itemsPerPage, search: searchQuery });
      
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
    loadCourses({ page: 1, limit: itemsPerPage });
  }, []);

  // When search query changes, reset to page 1 and load courses with search
  useEffect(() => {
    loadCourses({ page: 1, limit: itemsPerPage, search: searchQuery });
  }, [searchQuery]);

  // When page changes, load that page from server
  useEffect(() => {
    loadCourses({ page: currentPage, limit: itemsPerPage, search: searchQuery });
  }, [currentPage]);

  const filteredCourses = useMemo(() => {
    let out = courses.filter((c) => {
      if (levelFilter && levelFilter !== 'all') {
        return (c.level || '').toLowerCase() === levelFilter;
      }
      return true;
    });
    return out;
  }, [courses, levelFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil((totalCourses || 0) / itemsPerPage));

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
              loadCourses({ page: 1, limit: itemsPerPage, search: searchQuery });
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
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Search input - searches by title or description */}
        <input
          type="text"
          placeholder="Search by course name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '8px 10px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            fontSize: '14px',
            width: 220,
          }}
        />

        {/* Level filter */}
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
