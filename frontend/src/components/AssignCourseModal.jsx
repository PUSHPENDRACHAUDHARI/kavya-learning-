import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';

const AssignCourseModal = ({ isOpen, onClose, instructorId, onAssigned }) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // Try to fetch from admin endpoint first, fallback to public endpoint
        let res;
        try {
          res = await axiosClient.get('/api/admin/courses?limit=500');
        } catch (adminErr) {
          console.warn('Admin courses endpoint failed, trying public endpoint', adminErr);
          res = await axiosClient.get('/api/courses?limit=100');
        }
        
        const courseList = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.courses || []);
        setCourses(courseList);
        console.log('Loaded courses:', courseList.length);
      } catch (err) {
        console.error('Failed loading courses', err);
        setError('Failed to load courses. Please try again.');
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedCourse('');
      setError(null);
    }
  }, [isOpen]);

  const handleAssign = async () => {
    if (!selectedCourse) {
      setError('Please select a course');
      return;
    }
    if (!instructorId) {
      setError('No instructor selected');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await axiosClient.put(`/api/admin/courses/${selectedCourse}`, { instructor: instructorId });
      console.log('Assignment response:', response);
      
      alert('Course assigned to instructor successfully');
      if (onAssigned) onAssigned();
      setSelectedCourse('');
      onClose();
    } catch (err) {
      console.error('Assign failed', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to assign course';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Show ALL courses available, regardless of current assignment
  const availableCourses = courses || [];

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ width: 550, maxWidth: '95%', background: 'white', borderRadius: 8, padding: 24, maxHeight: '80vh', overflowY: 'auto' }}>
        <h3 style={{ marginTop: 0, marginBottom: 20, fontSize: '18px', fontWeight: 'bold' }}>Assign Course to Instructor</h3>
        
        {error && (
          <div style={{ padding: 12, backgroundColor: '#f8d7da', color: '#721c24', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: '500', fontSize: '14px' }}>
            Select a course ({availableCourses.length} available)
          </label>
          {loading ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>Loading courses...</div>
          ) : availableCourses.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>No courses available</div>
          ) : (
            <select 
              value={selectedCourse} 
              onChange={(e) => {
                setSelectedCourse(e.target.value);
                setError(null);
              }} 
              style={{ 
                width: '100%', 
                padding: '10px', 
                borderRadius: '4px',
                border: '1px solid #ccc',
                fontSize: '14px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="">-- Select a course --</option>
              {availableCourses.map((c) => {
                const courseId = c._id || c.id;
                const courseTitle = c.title || c.name || 'Untitled';
                const instructorInfo = c.instructor ? ` (Assigned)` : ' (Unassigned)';
                return (
                  <option key={courseId} value={courseId}>
                    {courseTitle}{instructorInfo}
                  </option>
                );
              })}
            </select>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button 
            onClick={onClose} 
            style={{ 
              padding: '10px 16px', 
              borderRadius: 4,
              border: '1px solid #ccc',
              backgroundColor: '#f5f5f5',
              cursor: 'pointer',
              fontWeight: '500'
            }} 
            disabled={submitting}
          >
            Cancel
          </button>
          <button 
            onClick={handleAssign} 
            disabled={submitting || !selectedCourse} 
            style={{ 
              padding: '10px 16px', 
              backgroundColor: !selectedCourse ? '#ccc' : '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: 4,
              cursor: !selectedCourse || submitting ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              opacity: !selectedCourse || submitting ? 0.6 : 1
            }}
          >
            {submitting ? 'Assigning...' : 'Assign Course'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignCourseModal;
