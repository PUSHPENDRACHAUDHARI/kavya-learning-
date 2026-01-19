import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import AppLayout from '../../components/AppLayout';
import { FiArrowLeft } from 'react-icons/fi';
import './InstructorLessons.css';

const InstructorLessons = () => {
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
    // Load initial data and respect optional ?courseId query param or location state
    const params = new URLSearchParams(location.search);
    const initialCourse = params.get('courseId') || location.state?.courseId;
    if (initialCourse) setSelectedCourse(initialCourse);
    loadCoursesAndLessons();
  }, []);

  // When course filter changes, fetch lessons for that course only
  useEffect(() => {
    const fetchForCourse = async () => {
      try {
        setLoading(true);
        if (!selectedCourse) {
          // reload aggregated lessons for all courses
          await loadCoursesAndLessons();
          return;
        }
        const res = await axiosClient.get(`/api/instructor/courses/${selectedCourse}/lessons`);
        // attach courseId for consistency with aggregated results
        const courseLessons = (res.data.data || []).map(l => ({ ...l, courseId: selectedCourse }));
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
        axiosClient.get('/api/instructor/courses'),
        // backend exposes lessons per course; aggregate for all courses
        // we'll fetch lessons per course after we have the courses list
      ]);

      setCourses(coursesRes.data.data || []);
      const coursesList = coursesRes.data.data || [];

      // fetch lessons per course and combine
      const lessonsPromises = coursesList.map(c =>
        axiosClient.get(`/api/instructor/courses/${c._id}/lessons`).then(r => r.data.data || []).catch(() => [])
      );
      const lessonsResults = await Promise.all(lessonsPromises);
      // lessonsResults is an array of lesson arrays per course. Attach courseId to each lesson
      const aggregated = lessonsResults.flatMap((arr, idx) => {
        const courseId = coursesList[idx]._id;
        return (arr || []).map(lesson => ({ ...lesson, courseId }));
      });
      setLessons(aggregated);
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
      // Ensure a course is selected before creating a lesson
      if (!selectedCourse) {
        alert('Please select a course before creating a lesson.');
        return;
      }

      // Validate required fields
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

      // Parse duration - extract number from string like "45 min" or "45"
      let durationNum = 0;
      if (formData.duration && formData.duration.trim()) {
        const match = formData.duration.match(/(\d+(?:\.\d+)?)/);
        durationNum = match ? Number(match[1]) : 0;
      }
      if (durationNum <= 0) {
        alert('Please enter a valid duration (e.g., "45" or "45 min").');
        return;
      }

      // Prepare payload with proper types
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        content: formData.content.trim(),
        duration: durationNum
      };

      // Only add optional fields if they have values
      if (formData.videoUrl && formData.videoUrl.trim()) {
        payload.videoUrl = formData.videoUrl.trim();
      }

      if (editingLesson) {
        // update existing lesson - course change not allowed here
        console.log('Updating lesson with payload:', payload);
        await axiosClient.put(`/api/instructor/lessons/${editingLesson._id}`, payload);
      } else {
        // create under selected course
        // compute a client-side fallback order (max existing order + 1) to avoid server validation errors
        const courseLessons = lessons.filter(l => l.courseId === selectedCourse);
        const maxOrder = courseLessons.length ? Math.max(...courseLessons.map(l => Number(l.order || 0))) : 0;
        const nextOrder = maxOrder + 1;

        const createPayload = {
          ...payload,
          order: nextOrder
        };
        console.log('Creating lesson with payload:', JSON.stringify(createPayload, null, 2));
        await axiosClient.post(`/api/instructor/courses/${selectedCourse}/lessons`, createPayload);
      }
      // Reload and only show success after reload completes
      await loadCoursesAndLessons();
      setShowForm(false);
      setFormData({
        title: '',
        description: '',
        content: '',
        videoUrl: '',
        duration: ''
      });
      setEditingLesson(null);
    } catch (error) {
      console.error('Error saving lesson:', error);
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      const errorMsg = error.response?.data?.message || error.message;
      alert('Error saving lesson: ' + errorMsg);
    }
  };

  const handleEdit = (lesson) => {
    setEditingLesson(lesson);
    setSelectedCourse(lesson.courseId);
    
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
        await axiosClient.delete(`/api/instructor/lessons/${lessonId}`);
        loadCoursesAndLessons();
      } catch (error) {
        alert('Error deleting lesson: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  if (loading) {
    return <AppLayout><div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div></AppLayout>;
  }

  const filteredLessons = selectedCourse ? lessons.filter(l => l.courseId === selectedCourse) : lessons;

  return (
    <AppLayout showGreeting={false}>
      <div className="instructor-lessons">
        <div className="lessons-header">
          <button
            className="back-button"
            onClick={() => navigate('/instructor/dashboard')}
            title="Go back"
          >
            <FiArrowLeft /> Back
          </button>
          <h1>Manage Lessons</h1>
        </div>

        {/* Course Filter */}
        <div className="course-filter">
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="course-select"
          >
            <option value="">All Courses</option>
            {courses.map(course => (
              <option key={course._id} value={course._id}>
                {course.title}
              </option>
            ))}
          </select>
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditingLesson(null);
              setFormData({
                title: '',
                description: '',
                content: '',
                videoUrl: '',
                duration: ''
              });
              setShowForm(!showForm);
            }}
          >
            {showForm ? 'Cancel' : '+ Add Lesson'}
          </button>
        </div>

        {/* Form Section */}
        {showForm && (
          <div className="lesson-form-container">
            <h3>{editingLesson ? 'Edit Lesson' : 'Create New Lesson'}</h3>
            <form onSubmit={handleSubmit} className="lesson-form">
              <input
                type="text"
                name="title"
                placeholder="Lesson Title"
                value={formData.title}
                onChange={handleInputChange}
                className="form-control"
                required
              />
              <textarea
                name="description"
                placeholder="Lesson Description"
                value={formData.description}
                onChange={handleInputChange}
                className="form-control"
                rows="3"
              />
              <textarea
                name="content"
                placeholder="Lesson Content"
                value={formData.content}
                onChange={handleInputChange}
                className="form-control"
                rows="5"
              />
              <input
                type="text"
                name="videoUrl"
                placeholder="Video URL (optional)"
                value={formData.videoUrl}
                onChange={handleInputChange}
                className="form-control"
              />
              <input
                type="text"
                name="duration"
                placeholder="Duration (e.g., 45 min)"
                value={formData.duration}
                onChange={handleInputChange}
                className="form-control"
              />
              <div className="form-buttons">
                <button type="submit" className="btn btn-success">
                  {editingLesson ? 'Update Lesson' : 'Create Lesson'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lessons List */}
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
                  <p className="lesson-content-preview">{lesson.content?.substring(0, 100)}...</p>
                  <div className="lesson-card-footer">
                    <button
                      className="btn-edit"
                      onClick={() => handleEdit(lesson)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(lesson._id)}
                    >
                      Delete
                    </button>
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

export default InstructorLessons;
