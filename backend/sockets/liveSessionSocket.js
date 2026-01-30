const LiveSession = require('../models/liveSessionModel');
const User = require('../models/userModel');

const liveSessionHandler = (io) => {
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        // Join live session room
        socket.on('join-live-session', async (data) => {
            try {
                const { sessionId, userId } = data;
                
                // Verify session exists and is live
                const session = await LiveSession.findById(sessionId)
                    .populate('participants.user', 'fullName avatar');

                if (!session || session.status !== 'live') {
                    socket.emit('error', { message: 'Session not found or not live' });
                    return;
                }

                // Join room
                socket.join(sessionId);
                socket.sessionId = sessionId;
                socket.userId = userId;

                // Update participant socket ID
                await session.addParticipant(userId, socket.id);

                // Notify other participants
                const activeParticipants = session.getActiveParticipants();
                const participantInfo = activeParticipants.find(p => p.user._id.toString() === userId);
                
                socket.to(sessionId).emit('participant-joined', {
                    participant: participantInfo,
                    totalParticipants: activeParticipants.length
                });

                // Send current session info to new participant
                socket.emit('session-joined', {
                    session: {
                        id: session._id,
                        title: session.title,
                        participants: activeParticipants,
                        settings: session.settings
                    }
                });

                console.log(`User ${userId} joined live session ${sessionId}`);
            } catch (error) {
                console.error('Error joining live session:', error);
                socket.emit('error', { message: 'Failed to join session' });
            }
        });

        // Leave live session
        socket.on('leave-live-session', async (data) => {
            try {
                const { sessionId, userId } = data;
                
                const session = await LiveSession.findById(sessionId);
                if (session) {
                    await session.removeParticipant(userId);
                    
                    // Notify other participants
                    const activeParticipants = session.getActiveParticipants();
                    socket.to(sessionId).emit('participant-left', {
                        userId,
                        totalParticipants: activeParticipants.length
                    });
                }

                socket.leave(sessionId);
                console.log(`User ${userId} left live session ${sessionId}`);
            } catch (error) {
                console.error('Error leaving live session:', error);
            }
        });

        // WebRTC signaling
        socket.on('webrtc-offer', (data) => {
            socket.to(data.sessionId).emit('webrtc-offer', {
                offer: data.offer,
                from: socket.userId,
                to: data.to
            });
        });

        socket.on('webrtc-answer', (data) => {
            socket.to(data.sessionId).emit('webrtc-answer', {
                answer: data.answer,
                from: socket.userId,
                to: data.to
            });
        });

        socket.on('webrtc-ice-candidate', (data) => {
            socket.to(data.sessionId).emit('webrtc-ice-candidate', {
                candidate: data.candidate,
                from: socket.userId,
                to: data.to
            });
        });

        // Audio/Video controls
        socket.on('toggle-audio', async (data) => {
            try {
                const { sessionId, isMuted } = data;
                const session = await LiveSession.findById(sessionId);
                
                if (session) {
                    const participant = session.participants.find(p => 
                        p.user.toString() === socket.userId && !p.leftAt
                    );
                    
                    if (participant) {
                        participant.isMuted = isMuted;
                        await session.save();
                        
                        socket.to(sessionId).emit('participant-audio-changed', {
                            userId: socket.userId,
                            isMuted
                        });
                    }
                }
            } catch (error) {
                console.error('Error toggling audio:', error);
            }
        });

        socket.on('toggle-video', async (data) => {
            try {
                const { sessionId, isVideoOff } = data;
                const session = await LiveSession.findById(sessionId);
                
                if (session) {
                    const participant = session.participants.find(p => 
                        p.user.toString() === socket.userId && !p.leftAt
                    );
                    
                    if (participant) {
                        participant.isVideoOff = isVideoOff;
                        await session.save();
                        
                        socket.to(sessionId).emit('participant-video-changed', {
                            userId: socket.userId,
                            isVideoOff
                        });
                    }
                }
            } catch (error) {
                console.error('Error toggling video:', error);
            }
        });

        // Hand raise
        socket.on('raise-hand', async (data) => {
            try {
                const { sessionId, isRaised } = data;
                const session = await LiveSession.findById(sessionId);
                
                if (session) {
                    const participant = session.participants.find(p => 
                        p.user.toString() === socket.userId && !p.leftAt
                    );
                    
                    if (participant) {
                        participant.isHandRaised = isRaised;
                        await session.save();
                        
                        socket.to(sessionId).emit('participant-hand-changed', {
                            userId: socket.userId,
                            isHandRaised: isRaised
                        });

                        // Notify instructor specifically
                        const instructorSocket = Array.from(io.sockets.sockets.values())
                            .find(s => s.userId === session.instructor.toString());
                        
                        if (instructorSocket) {
                            instructorSocket.emit('hand-raise-notification', {
                                userId: socket.userId,
                                isRaised,
                                participantName: participant.user?.fullName || 'Student'
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('Error raising hand:', error);
            }
        });

        // Instructor controls
        socket.on('mute-participant', async (data) => {
            try {
                const { sessionId, participantId } = data;
                const session = await LiveSession.findById(sessionId);
                
                if (session && session.instructor.toString() === socket.userId) {
                    const participant = session.participants.find(p => 
                        p.user.toString() === participantId && !p.leftAt
                    );
                    
                    if (participant) {
                        participant.isMuted = true;
                        await session.save();
                        
                        // Notify participant
                        const participantSocket = Array.from(io.sockets.sockets.values())
                            .find(s => s.userId === participantId);
                        
                        if (participantSocket) {
                            participantSocket.emit('muted-by-instructor');
                        }
                        
                        // Notify others
                        socket.to(sessionId).emit('participant-audio-changed', {
                            userId: participantId,
                            isMuted: true
                        });
                    }
                }
            } catch (error) {
                console.error('Error muting participant:', error);
            }
        });

        // Chat functionality
        socket.on('send-message', (data) => {
            const { sessionId, message, senderName } = data;
            
            socket.to(sessionId).emit('new-message', {
                message,
                senderName,
                senderId: socket.userId,
                timestamp: new Date()
            });
        });

        // Screen sharing
        socket.on('start-screen-share', (data) => {
            socket.to(data.sessionId).emit('screen-share-started', {
                userId: socket.userId
            });
        });

        socket.on('stop-screen-share', (data) => {
            socket.to(data.sessionId).emit('screen-share-stopped', {
                userId: socket.userId
            });
        });

        // Handle disconnection
        socket.on('disconnect', async () => {
            try {
                if (socket.sessionId && socket.userId) {
                    const session = await LiveSession.findById(socket.sessionId);
                    if (session) {
                        await session.removeParticipant(socket.userId);
                        
                        const activeParticipants = session.getActiveParticipants();
                        socket.to(socket.sessionId).emit('participant-left', {
                            userId: socket.userId,
                            totalParticipants: activeParticipants.length
                        });
                    }
                }
                console.log('User disconnected:', socket.id);
            } catch (error) {
                console.error('Error handling disconnect:', error);
            }
        });
    });
};

module.exports = liveSessionHandler;
