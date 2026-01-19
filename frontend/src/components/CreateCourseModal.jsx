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
    status: 'active',
    resourceUrl: '',
    resourceName: ''
  });
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Only PDF files are allowed.');
      return;
    }
    setSelectedFile(file);
    setFormData(prev => ({ ...prev, resourceName: file.name }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Create course first
      const createRes = await axiosClient.post('/api/admin/courses', formData);
      const created = createRes.data;
      // created may be the course object or { data: course }
      const course = created && created._id ? created : (created.data || created);

      // If a PDF was selected, upload it to the server and attach to the course
      if (selectedFile && course && course._id) {
        try {
          setUploading(true);
          setUploadProgress(0);
          const payload = new FormData();
          payload.append('pdfResource', selectedFile);
          const uploadRes = await axiosClient.post(`/api/admin/course/upload-pdf/${course._id}`, payload, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
              const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
              setUploadProgress(percent);
            }
          });
          if (uploadRes && uploadRes.data && uploadRes.data.pdfResource) {
            // update local form state to reflect uploaded URL
            setFormData(prev => ({ ...prev, resourceUrl: uploadRes.data.pdfResource, resourceName: uploadRes.data.pdfResourceName || prev.resourceName }));
          }
        } catch (err) {
          alert('PDF upload failed: ' + (err.response?.data?.message || err.message));
        } finally {
          setUploading(false);
        }
      }

      setFormData({ 
        title: '', 
        description: '', 
        category: '', 
        level: 'Beginner', 
        duration: '', 
        price: 0,
        status: 'active',
        resourceUrl: '',
        resourceName: ''
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

      <div style={{ gridColumn: '1 / -1' }}>
        <label style={{ display: 'block', marginBottom: 6 }}>Upload PDF resource (optional)</label>
        <input type="file" accept="application/pdf" onChange={handleFileChange} className="form-control" />
        {selectedFile && <div style={{ marginTop: 8 }}>Selected: {selectedFile.name}</div>}
        {uploading && <div style={{ marginTop: 8 }}>Uploading... {uploadProgress}%</div>}
        {formData.resourceUrl && (
          <div style={{ marginTop: 8 }}>
            Uploaded: <a href={formData.resourceUrl} target="_blank" rel="noopener noreferrer">{formData.resourceName || 'View file'}</a>
          </div>
        )}
      </div>

      <button type="submit" className="btn btn-primary" style={{ gridColumn: '1 / -1' }}>Create Course</button>
    </form>
  );
};

export default CreateCourseModal;
