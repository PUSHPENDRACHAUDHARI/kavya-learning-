import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import DurationPicker from './DurationPicker';

const CreateCourseModal = ({ isOpen, onClose, onSuccess, course }) => {
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
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Prevent special characters in category field
    if (name === 'category') {
      if (/[@#$%!]/.test(value)) {
        alert('Category cannot contain special characters: @, #, $, %, !');
        return;
      }
    }
    
    // Validate numeric fields to prevent negative values
    if (name === 'price') {
      const numValue = parseFloat(value);
      if (value !== '' && numValue < 0) {
        alert('Price must be greater than or equal to 0');
        return;
      }
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Initialize form when editing existing course
  useEffect(() => {
    if (course) {
      setFormData({
        title: course.title || '',
        description: course.description || '',
        category: course.category || '',
        level: course.level || 'Beginner',
        duration: course.duration || '',
        price: course.price ?? 0,
        status: course.status || 'active',
        resourceUrl: course.resourceUrl || course.pdfResource || '',
        resourceName: course.resourceName || ''
      });
    }
  }, [course]);

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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file for the thumbnail.');
      return;
    }
    setSelectedImage(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate price is not negative
    if (parseFloat(formData.price) < 0) {
      alert('Price must be greater than or equal to 0');
      return;
    }
    
    try {
      let courseResponse;
      if (course && course._id) {
        // update existing
        courseResponse = await axiosClient.put(`/api/admin/courses/${course._id}`, formData);
      } else {
        // Create course first
        const createRes = await axiosClient.post('/api/admin/courses', formData);
        courseResponse = createRes.data;
      }
      const created = courseResponse;
      const createdCourse = created && created._id ? created : (created.data || created);

      // If an image was selected, upload it to the server and attach as thumbnail
      if (selectedImage && course && course._id) {
        try {
          const imgPayload = new FormData();
          imgPayload.append('file', selectedImage);
          const uploadRes = await axiosClient.post('/api/uploads', imgPayload, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          const imageUrl = uploadRes?.data?.url || uploadRes?.data?.secure_url || uploadRes?.data?.data?.url;
          if (imageUrl) {
            // update admin course thumbnail
            await axiosClient.put(`/api/admin/courses/${course._id}`, { thumbnail: imageUrl });
          }
        } catch (err) {
          console.warn('Image upload failed', err?.response?.data || err.message || err);
        }
      }

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
      setSelectedImage(null);
      onSuccess();
      onClose();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  if (!isOpen) return null;

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
      <div style={{ gridColumn: '1 / -1' }}>
        <label htmlFor="title" style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Course Title</label>
        <input id="title" type="text" name="title" placeholder="Course Title" value={formData.title} onChange={handleChange} required className="form-control" />
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <label htmlFor="description" style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Description</label>
        <textarea id="description" name="description" placeholder="Description" value={formData.description} onChange={handleChange} className="form-control" style={{ minHeight: '100px' }}></textarea>
      </div>
      <div>
        <label htmlFor="category" style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Category</label>
        <input id="category" type="text" name="category" placeholder="Category" value={formData.category} onChange={handleChange} required className="form-control" />
      </div>
      <div>
        <label htmlFor="level" style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Level</label>
        <select id="level" name="level" value={formData.level} onChange={handleChange} className="form-control">
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Advanced">Advanced</option>
        </select>
      </div>
      <div>
        <label htmlFor="duration" style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Duration</label>
        <DurationPicker mode="units" selectPosition="right" showIcon={true} value={formData.duration} onChange={(v) => setFormData(prev => ({ ...prev, duration: v }))} />
      </div>
      <div>
        <label htmlFor="price" style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Price</label>
        <input id="price" type="number" name="price" placeholder="Price" value={formData.price} onChange={handleChange} required className="form-control" min="0" step="0.01" />
      </div>
      <div>
        <label htmlFor="status" style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Status</label>
        <select id="status" name="status" value={formData.status} onChange={handleChange} className="form-control">
        <option value="draft">Draft</option>
        <option value="active">Active</option>
        <option value="archived">Archived</option>
      </select>
      </div>

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

      <div style={{ gridColumn: '1 / -1' }}>
        <label style={{ display: 'block', marginBottom: 6 }}>Upload Thumbnail image (optional)</label>
        <input type="file" accept="image/*" onChange={handleImageChange} className="form-control" />
        {selectedImage && <div style={{ marginTop: 8 }}>Selected image: {selectedImage.name}</div>}
      </div>

      <button type="submit" className="btn btn-primary" style={{ gridColumn: '1 / -1' }}>Create Course</button>
    </form>
  );
};

export default CreateCourseModal;
