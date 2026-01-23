import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import AppLayout from '../../components/AppLayout';
import DurationPicker from '../../components/DurationPicker';
import { FiArrowLeft } from 'react-icons/fi';
import '../Instructor/InstructorLessons.css';

const AdminLessons = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [courses, setCourses] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    videoUrl: '',
    duration: ''
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const initialCourse = params.get('courseId') || location.state?.courseId;
    if (initialCourse) setSelectedCourse(initialCourse);
    loadCoursesAndLessons();
  }, []);

  useEffect(() => {
    const fetchForCourse = async () => {
      try {
        setLoading(true);
        if (!selectedCourse) {
          await loadCoursesAndLessons();
          return;
        }
        const res = await axiosClient.get(`/api/lessons?courseId=${selectedCourse}`);
        const courseLessons = (res.data || []).map(l => ({ ...l, courseId: selectedCourse }));
        setLessons(courseLessons);
      } catch (error) {
        console.error('Failed to load lessons for course:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchForCourse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourse]);

  const loadCoursesAndLessons = async () => {
    try {
      const [coursesRes, lessonsRes] = await Promise.all([
        axiosClient.get('/api/admin/courses'),
        axiosClient.get('/api/lessons')
      ]);

      const coursesList = coursesRes.data.data || coursesRes.data || [];
      setCourses(coursesList);

      const lessonsList = (lessonsRes.data || lessonsRes).data || lessonsRes.data || lessonsRes || [];
      // Normalize lessons to include courseId property
      const normalized = (Array.isArray(lessonsList) ? lessonsList : []).map(l => ({ ...l, courseId: l.course }));
      setLessons(normalized);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!selectedCourse) {
        alert('Please select a course before creating a lesson.');
        return;
      }

      if (!formData.title || !formData.title.trim()) {
        alert('Please enter a lesson title.');
        return;
      }
      if (!formData.description || !formData.description.trim()) {
        alert('Please enter a lesson description.');
        return;
      }
      if (!formData.content || !formData.content.trim()) {
        alert('Please enter lesson content.');
        return;
      }

      let durationNum = 0;
      if (formData.duration !== undefined && formData.duration !== null && String(formData.duration).trim() !== '') {
        if (typeof formData.duration === 'number') {
          durationNum = formData.duration;
        } else {
          const match = String(formData.duration).match(/(\d+(?:\.\d+)?)/);
          durationNum = match ? Number(match[1]) : 0;
        }
      }
      if (durationNum <= 0) {
        alert('Please enter a valid duration in minutes (e.g., 1h 30m or 90).');
        return;
      }

      const payload = {
        courseId: selectedCourse,
        title: formData.title.trim(),
        description: formData.description.trim(),
        content: formData.content.trim(),
        duration: durationNum
      };

      if (formData.videoUrl && formData.videoUrl.trim()) payload.videoUrl = formData.videoUrl.trim();

      if (editingLesson) {
        await axiosClient.put(`/api/lessons/${editingLesson._id}`, payload);
      } else {
        // compute order fallback
        const courseLessons = lessons.filter(l => (l.course || l.courseId) === selectedCourse);
        const maxOrder = courseLessons.length ? Math.max(...courseLessons.map(l => Number(l.order || 0))) : 0;
        const nextOrder = maxOrder + 1;
        const createPayload = { ...payload, order: nextOrder };
        await axiosClient.post('/api/lessons', createPayload);
      }

      await loadCoursesAndLessons();
      setShowForm(false);
      setFormData({ title: '', description: '', content: '', videoUrl: '', duration: '' });
      setEditingLesson(null);
    } catch (error) {
      console.error('Error saving lesson:', error);
      const errorMsg = error.response?.data?.message || error.message;
      alert('Error saving lesson: ' + errorMsg);
    }
  };

  const handleEdit = (lesson) => {
    setEditingLesson(lesson);
    setSelectedCourse(lesson.course || lesson.courseId);
    setFormData({
      title: lesson.title,
      description: lesson.description,
      content: lesson.content,
      videoUrl: lesson.videoUrl || '',
      duration: lesson.duration
    });
    setShowForm(true);
  };

  const handleDelete = async (lessonId) => {
    if (window.confirm('Are you sure you want to delete this lesson?')) {
      try {
        await axiosClient.delete(`/api/lessons/${lessonId}`);
        loadCoursesAndLessons();
      } catch (error) {
        alert('Error deleting lesson: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  if (loading) {
    return <AppLayout><div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div></AppLayout>;
  }

  const filteredLessons = selectedCourse ? lessons.filter(l => (l.course || l.courseId) === selectedCourse) : lessons;

  return (
    <AppLayout showGreeting={false}>
      <div className="instructor-lessons">
        <div className="lessons-header"><h1>Manage Lessons (Admin)</h1></div>
        <div className="lessons-header">
          <button
            className="back-button"
            onClick={() => navigate('/admin/dashboard')}
            title="Go back"
          >
            <FiArrowLeft /> Back
          </button>
        </div>

        <div className="course-filter">
          <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className="course-select">
            <option value="">All Courses</option>
            {courses.map(course => (
              <option key={course._id} value={course._id}>{course.title}</option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={() => { setEditingLesson(null); setFormData({ title: '', description: '', content: '', videoUrl: '', duration: '' }); setShowForm(!showForm); }}>
            {showForm ? 'Cancel' : '+ Add Lesson'}
          </button>
        </div>

        {showForm && (
          <div className="lesson-form-container">
            <h3>{editingLesson ? 'Edit Lesson' : 'Create New Lesson'}</h3>
            <form onSubmit={handleSubmit} className="lesson-form">
              <input type="text" name="title" placeholder="Lesson Title" value={formData.title} onChange={handleInputChange} className="form-control" required />
              <textarea name="description" placeholder="Lesson Description" value={formData.description} onChange={handleInputChange} className="form-control" rows="3" />
              <textarea name="content" placeholder="Lesson Content" value={formData.content} onChange={handleInputChange} className="form-control" rows="5" />
              <input type="text" name="videoUrl" placeholder="Video URL (optional)" value={formData.videoUrl} onChange={handleInputChange} className="form-control" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ marginRight: 8, color: '#333', minWidth: 80 }}>Duration</label>
                <DurationPicker mode="hm" value={formData.duration} onChange={(v) => setFormData(prev => ({ ...prev, duration: v }))} />
              </div>
              <div className="form-buttons">
                <button type="submit" className="btn btn-success">{editingLesson ? 'Update Lesson' : 'Create Lesson'}</button>
              </div>
            </form>
          </div>
        )}

        <div className="lessons-list-container">
          {filteredLessons.length === 0 ? (
            <p className="no-data">No lessons found. {selectedCourse && 'Create one to get started!'}</p>
          ) : (
            <div className="lessons-grid">
              {filteredLessons.map(lesson => (
                <div key={lesson._id} className="lesson-card">
                  <div className="lesson-card-header">
                    <h3>{lesson.title}</h3>
                    <span className="lesson-duration">{lesson.duration}</span>
                  </div>
                  <p className="lesson-description">{lesson.description}</p>
                  <p className="lesson-content-preview">{(lesson.content || '').substring(0,100)}...</p>
                  <div className="lesson-card-footer">
                    <button className="btn-edit" onClick={() => handleEdit(lesson)}>Edit</button>
                    <button className="btn-delete" onClick={() => handleDelete(lesson._id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminLessons;
