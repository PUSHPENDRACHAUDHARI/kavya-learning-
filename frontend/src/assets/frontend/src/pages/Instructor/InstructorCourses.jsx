import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import AppLayout from '../../components/AppLayout';
import './InstructorCourses.css';
import { FiArrowLeft } from 'react-icons/fi';

const InstructorCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    level: 'Beginner',
    price: 0,
    duration: '',
    thumbnail: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const res = await axiosClient.get('/api/instructor/courses');
      setCourses(res.data.data || []);
    } catch (error) {
      console.error('Failed to load courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCourse) {
        await axiosClient.put(`/api/instructor/courses/${editingCourse._id}`, formData);
      } else {
        await axiosClient.post('/api/instructor/courses', formData);
      }
      setFormData({
        title: '',
        description: '',
        category: '',
        level: 'Beginner',
        price: 0,
        duration: '',
        thumbnail: ''
      });
      setEditingCourse(null);
      setShowForm(false);
      loadCourses();
    } catch (error) {
      alert('Error saving course: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleEdit = (course) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      description: course.description,
      category: course.category,
      level: course.level,
      price: course.price,
      duration: course.duration,
      thumbnail: course.thumbnail
    });
    setShowForm(true);
  };

  const handleDelete = async (courseId) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      try {
        await axiosClient.delete(`/api/instructor/courses/${courseId}`);
        loadCourses();
      } catch (error) {
        alert('Error deleting course: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const handleManageLessons = (courseId) => {
    // Redirect to the centralized Manage Lessons page and pre-select this course
    navigate(`/instructor/lessons?courseId=${courseId}`);
  };

  if (loading) {
    return <AppLayout><div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div></AppLayout>;
  }

  return (
    <AppLayout showGreeting={false}>
      <div className="instructor-courses">
        <div className="courses-header">
          <button 
            className="back-button" 
            onClick={() => navigate('/instructor/dashboard')}
            title="Go back"
          >
            <FiArrowLeft /> Back
          </button>
          <h1>My Courses</h1>
          <button className="btn btn-primary" onClick={() => {
            setEditingCourse(null);
            setFormData({
              title: '',
              description: '',
              category: '',
              level: 'Beginner',
              price: 0,
              duration: '',
              thumbnail: ''
            });
            setShowForm(!showForm);
          }}>
            {showForm ? 'Cancel' : '+ Add Course'}
          </button>
        </div>

        {/* Form Section */}
        {showForm && (
          <div style={{
            background: '#fff',
            borderRadius: '15px',
            padding: '30px',
            marginBottom: '30px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h3>{editingCourse ? 'Edit Course' : 'Create New Course'}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <input 
                type="text" 
                name="title" 
                placeholder="Course Title" 
                value={formData.title} 
                onChange={handleChange} 
                required 
                className="form-control" 
              />
              <select name="level" value={formData.level} onChange={handleChange} className="form-control">
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
              <textarea 
                name="description" 
                placeholder="Description" 
                value={formData.description} 
                onChange={handleChange} 
                required 
                className="form-control" 
                style={{ gridColumn: '1 / -1', minHeight: '100px' }}
              ></textarea>
              <input 
                type="text" 
                name="category" 
                placeholder="Category" 
                value={formData.category} 
                onChange={handleChange} 
                required 
                className="form-control" 
              />
              <input 
                type="number" 
                name="price" 
                placeholder="Price" 
                value={formData.price} 
                onChange={handleChange} 
                className="form-control" 
              />
              <input 
                type="text" 
                name="duration" 
                placeholder="Duration (e.g., 4 weeks)" 
                value={formData.duration} 
                onChange={handleChange} 
                className="form-control" 
              />
              <input 
                type="url" 
                name="thumbnail" 
                placeholder="Thumbnail URL" 
                value={formData.thumbnail} 
                onChange={handleChange} 
                className="form-control" 
              />
              <button type="submit" className="btn btn-primary" style={{ gridColumn: '1 / -1' }}>
                {editingCourse ? 'Update Course' : 'Create Course'}
              </button>
            </form>
          </div>
        )}

        {/* Courses Table */}
        {courses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>No courses yet. Create your first course to get started!</p>
          </div>
        ) : (
          <div style={{
            background: '#fff',
            borderRadius: '15px',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            overflowX: 'auto'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee' }}>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Title</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Category</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Level</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Price</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Students</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Lessons</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Status</th>
                  <th style={{ textAlign: 'center', padding: '12px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map(course => (
                  <tr key={course._id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}><strong>{course.title}</strong></td>
                    <td style={{ padding: '12px' }}>{course.category}</td>
                    <td style={{ padding: '12px' }}>{course.level}</td>
                    <td style={{ padding: '12px' }}>₹{course.price}</td>
                    <td style={{ padding: '12px' }}>{course.enrolledStudents?.length || 0}</td>
                    <td style={{ padding: '12px' }}>{course.lessons?.length || 0}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        background: course.isPublished ? '#d4edda' : '#fff3cd',
                        color: course.isPublished ? '#155724' : '#856404'
                      }}>
                        {course.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button 
                        onClick={() => handleEdit(course)}
                        style={{ padding: '6px 10px', marginRight: '5px', background: '#2b6cb0', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleManageLessons(course._id)}
                        style={{ padding: '6px 10px', marginRight: '5px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Lessons
                      </button>
                      <button 
                        onClick={() => handleDelete(course._id)}
                        style={{ padding: '6px 10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default InstructorCourses;
