import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Calendar, Clock, Users, Video, Plus, Edit, Trash2, Play, Square } from 'lucide-react';

const LiveSessionManager = ({ courseId, userRole }) => {
    const navigate = useNavigate();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingSession, setEditingSession] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        scheduledStartTime: '',
        maxParticipants: 100,
        settings: {
            allowChat: true,
            allowScreenShare: true,
            muteParticipantsOnJoin: false,
            waitingRoom: false
        }
    });

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    console.log('LiveSessionManager mounted with courseId:', courseId);
    console.log('LiveSessionManager mounted with userRole:', userRole);

    useEffect(() => {
        if (courseId) {
            fetchSessions();
        } else {
            console.error('No courseId provided to LiveSessionManager');
            setError('No course ID provided');
            setLoading(false);
        }
    }, [courseId]);

    const fetchSessions = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            console.log('Fetching sessions for courseId:', courseId);
            
            const response = await axios.get(
                `${API_URL}/api/live-sessions/course/${courseId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            console.log('Sessions response:', response.data);
            setSessions(response.data);
            setError('');
        } catch (error) {
            console.error('Error fetching sessions:', error);
            console.error('Error response:', error.response?.data);
            
            if (error.response?.status === 404) {
                setError('Course not found');
            } else if (error.response?.status === 403) {
                setError('You are not authorized to access sessions for this course');
            } else if (error.code === 'ECONNREFUSED') {
                setError('Cannot connect to server. Please check if backend is running.');
            } else {
                setError(error.response?.data?.message || 'Failed to fetch sessions');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        setSuccess('');
        
        try {
            const token = localStorage.getItem('token');
            console.log('Submitting form data:', formData);
            
            if (editingSession) {
                console.log('Updating session:', editingSession._id);
                await axios.put(
                    `${API_URL}/api/live-sessions/${editingSession._id}`,
                    formData,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setSuccess('Session updated successfully!');
            } else {
                console.log('Creating new session...');
                const response = await axios.post(
                    `${API_URL}/api/live-sessions`,
                    { ...formData, courseId },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                console.log('Session created:', response.data);
                setSuccess('Session created successfully!');
            }

            setShowCreateForm(false);
            setEditingSession(null);
            setFormData({
                title: '',
                description: '',
                scheduledStartTime: '',
                maxParticipants: 100,
                settings: {
                    allowChat: true,
                    allowScreenShare: true,
                    muteParticipantsOnJoin: false,
                    waitingRoom: false
                }
            });
            fetchSessions();
        } catch (error) {
            console.error('Error saving session:', error);
            console.error('Error response:', error.response?.data);
            
            if (error.response?.status === 404) {
                setError('Course not found');
            } else if (error.response?.status === 403) {
                setError('You are not authorized to create sessions for this course');
            } else if (error.code === 'ECONNREFUSED') {
                setError('Cannot connect to server. Please check if backend is running.');
            } else {
                setError(error.response?.data?.message || 'Failed to save session');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const startSession = async (sessionId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `${API_URL}/api/live-sessions/${sessionId}/start`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setSuccess('Session started successfully!');
            fetchSessions();
        } catch (error) {
            console.error('Error starting session:', error);
            setError('Failed to start session');
        }
    };

    const endSession = async (sessionId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `${API_URL}/api/live-sessions/${sessionId}/end`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setSuccess('Session ended successfully!');
            fetchSessions();
        } catch (error) {
            console.error('Error ending session:', error);
            setError('Failed to end session');
        }
    };

    const deleteSession = async (sessionId) => {
        if (!window.confirm('Are you sure you want to delete this session?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await axios.delete(
                `${API_URL}/api/live-sessions/${sessionId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setSuccess('Session deleted successfully!');
            fetchSessions();
        } catch (error) {
            console.error('Error deleting session:', error);
            setError('Failed to delete session');
        }
    };

    const editSession = (session) => {
        setEditingSession(session);
        setFormData({
            title: session.title,
            description: session.description,
            scheduledStartTime: session.scheduledStartTime,
            maxParticipants: session.maxParticipants,
            settings: session.settings
        });
        setShowCreateForm(true);
    };

    const joinSession = (sessionId) => {
        navigate(`/live-class/${sessionId}`);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'live': return 'bg-green-100 text-green-800';
            case 'scheduled': return 'bg-blue-100 text-blue-800';
            case 'ended': return 'bg-gray-100 text-gray-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
                {/* Error and Success Messages */}
                {error && (
                    <div style={{
                        marginBottom: '16px',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #f87171',
                        color: '#dc2626',
                        padding: '12px 16px',
                        borderRadius: '8px'
                    }}>
                        {error}
                    </div>
                )}
                {success && (
                    <div style={{
                        marginBottom: '16px',
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #4ade80',
                        color: '#16a34a',
                        padding: '12px 16px',
                        borderRadius: '8px'
                    }}>
                        {success}
                    </div>
                )}
                
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                        <Video size={24} />
                        Live Sessions
                    </h2>
                    {userRole === 'instructor' && (
                        <button
                            onClick={() => setShowCreateForm(true)}
                            style={{
                                background: 'linear-gradient(to right, #2563eb, #1d4ed8)',
                                color: 'white',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.background = 'linear-gradient(to right, #1d4ed8, #1e40af)';
                                e.target.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = 'linear-gradient(to right, #2563eb, #1d4ed8)';
                                e.target.style.transform = 'scale(1)';
                            }}
                        >
                            <Plus size={20} />
                            Create Session
                        </button>
                    )}
                </div>
            </div>

            <div className="p-6">
                {sessions.length === 0 ? (
                    <div className="text-center py-8">
                        <Video size={48} className="mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500">No live sessions scheduled</p>
                        {userRole === 'instructor' && (
                            <button
                                onClick={() => setShowCreateForm(true)}
                                style={{
                                    background: 'linear-gradient(to right, #16a34a, #15803d)',
                                    color: 'white',
                                    padding: '12px 24px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    marginTop: '16px',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = 'linear-gradient(to right, #15803d, #166534)';
                                    e.target.style.transform = 'scale(1.05)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = 'linear-gradient(to right, #16a34a, #15803d)';
                                    e.target.style.transform = 'scale(1)';
                                }}
                            >
                                Create Your First Session
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {sessions.map((session) => (
                            <div key={session._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-gray-800">{session.title}</h3>
                                        <p className="text-gray-600 mt-1">{session.description}</p>
                                        
                                        <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <Calendar size={16} />
                                                {formatDateTime(session.scheduledStartTime)}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Users size={16} />
                                                {session.participants?.filter(p => !p.leftAt).length || 0} / {session.maxParticipants}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock size={16} />
                                                {session.actualStartTime && session.endTime 
                                                    ? `${Math.round((new Date(session.endTime) - new Date(session.actualStartTime)) / 60000)} min`
                                                    : 'Not started'
                                                }
                                            </div>
                                        </div>

                                        <div className="flex gap-2 mt-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                                                {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                                            </span>
                                            {session.settings.allowChat && (
                                                <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                                                    💬 Chat Enabled
                                                </span>
                                            )}
                                            {session.settings.allowScreenShare && (
                                                <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                                                    🖥️ Screen Share
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        {session.status === 'scheduled' && userRole === 'instructor' && (
                                            <button
                                                onClick={() => startSession(session._id)}
                                                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-3 py-1 rounded flex items-center gap-1 transform transition-all hover:scale-105 shadow"
                                            >
                                                <Play size={16} />
                                                Start
                                            </button>
                                        )}
                                        
                                        {session.status === 'live' && (
                                            <button
                                                onClick={() => joinSession(session._id)}
                                                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-3 py-1 rounded flex items-center gap-1 transform transition-all hover:scale-105 shadow"
                                            >
                                                <Video size={16} />
                                                Join
                                            </button>
                                        )}

                                        {session.status === 'live' && userRole === 'instructor' && (
                                            <button
                                                onClick={() => endSession(session._id)}
                                                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-3 py-1 rounded flex items-center gap-1 transform transition-all hover:scale-105 shadow"
                                            >
                                                <Square size={16} />
                                                End
                                            </button>
                                        )}

                                        {userRole === 'instructor' && session.status === 'scheduled' && (
                                            <>
                                                <button
                                                    onClick={() => editSession(session)}
                                                    className="bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white px-3 py-1 rounded flex items-center gap-1 transform transition-all hover:scale-105 shadow"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => deleteSession(session._id)}
                                                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-3 py-1 rounded flex items-center gap-1 transform transition-all hover:scale-105 shadow"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create/Edit Session Modal */}
            {showCreateForm && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '24px',
                        width: '100%',
                        maxWidth: '600px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        position: 'relative'
                    }}>
                        {/* Error and Success Messages inside modal */}
                        {error && (
                            <div style={{
                                marginBottom: '16px',
                                backgroundColor: '#fef2f2',
                                border: '1px solid #f87171',
                                color: '#dc2626',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                fontSize: '14px',
                                wordBreak: 'break-word'
                            }}>
                                {error}
                            </div>
                        )}
                        {success && (
                            <div style={{
                                marginBottom: '16px',
                                backgroundColor: '#f0fdf4',
                                border: '1px solid #4ade80',
                                color: '#16a34a',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                fontSize: '14px'
                            }}>
                                {success}
                            </div>
                        )}
                        
                        <h3 style={{
                            fontSize: '20px',
                            fontWeight: '600',
                            marginBottom: '20px',
                            color: '#1f2937'
                        }}>
                            {editingSession ? 'Edit Session' : 'Create New Session'}
                        </h3>
                        
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    color: '#374151',
                                    marginBottom: '6px'
                                }}>
                                    Session Title *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        boxSizing: 'border-box',
                                        outline: 'none',
                                        transition: 'border-color 0.2s'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                    placeholder="Enter session title"
                                />
                            </div>

                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    color: '#374151',
                                    marginBottom: '6px'
                                }}>
                                    Description *
                                </label>
                                <textarea
                                    required
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    rows={3}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        boxSizing: 'border-box',
                                        outline: 'none',
                                        transition: 'border-color 0.2s',
                                        resize: 'vertical'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                    placeholder="Enter session description"
                                />
                            </div>

                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    color: '#374151',
                                    marginBottom: '6px'
                                }}>
                                    Scheduled Start Time *
                                </label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={formData.scheduledStartTime}
                                    onChange={(e) => setFormData({...formData, scheduledStartTime: e.target.value})}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        boxSizing: 'border-box',
                                        outline: 'none',
                                        transition: 'border-color 0.2s'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                />
                            </div>

                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    color: '#374151',
                                    marginBottom: '6px'
                                }}>
                                    Maximum Participants
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="200"
                                    value={formData.maxParticipants}
                                    onChange={(e) => setFormData({...formData, maxParticipants: parseInt(e.target.value)})}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        boxSizing: 'border-box',
                                        outline: 'none',
                                        transition: 'border-color 0.2s'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <label style={{
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    color: '#374151'
                                }}>
                                    Session Settings
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.settings.allowChat}
                                        onChange={(e) => setFormData({
                                            ...formData, 
                                            settings: {...formData.settings, allowChat: e.target.checked}
                                        })}
                                        style={{ marginRight: '8px' }}
                                    />
                                    <span style={{ fontSize: '14px', color: '#4b5563' }}>Allow Chat</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.settings.allowScreenShare}
                                        onChange={(e) => setFormData({
                                            ...formData, 
                                            settings: {...formData.settings, allowScreenShare: e.target.checked}
                                        })}
                                        style={{ marginRight: '8px' }}
                                    />
                                    <span style={{ fontSize: '14px', color: '#4b5563' }}>Allow Screen Sharing</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.settings.muteParticipantsOnJoin}
                                        onChange={(e) => setFormData({
                                            ...formData, 
                                            settings: {...formData.settings, muteParticipantsOnJoin: e.target.checked}
                                        })}
                                        style={{ marginRight: '8px' }}
                                    />
                                    <span style={{ fontSize: '14px', color: '#4b5563' }}>Mute Participants on Join</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.settings.waitingRoom}
                                        onChange={(e) => setFormData({
                                            ...formData, 
                                            settings: {...formData.settings, waitingRoom: e.target.checked}
                                        })}
                                        style={{ marginRight: '8px' }}
                                    />
                                    <span style={{ fontSize: '14px', color: '#4b5563' }}>Enable Waiting Room</span>
                                </label>
                            </div>

                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'flex-end', 
                                gap: '12px', 
                                paddingTop: '20px',
                                marginTop: '20px',
                                borderTop: '1px solid #e5e7eb'
                            }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateForm(false);
                                        setEditingSession(null);
                                        setError('');
                                        setSuccess('');
                                    }}
                                    style={{
                                        padding: '8px 16px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        backgroundColor: 'white',
                                        color: '#6b7280',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.backgroundColor = '#f9fafb';
                                        e.target.style.borderColor = '#9ca3af';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = 'white';
                                        e.target.style.borderColor = '#d1d5db';
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{
                                        background: submitting 
                                            ? 'linear-gradient(to right, #9ca3af, #6b7280)'
                                            : 'linear-gradient(to right, #2563eb, #1d4ed8)',
                                        color: 'white',
                                        padding: '8px 24px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        cursor: submitting ? 'not-allowed' : 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                                        opacity: submitting ? 0.5 : 1
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!submitting) {
                                            e.target.style.background = 'linear-gradient(to right, #1d4ed8, #1e40af)';
                                            e.target.style.transform = 'scale(1.05)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!submitting) {
                                            e.target.style.background = 'linear-gradient(to right, #2563eb, #1d4ed8)';
                                            e.target.style.transform = 'scale(1)';
                                        }
                                    }}
                                >
                                    {submitting ? 'Saving...' : (editingSession ? 'Update Session' : 'Create Session')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LiveSessionManager;
