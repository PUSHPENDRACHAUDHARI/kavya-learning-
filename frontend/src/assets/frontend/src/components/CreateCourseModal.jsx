import React, { useState } from 'react';
import axiosClient from '../api/axiosClient';

const CreateCourseModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({ 
    title: '', 
    description: '', 
    category: '', 
    level: 'Beginner', 
    duration: '', 
    price: 0,
    status: 'active' 
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axiosClient.post('/api/admin/courses', formData);
      setFormData({ 
        title: '', 
        description: '', 
        category: '', 
        level: 'Beginner', 
        duration: '', 
        price: 0,
        status: 'active' 
      });
      onSuccess();
      onClose();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  if (!isOpen) return null;

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
      <input type="text" name="title" placeholder="Course Title" value={formData.title} onChange={handleChange} required className="form-control" style={{ gridColumn: '1 / -1' }} />
      <textarea name="description" placeholder="Description" value={formData.description} onChange={handleChange} className="form-control" style={{ gridColumn: '1 / -1', minHeight: '100px' }}></textarea>
      <input type="text" name="category" placeholder="Category" value={formData.category} onChange={handleChange} required className="form-control" />
      <select name="level" value={formData.level} onChange={handleChange} className="form-control">
        <option value="Beginner">Beginner</option>
        <option value="Intermediate">Intermediate</option>
        <option value="Advanced">Advanced</option>
      </select>
      <input type="text" name="duration" placeholder="Duration (e.g., 4 weeks)" value={formData.duration} onChange={handleChange} required className="form-control" />
      <input type="number" name="price" placeholder="Price" value={formData.price} onChange={handleChange} required className="form-control" />
      <select name="status" value={formData.status} onChange={handleChange} className="form-control">
        <option value="draft">Draft</option>
        <option value="active">Active</option>
        <option value="archived">Archived</option>
      </select>
      <button type="submit" className="btn btn-primary" style={{ gridColumn: '1 / -1' }}>Create Course</button>
    </form>
  );
};

export default CreateCourseModal;
