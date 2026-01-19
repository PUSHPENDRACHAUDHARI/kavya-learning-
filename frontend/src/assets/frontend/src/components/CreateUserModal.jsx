import React, { useState } from 'react';
import axiosClient from '../api/axiosClient';

const CreateUserModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '', role: 'student', phone: '', status: 'active' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axiosClient.post('/api/admin/users', formData);
      setFormData({ fullName: '', email: '', password: '', role: 'student', phone: '', status: 'active' });
      onSuccess();
      onClose();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  // If isOpen is true and we're in a page context (not modal), render as inline form
  if (!isOpen) return null;

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
      <input type="text" name="fullName" placeholder="Full Name" value={formData.fullName} onChange={handleChange} required className="form-control" />
      <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required className="form-control" />
      <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} required className="form-control" />
      <select name="role" value={formData.role} onChange={handleChange} className="form-control">
        <option value="student">Student</option>
        <option value="parent">Parent</option>
        <option value="instructor">Instructor</option>
      </select>
      <input type="tel" name="phone" placeholder="Phone" value={formData.phone} onChange={handleChange} className="form-control" />
      <select name="status" value={formData.status} onChange={handleChange} className="form-control">
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
      <button type="submit" className="btn btn-primary" style={{ gridColumn: '1 / -1' }}>Create Student</button>
    </form>
  );
};

export default CreateUserModal;
