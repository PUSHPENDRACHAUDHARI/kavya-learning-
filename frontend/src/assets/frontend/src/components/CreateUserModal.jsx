import React, { useState } from 'react';
import axiosClient from '../api/axiosClient';

const CreateUserModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '', role: 'student', phone: '', status: 'active' });
  const [phoneExists, setPhoneExists] = useState(null);
  const [checkingPhone, setCheckingPhone] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // special-case the visible phone input which we name `phone_input` to avoid browser autofill
    if (name === 'phone_input') {
      const next = value.replace(/\D/g, '').slice(0, 10);
      setPhoneExists(null);
      setFormData(prev => ({ ...prev, phone: next }));
      return;
    }
    let next = value;
    setFormData(prev => ({ ...prev, [name]: next }));
  };

  const checkPhone = async (phone) => {
    if (!phone) return setPhoneExists(null);
    // only check when phone is exactly 10 digits
    if (!/^\d{10}$/.test(phone)) {
      setPhoneExists(null);
      return;
    }
    setCheckingPhone(true);
    try {
      const res = await axiosClient.get(`/api/admin/users/check-phone?phone=${encodeURIComponent(phone)}`);
      setPhoneExists(res.data.exists);
    } catch (err) {
      setPhoneExists(null);
    } finally {
      setCheckingPhone(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (phoneExists) return alert('Phone number already exists in database');
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
    <form onSubmit={handleSubmit} autoComplete="off" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
      {/* Hidden fields to prevent browser autofill of email/password */}
      <input type="text" name="prevent_autofill_username" autoComplete="username" style={{ display: 'none' }} />
      <input type="password" name="prevent_autofill_password" autoComplete="new-password" style={{ display: 'none' }} />
      <input type="text" name="fullName" placeholder="Full Name" value={formData.fullName} onChange={handleChange} required className="form-control" autoComplete="name" />
      <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required className="form-control" autoComplete="off" />
      <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} required className="form-control" autoComplete="new-password" />
      {/* Role should remain student for this form - keep hidden and display text */}
      <input type="hidden" name="role" value="student" />
      <input type="text" readOnly value="Student" className="form-control" />
      <input
        type="tel"
        name="phone_input"
        placeholder="Phone"
        value={formData.phone}
        onChange={handleChange}
        onBlur={() => checkPhone(formData.phone)}
        className="form-control"
        maxLength={10}
        autoComplete="off"
        inputMode="numeric"
        pattern="[0-9]*"
      />
      {formData.phone && formData.phone.length !== 10 && <div style={{ color: '#b55', gridColumn: '1 / -1' }}>Phone must be exactly 10 digits</div>}
      <select name="status" value={formData.status} onChange={handleChange} className="form-control">
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
      {phoneExists === true && <div style={{ color: 'red', gridColumn: '1 / -1' }}>Phone number already in use</div>}
      <button type="submit" className="btn btn-primary" style={{ gridColumn: '1 / -1' }} disabled={checkingPhone || phoneExists === true || (formData.phone && formData.phone.length !== 10)}>Create Student</button>
    </form>
  );
};

export default CreateUserModal;
