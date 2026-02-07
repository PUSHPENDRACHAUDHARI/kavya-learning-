import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import { Camera, CameraOff, Mic, MicOff, Hand, Users, MessageSquare, ScreenShare, Phone, LogOut } from 'lucide-react';

const LiveClassRoom = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const socketRef = useRef(null);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
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
    const [localStream, setLocalStream] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [userRole, setUserRole] = useState('student');

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    useEffect(() => {
        const initializeSession = async () => {
            try {
                // Get session details
                const token = localStorage.getItem('token');
                const response = await axios.get(`${API_URL}/api/live-sessions/${sessionId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                setSession(response.data);
                setParticipants(response.data.participants || []);

                // Get user info
                const userResponse = await axios.get(`${API_URL}/api/users/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setUserRole(userResponse.data.role);

                // Initialize WebRTC
                await initializeWebRTC();

                // Connect to socket
                connectToSocket(userResponse.data._id);

                setIsLoading(false);
            } catch (err) {
                console.error('Error initializing session:', err);
                setError('Failed to join live session');
                setIsLoading(false);
            }
        };

        initializeSession();

        return () => {
            cleanup();
        };
    }, [sessionId]);

    const initializeWebRTC = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            setLocalStream(stream);
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error('Error accessing media devices:', err);
            setError('Failed to access camera and microphone');
        }
    };

    const connectToSocket = (userId) => {
        const token = localStorage.getItem('token');
        socketRef.current = io(API_URL, {
            auth: { token }
        });

        socketRef.current.emit('join-live-session', {
            sessionId,
            userId
        });

        socketRef.current.on('session-joined', (data) => {
            setSession(data.session);
            setParticipants(data.session.participants);
        });

        socketRef.current.on('participant-joined', (data) => {
            setParticipants(prev => [...prev, data.participant]);
        });

        socketRef.current.on('participant-left', (data) => {
            setParticipants(prev => prev.filter(p => p.user._id !== data.userId));
        });

        socketRef.current.on('participant-audio-changed', (data) => {
            setParticipants(prev => prev.map(p => 
                p.user._id === data.userId ? { ...p, isMuted: data.isMuted } : p
            ));
        });

        socketRef.current.on('participant-video-changed', (data) => {
            setParticipants(prev => prev.map(p => 
                p.user._id === data.userId ? { ...p, isVideoOff: data.isVideoOff } : p
            ));
        });

        socketRef.current.on('participant-hand-changed', (data) => {
            setParticipants(prev => prev.map(p => 
                p.user._id === data.userId ? { ...p, isHandRaised: data.isHandRaised } : p
            ));
        });

        socketRef.current.on('new-message', (data) => {
            setMessages(prev => [...prev, data]);
        });

        socketRef.current.on('muted-by-instructor', () => {
            setIsAudioEnabled(false);
            toggleAudio();
        });

        socketRef.current.on('error', (data) => {
            setError(data.message);
        });
    };

    const createPeerConnection = (userId) => {
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };

        const pc = new RTCPeerConnection(configuration);

        // Add local stream
        if (localStream) {
            localStream.getTracks().forEach(track => {
                pc.addTrack(track, localStream);
            });
        }

        // Handle remote stream
        pc.ontrack = (event) => {
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socketRef.current.emit('webrtc-ice-candidate', {
                    sessionId,
                    candidate: event.candidate,
                    to: userId
                });
            }
        };

        peerConnectionsRef.current[userId] = pc;
        return pc;
    };

    const toggleAudio = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !isAudioEnabled;
                setIsAudioEnabled(!isAudioEnabled);

                socketRef.current.emit('toggle-audio', {
                    sessionId,
                    isMuted: !isAudioEnabled
                });
            }
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !isVideoEnabled;
                setIsVideoEnabled(!isVideoEnabled);

                socketRef.current.emit('toggle-video', {
                    sessionId,
                    isVideoOff: !isVideoEnabled
                });
            }
        }
    };

    const toggleHand = () => {
        setIsHandRaised(!isHandRaised);
        socketRef.current.emit('raise-hand', {
            sessionId,
            isRaised: !isHandRaised
        });
    };

    const toggleScreenShare = async () => {
        try {
            if (!isScreenSharing) {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true
                });

                // Replace video track with screen share
                const videoTrack = screenStream.getVideoTracks()[0];
                Object.values(peerConnectionsRef.current).forEach(pc => {
                    const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
                    if (sender) {
                        sender.replaceTrack(videoTrack);
                    }
                });

                videoTrack.onended = () => {
                    stopScreenShare();
                };

                setIsScreenSharing(true);
                socketRef.current.emit('start-screen-share', { sessionId });
            } else {
                stopScreenShare();
            }
        } catch (err) {
            console.error('Error sharing screen:', err);
        }
    };

    const stopScreenShare = () => {
        // Restore camera video
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            Object.values(peerConnectionsRef.current).forEach(pc => {
                const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
                if (sender) {
                    sender.replaceTrack(videoTrack);
                }
            });
        }

        setIsScreenSharing(false);
        socketRef.current.emit('stop-screen-share', { sessionId });
    };

    const sendMessage = () => {
        if (newMessage.trim()) {
            const userName = localStorage.getItem('userName') || 'Anonymous';
            socketRef.current.emit('send-message', {
                sessionId,
                message: newMessage,
                senderName: userName
            });
            setNewMessage('');
        }
    };

    const leaveSession = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/live-sessions/${sessionId}/leave`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (socketRef.current) {
                socketRef.current.emit('leave-live-session', {
                    sessionId,
                    userId: localStorage.getItem('userId')
                });
            }

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

        Object.values(peerConnectionsRef.current).forEach(pc => {
            pc.close();
        });

        if (socketRef.current) {
            socketRef.current.disconnect();
        }
    };

    const muteParticipant = (participantId) => {
        if (userRole === 'instructor') {
            socketRef.current.emit('mute-participant', {
                sessionId,
                participantId
            });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Joining live session...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                        <p>{error}</p>
                        <button 
                            onClick={() => navigate('/dashboard')}
                            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gray-900">
            {/* Header */}
            <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold">{session?.title}</h1>
                    <p className="text-sm text-gray-300">
                        {participants.filter(p => !p.leftAt).length} participants
                    </p>
                </div>
                <button
                    onClick={leaveSession}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 flex items-center gap-2"
                >
                    <LogOut size={20} />
                    Leave Session
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex">
                {/* Video Area */}
                <div className="flex-1 flex flex-col">
                    <div className="flex-1 relative bg-black">
                        {/* Main Video */}
                        <video
                            ref={localVideoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                        />
                        
                        {/* Overlay Controls */}
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                            <button
                                onClick={toggleAudio}
                                className={`p-3 rounded-full ${
                                    isAudioEnabled ? 'bg-gray-700' : 'bg-red-600'
                                } text-white hover:opacity-80`}
                            >
                                {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                            </button>
                            <button
                                onClick={toggleVideo}
                                className={`p-3 rounded-full ${
                                    isVideoEnabled ? 'bg-gray-700' : 'bg-red-600'
                                } text-white hover:opacity-80`}
                            >
                                {isVideoEnabled ? <Camera size={20} /> : <CameraOff size={20} />}
                            </button>
                            <button
                                onClick={toggleHand}
                                className={`p-3 rounded-full ${
                                    isHandRaised ? 'bg-yellow-600' : 'bg-gray-700'
                                } text-white hover:opacity-80`}
                            >
                                <Hand size={20} />
                            </button>
                            <button
                                onClick={toggleScreenShare}
                                className={`p-3 rounded-full ${
                                    isScreenSharing ? 'bg-blue-600' : 'bg-gray-700'
                                } text-white hover:opacity-80`}
                            >
                                <ScreenShare size={20} />
                            </button>
                        </div>

                        {/* Hand Raise Indicator */}
                        {isHandRaised && (
                            <div className="absolute top-4 right-4 bg-yellow-600 text-white px-3 py-1 rounded">
                                Hand Raised ✋
                            </div>
                        )}
                    </div>

                    {/* Participant Grid */}
                    <div className="bg-gray-800 p-4">
                        <div className="flex gap-2 overflow-x-auto">
                            {participants.filter(p => !p.leftAt).map(participant => (
                                <div key={participant.user._id} className="flex-shrink-0 w-32">
                                    <div className="bg-gray-700 rounded-lg p-2 text-center">
                                        <div className="w-full h-20 bg-gray-600 rounded mb-2 flex items-center justify-center">
                                            {participant.isVideoOff ? (
                                                <CameraOff size={24} className="text-gray-400" />
                                            ) : (
                                                <div className="w-8 h-8 bg-gray-500 rounded-full"></div>
                                            )}
                                        </div>
                                        <p className="text-white text-xs truncate">{participant.user.fullName}</p>
                                        <div className="flex justify-center gap-1 mt-1">
                                            {participant.isMuted && <MicOff size={12} className="text-red-500" />}
                                            {participant.isHandRaised && <Hand size={12} className="text-yellow-500" />}
                                        </div>
                                        {userRole === 'instructor' && (
                                            <button
                                                onClick={() => muteParticipant(participant.user._id)}
                                                className="mt-1 text-xs bg-red-600 text-white px-2 py-1 rounded"
                                            >
                                                Mute
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Chat Sidebar */}
                {showChat && (
                    <div className="w-80 bg-gray-800 flex flex-col">
                        <div className="bg-gray-700 p-4 flex justify-between items-center">
                            <h3 className="text-white font-semibold flex items-center gap-2">
                                <MessageSquare size={20} />
                                Chat
                            </h3>
                            <button
                                onClick={() => setShowChat(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                ×
                            </button>
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
                                    className="flex-1 bg-gray-700 text-white px-3 py-2 rounded"
                                />
                                <button
                                    onClick={sendMessage}
                                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Chat Toggle Button */}
            {!showChat && (
                <button
                    onClick={() => setShowChat(true)}
                    className="fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700"
                >
                    <MessageSquare size={20} />
                </button>
            )}
        </div>
    );
};

export default LiveClassRoom;
