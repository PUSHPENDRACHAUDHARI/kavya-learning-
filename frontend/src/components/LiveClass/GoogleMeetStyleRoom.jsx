import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import { 
  Camera, CameraOff, Mic, MicOff, Hand, Users, MessageSquare, 
  ScreenShare, Phone, LogOut, Video, VideoOff, Settings, 
  MoreVertical, Grid3x3, Monitor, Speaker
} from 'lucide-react';

const GoogleMeetStyleRoom = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const socketRef = useRef(null);
    const localVideoRef = useRef(null);
    const remoteVideosRef = useRef({});
    const peerConnectionsRef = useRef({});
    
    const [session, setSession] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isHandRaised, setIsHandRaised] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [showChat, setShowChat] = useState(true);
    const [showParticipants, setShowParticipants] = useState(false);
    const [localStream, setLocalStream] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [userRole, setUserRole] = useState('student');
    const [gridView, setGridView] = useState(true);
    const [isSpeakerOn, setIsSpeakerOn] = useState(true);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    useEffect(() => {
        const initializeSession = async () => {
            try {
                console.log('Initializing session with ID:', sessionId);
                
                // Get session details
                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('No authentication token found');
                }

                const response = await axios.get(`${API_URL}/api/live-sessions/${sessionId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                console.log('Session data:', response.data);
                setSession(response.data);
                setParticipants(response.data.participants || []);

                // Get user info
                const userResponse = await axios.get(`${API_URL}/api/users/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                console.log('User data:', userResponse.data);
                setUserRole(userResponse.data.role);

                // Auto-enable camera and mic for instructors and admins
                const autoEnableMedia = userResponse.data.role === 'instructor' || userResponse.data.role === 'admin';
                
                await initializeWebRTC(autoEnableMedia);
                connectToSocket(userResponse.data._id);

                setIsLoading(false);
            } catch (err) {
                console.error('Error initializing session:', err);
                setError(err.message || 'Failed to join live session');
                setIsLoading(false);
            }
        };

        if (sessionId) {
            initializeSession();
        } else {
            setError('No session ID provided');
            setIsLoading(false);
        }

        return () => cleanup();
    }, [sessionId]);

    const initializeWebRTC = async (autoEnable = false) => {
        try {
            console.log('Initializing WebRTC with autoEnable:', autoEnable);
            
            const constraints = {
                video: autoEnable || true,
                audio: autoEnable || true
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('Media stream obtained:', stream);
            setLocalStream(stream);
            
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            // Set initial states based on auto-enable
            if (!autoEnable) {
                // For students, start with video off, mic on
                const videoTrack = stream.getVideoTracks()[0];
                if (videoTrack) {
                    videoTrack.enabled = false;
                    setIsVideoEnabled(false);
                }
            }
        } catch (err) {
            console.error('Error accessing media devices:', err);
            // Don't throw error, just log it - camera/mic permission denied shouldn't break the app
            setError('Camera/Microphone access denied. You can still participate without video/audio.');
        }
    };

    const connectToSocket = (userId) => {
        try {
            console.log('Connecting to socket with userId:', userId);
            const token = localStorage.getItem('token');
            
            socketRef.current = io(API_URL, {
                auth: { token }
            });

            socketRef.current.emit('join-live-session', { sessionId, userId });

            // Record attendance when joining
            recordAttendance(userId);

            socketRef.current.on('session-joined', (data) => {
                console.log('Session joined:', data);
                setSession(data.session);
                setParticipants(data.session.participants);
            });

            socketRef.current.on('participant-joined', (data) => {
                console.log('Participant joined:', data);
                setParticipants(prev => [...prev, data.participant]);
            });

            socketRef.current.on('participant-left', (data) => {
                console.log('Participant left:', data);
                setParticipants(prev => prev.filter(p => p.user._id !== data.userId));
            });

            socketRef.current.on('new-message', (data) => {
                console.log('New message:', data);
                setMessages(prev => [...prev, data]);
            });

            socketRef.current.on('error', (error) => {
                console.error('Socket error:', error);
                setError(error.message || 'Connection error');
            });

        } catch (err) {
            console.error('Error connecting to socket:', err);
            setError('Failed to connect to live session');
        }
    };

    const recordAttendance = async (userId) => {
        try {
            console.log('Recording attendance for userId:', userId);
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/attendance/live-sessions/${sessionId}/join`, {
                cameraEnabled: isVideoEnabled,
                micEnabled: isAudioEnabled
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Attendance recorded successfully');
        } catch (error) {
            console.error('Error recording attendance:', error);
            // Don't show error to user for attendance - it's not critical
        }
    };

    const updateAttendanceOnLeave = async () => {
        try {
            const token = localStorage.getItem('token');
            // Calculate participation score based on activity
            const participationScore = messages.length * 2 + (isHandRaised ? 5 : 0);
            
            await axios.post(`${API_URL}/api/attendance/live-sessions/${sessionId}/leave`, {
                participationScore
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            console.error('Error updating attendance:', error);
        }
    };

    const toggleAudio = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !isAudioEnabled;
                setIsAudioEnabled(!isAudioEnabled);
            }
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !isVideoEnabled;
                setIsVideoEnabled(!isVideoEnabled);
            }
        }
    };

    const toggleHand = () => {
        setIsHandRaised(!isHandRaised);
        socketRef.current?.emit('raise-hand', {
            sessionId,
            isRaised: !isHandRaised
        });
    };

    const leaveSession = async () => {
        try {
            // Update attendance before leaving
            await updateAttendanceOnLeave();
            
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/live-sessions/${sessionId}/leave`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            cleanup();
            navigate('/dashboard');
        } catch (err) {
            console.error('Error leaving session:', err);
        }
    };

    const cleanup = () => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        if (socketRef.current) {
            socketRef.current.disconnect();
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-purple-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto"></div>
                    <p className="mt-6 text-gray-600 font-medium">Joining live session...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen bg-gradient-to-br from-red-50 to-pink-50">
                <div className="text-center">
                    <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-xl">
                        <p className="font-semibold">{error}</p>
                        <button 
                            onClick={() => navigate('/dashboard')}
                            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 to-gray-800">
            {/* Top Header */}
            <div className="bg-gray-900/90 backdrop-blur-sm text-white p-4 flex justify-between items-center border-b border-gray-700">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold">{session?.title}</h1>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                        <Users size={16} />
                        <span>{participants.filter(p => !p.leftAt).length} participants</span>
                    </div>
                    {isHandRaised && (
                        <div className="bg-yellow-500 text-gray-900 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                            <Hand size={14} />
                            Hand Raised
                        </div>
                    )}
                </div>
                
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowParticipants(!showParticipants)}
                        className={`p-2 rounded-lg transition-all ${
                            showParticipants ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                    >
                        <Users size={20} />
                    </button>
                    <button
                        onClick={() => setShowChat(!showChat)}
                        className={`p-2 rounded-lg transition-all ${
                            showChat ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                    >
                        <MessageSquare size={20} />
                    </button>
                    <button className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600">
                        <MoreVertical size={20} />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Video Area */}
                <div className="flex-1 flex flex-col">
                    <div className="flex-1 relative bg-black">
                        {gridView ? (
                            // Grid View
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 p-2 h-full">
                                {/* Local Video */}
                                <div className="relative bg-gray-800 rounded-lg overflow-hidden">
                                    <video
                                        ref={localVideoRef}
                                        autoPlay
                                        muted
                                        playsInline
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-sm">
                                        You
                                    </div>
                                    {!isVideoEnabled && (
                                        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                                            <CameraOff size={48} className="text-gray-600" />
                                        </div>
                                    )}
                                </div>
                                
                                {/* Participant Videos */}
                                {participants.filter(p => !p.leftAt).map(participant => (
                                    <div key={participant.user._id} className="relative bg-gray-800 rounded-lg overflow-hidden">
                                        <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                                            <div className="text-center">
                                                <div className="w-16 h-16 bg-gray-600 rounded-full mx-auto mb-2"></div>
                                                <p className="text-white text-sm">{participant.user.fullName}</p>
                                            </div>
                                        </div>
                                        <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-sm">
                                            {participant.user.fullName}
                                        </div>
                                        <div className="absolute top-2 right-2 flex gap-1">
                                            {participant.isMuted && <MicOff size={16} className="text-red-500" />}
                                            {participant.isHandRaised && <Hand size={16} className="text-yellow-500" />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            // Speaker View
                            <div className="h-full flex items-center justify-center">
                                <div className="relative w-full max-w-4xl">
                                    <video
                                        ref={localVideoRef}
                                        autoPlay
                                        muted
                                        playsInline
                                        className="w-full h-full object-cover rounded-lg"
                                    />
                                    {!isVideoEnabled && (
                                        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center rounded-lg">
                                            <CameraOff size={64} className="text-gray-600" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Floating Controls */}
                        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
                            <div className="bg-gray-900/90 backdrop-blur-sm rounded-full px-6 py-3 flex items-center gap-3 shadow-2xl">
                                {/* Mic Button */}
                                <button
                                    onClick={toggleAudio}
                                    className={`p-3 rounded-full transition-all transform hover:scale-110 ${
                                        isAudioEnabled 
                                            ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700' 
                                            : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                                    } text-white shadow-lg`}
                                >
                                    {isAudioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
                                </button>

                                {/* Camera Button */}
                                <button
                                    onClick={toggleVideo}
                                    className={`p-3 rounded-full transition-all transform hover:scale-110 ${
                                        isVideoEnabled 
                                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700' 
                                            : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                                    } text-white shadow-lg`}
                                >
                                    {isVideoEnabled ? <Camera size={24} /> : <CameraOff size={24} />}
                                </button>

                                {/* Hand Raise Button */}
                                <button
                                    onClick={toggleHand}
                                    className={`p-3 rounded-full transition-all transform hover:scale-110 ${
                                        isHandRaised 
                                            ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600' 
                                            : 'bg-gray-600 hover:bg-gray-700'
                                    } text-white shadow-lg`}
                                >
                                    <Hand size={24} />
                                </button>

                                {/* Screen Share Button */}
                                <button className="p-3 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg transition-all transform hover:scale-110">
                                    <ScreenShare size={24} />
                                </button>

                                {/* Grid View Toggle */}
                                <button
                                    onClick={() => setGridView(!gridView)}
                                    className={`p-3 rounded-full transition-all transform hover:scale-110 ${
                                        gridView 
                                            ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700' 
                                            : 'bg-gray-600 hover:bg-gray-700'
                                    } text-white shadow-lg`}
                                >
                                    <Grid3x3 size={24} />
                                </button>

                                {/* Leave Button */}
                                <button
                                    onClick={leaveSession}
                                    className="p-3 rounded-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg transition-all transform hover:scale-110"
                                >
                                    <Phone size={24} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Participants Sidebar */}
                {showParticipants && (
                    <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
                        <div className="bg-gray-700 p-4">
                            <h3 className="text-white font-semibold flex items-center gap-2">
                                <Users size={20} />
                                Participants ({participants.filter(p => !p.leftAt).length})
                            </h3>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4">
                            {participants.filter(p => !p.leftAt).map(participant => (
                                <div key={participant.user._id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-600 rounded-full"></div>
                                        <div>
                                            <p className="text-white font-medium">{participant.user.fullName}</p>
                                            <p className="text-gray-400 text-sm">
                                                {participant.user.role === 'instructor' ? 'Instructor' : 'Student'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {participant.isMuted && <MicOff size={16} className="text-red-500" />}
                                        {participant.isHandRaised && <Hand size={16} className="text-yellow-500" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Chat Sidebar */}
                {showChat && (
                    <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
                        <div className="bg-gray-700 p-4">
                            <h3 className="text-white font-semibold flex items-center gap-2">
                                <MessageSquare size={20} />
                                Live Chat
                            </h3>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4">
                            {messages.map((msg, index) => (
                                <div key={index} className="mb-3">
                                    <p className="text-blue-400 text-sm font-semibold">{msg.senderName}</p>
                                    <p className="text-white text-sm">{msg.message}</p>
                                    <p className="text-gray-500 text-xs">
                                        {new Date(msg.timestamp).toLocaleTimeString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                        
                        <div className="p-4 border-t border-gray-700">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                    placeholder="Type a message..."
                                    className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    onClick={() => {
                                        if (newMessage.trim()) {
                                            socketRef.current?.emit('send-message', {
                                                sessionId,
                                                message: newMessage,
                                                senderName: localStorage.getItem('userName') || 'Anonymous'
                                            });
                                            setNewMessage('');
                                        }
                                    }}
                                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg transition-all"
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GoogleMeetStyleRoom;
