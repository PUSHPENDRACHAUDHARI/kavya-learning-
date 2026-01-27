import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';

const AssignCourseModal = ({ isOpen, onClose, instructorId, onAssigned }) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await axiosClient.get('/api/admin/courses?limit=200');
        setCourses(res.data.data || res.data);
      } catch (err) {
        console.error('Failed loading courses', err);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) setSelectedCourse('');
  }, [isOpen]);

  const handleAssign = async () => {
    if (!selectedCourse) return alert('Please select a course');
    if (!instructorId) return alert('No instructor selected');
    setSubmitting(true);
    try {
      await axiosClient.put(`/api/admin/courses/${selectedCourse}`, { instructor: instructorId });
      alert('Course assigned to instructor');
      if (onAssigned) onAssigned();
      onClose();
    } catch (err) {
      console.error('Assign failed', err);
      alert(err?.response?.data?.message || 'Failed to assign course');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const availableCourses = (courses || []).filter((c) => {
    // allow if no instructor assigned or already assigned to this instructor
    if (!c.instructor) return true;
    const instId = c.instructor._id || c.instructor;
    return String(instId) === String(instructorId);
  });

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ width: 520, maxWidth: '95%', background: 'white', borderRadius: 8, padding: 20 }}>
        <h3 style={{ marginTop: 0 }}>Assign Course to Instructor</h3>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 6 }}>Select course</label>
          {loading ? (
            <div>Loading courses...</div>
          ) : (
            <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} style={{ width: '100%', padding: 8 }}>
              <option value="">-- Select a course --</option>
              {availableCourses.length === 0 && <option value="" disabled>No available courses</option>}
              {availableCourses.map((c) => (
                <option key={c._id || c.id} value={c._id || c.id}>{c.title || c.name || 'Untitled'}</option>
              ))}
            </select>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 12px', borderRadius: 4 }} disabled={submitting}>Cancel</button>
          <button onClick={handleAssign} disabled={submitting} style={{ padding: '8px 12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: 4 }}>
            {submitting ? 'Assigning...' : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignCourseModal;
