import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AppLayout from '../../components/AppLayout';
import LiveSessionManager from '../../components/LiveClass/LiveSessionManager';
import { FiArrowLeft } from 'react-icons/fi';

const CourseLiveSessions = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('instructor');

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    useEffect(() => {
        fetchCourseDetails();
        const role = localStorage.getItem('userRole') || 'instructor';
        setUserRole(role);
    }, [courseId]);

    const fetchCourseDetails = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/api/courses/${courseId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCourse(response.data);
        } catch (error) {
            console.error('Error fetching course details:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <AppLayout>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4">Loading course details...</p>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout showGreeting={false}>
            <div className="instructor-courses">
                <div className="courses-header">
                    <button 
                        className="back-button" 
                        onClick={() => navigate('/instructor/courses')}
                        title="Go back to courses"
                    >
                        <FiArrowLeft /> Back to Courses
                    </button>
                    
                    <div className="course-info">
                        <h1 className="courses-title">Live Sessions - {course?.title}</h1>
                        <p className="text-gray-600">Manage live class sessions for this course</p>
                    </div>
                </div>

                <div className="mt-6">
                    <LiveSessionManager courseId={courseId} userRole={userRole} />
                </div>
            </div>
        </AppLayout>
    );
};

export default CourseLiveSessions;
