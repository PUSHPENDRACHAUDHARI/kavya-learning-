import React, { useEffect, useState, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import axiosClient from '../api/axiosClient';
import { io as ioClient } from 'socket.io-client';

export default function Messages() {
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [pinnedStudents, setPinnedStudents] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pinnedStudents') || '[]');
    } catch {
      return [];
    }
  });
  const endRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const loadStudents = async () => {
      setLoadingStudents(true);
      try {
        const storedUser = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch (e) { return {}; } })();
        const userRole = localStorage.getItem('userRole') || storedUser.role || storedUser.userRole || storedUser?.role;
        const meId = storedUser._id || localStorage.getItem('userId');
        let res;
        if (userRole === 'admin' || userRole === 'sub-admin') {
          res = await axiosClient.get('/api/admin/users?role=student');
        } else if (userRole === 'instructor') {
          res = await axiosClient.get('/api/instructor/students');
        } else if (userRole === 'student') {
          // Allow students to see other students via a lightweight endpoint
          res = await axiosClient.get('/api/users/students');
        } else if (userRole === 'parent') {
          // parents typically see only their children; attempt parent dashboard endpoint
          try {
            const r = await axiosClient.get('/api/parents/dashboard');
            // parents endpoint returns { children, ... }
            const list = (r.data?.children) || [];
            setStudents(list.map(c => ({ _id: c._id || c.id, fullName: c.fullName || c.name, email: c.email })));
            setLoadingStudents(false);
            return;
          } catch (err) {
            // fallthrough
            res = null;
          }
        } else {
          // Not admin/instructor/parent — try instructor endpoint first then admin
          try {
            res = await axiosClient.get('/api/instructor/students');
          } catch (e) {
            res = await axiosClient.get('/api/admin/users?role=student');
          }
        }

        let list = res ? (res.data.data || res.data || []) : [];

        // normalize students to simple objects
        list = list.map(s => ({ _id: s._id || s._id?.toString(), fullName: s.fullName || s.name || s.fullName, email: s.email }));

        // Fetch recent conversation summaries and merge (server-provided ordering)
        try {
          const rec = await axiosClient.get('/api/messages');
          const summaries = rec.data.data || [];
          const summaryMap = {};
          const missingSummaries = [];
          summaries.forEach((sr) => {
            // support multiple possible id fields returned by server
            const candidateIds = [];
            if (sr._id) candidateIds.push(String(sr._id));
            if (sr.userId) candidateIds.push(String(sr.userId));
            if (sr.participant) candidateIds.push(String(sr.participant));
            if (Array.isArray(sr.participants)) {
              sr.participants.forEach(p => candidateIds.push(String(p)));
            }
            // if server returned conversation object with otherId field
            if (sr.otherId) candidateIds.push(String(sr.otherId));

            const data = {
              lastMessage: sr.lastMessage,
              lastAt: sr.lastAt,
              unreadCount: sr.unreadCount || 0,
            };

            let matched = false;
            candidateIds.forEach((id) => {
              if (!id) return;
              summaryMap[id] = data;
              // track missing participants to add to list later
              matched = matched || list.some(s => String(s._id) === String(id));
            });
            if (!matched && candidateIds.length > 0) missingSummaries.push({ id: candidateIds[0], data });
          });

          // Merge summaries into existing list
          list = list.map(s => {
            const key = String(s._id);
            if (summaryMap[key]) return { ...s, ...summaryMap[key] };
            return s;
          });

          // Prepend any missing participants (stubs) so recent chats appear on top for new logins
          if (missingSummaries.length > 0) {
            const stubs = missingSummaries.map(ms => ({ _id: ms.id, fullName: 'Unknown', email: '', lastMessage: ms.data.lastMessage, lastAt: ms.data.lastAt, unreadCount: ms.data.unreadCount }));
            list = [...stubs, ...list];
          }

          // Sort by lastAt desc, fallback to name
          list.sort((a, b) => {
            const ta = a.lastAt ? new Date(a.lastAt).getTime() : 0;
            const tb = b.lastAt ? new Date(b.lastAt).getTime() : 0;
            if (ta === tb) return (a.fullName || '').localeCompare(b.fullName || '');
            return tb - ta;
          });
        } catch (e) {
          // ignore recent fetch errors; keep list as-is
          console.warn('Could not fetch recent conversations', e?.message || e);
        }

        setStudents(list);
      } catch (err) {
        console.error('Failed loading students', err?.response?.data || err.message || err);
        // If forbidden, show empty but set an informative placeholder
        if (err?.response?.status === 403) {
          setStudents([]);
          setLoadingStudents(false);
          return;
        }
        setStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    };
    loadStudents();
  }, []);

  // Track total unread messages and mark as seen when user opens messages page
  useEffect(() => {
    const calculateTotalUnread = () => {
      const total = students.reduce((sum, s) => sum + (s.unreadCount || 0), 0);
      return total;
    };

    const totalUnread = calculateTotalUnread();
    // Store current unread count
    localStorage.setItem('currentUnreadMessageCount', totalUnread.toString());
    // Mark messages as seen only on first page load
    localStorage.setItem('lastSeenMessageCount', totalUnread.toString());
  }, [students.length]); // Only update when student list count changes

  // Update current unread count whenever students change (for real-time updates)
  useEffect(() => {
    const calculateTotalUnread = () => {
      const total = students.reduce((sum, s) => sum + (s.unreadCount || 0), 0);
      return total;
    };
    const totalUnread = calculateTotalUnread();
    localStorage.setItem('currentUnreadMessageCount', totalUnread.toString());
  }, [students]); // Update whenever students array changes

  // Move a student to the top of the students list (optionally update preview/lastAt/unread)
  const promoteStudent = (studentId, preview, opts = {}) => {
    setStudents(prev => {
      const idx = prev.findIndex(s => String(s._id) === String(studentId));
      if (idx !== -1) {
        const item = { ...prev[idx] };
        if (preview) item.lastMessage = preview;
        if (opts.lastAt) item.lastAt = opts.lastAt;
        if (typeof opts.unreadInc === 'number') item.unreadCount = (item.unreadCount || 0) + opts.unreadInc;
        const rest = prev.slice(0, idx).concat(prev.slice(idx + 1));
        return [item, ...rest];
      }
      // If not found, create a stub entry at top
      const newItem = {
        _id: studentId,
        fullName: opts.fullName || 'Unknown',
        email: opts.email || '',
        lastMessage: preview || '',
        lastAt: opts.lastAt || new Date().toISOString(),
        unreadCount: opts.unreadInc || 0
      };
      return [newItem, ...prev];
    });
  };

  // Socket.IO realtime connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    // Prefer explicit backend API URL from env; otherwise fall back to localhost:5000
    const socketUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const socket = ioClient(socketUrl, { transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      socket.emit('auth', token);
    });

    socket.on('new_message', (msg) => {
      const meId = (JSON.parse(localStorage.getItem('user')||'{}'))._id || localStorage.getItem('userId');
      const otherParticipant = String(msg.from) === String(meId) ? String(msg.to) : String(msg.from);
      const senderIsMe = String(msg.from) === String(meId);

      // Avoid duplicates: if the incoming message ID already exists in our list, ignore.
      setMessages(prev => {
        if (prev.some(m => String(m._id) === String(msg._id))) return prev;

        // If the conversation is open with this participant, append message and mark read
        if (selectedStudent && String(selectedStudent._id) === String(otherParticipant)) {
          const newMsg = { _id: msg._id, sender: senderIsMe ? 'me' : 'them', text: msg.text, attachments: msg.attachments || [], createdAt: msg.createdAt };
          // If incoming from other, mark read on server
          if (!senderIsMe) {
            axiosClient.post(`/api/messages/${otherParticipant}/read`).catch(() => {});
            promoteStudent(otherParticipant, msg.text, { lastAt: msg.createdAt, unreadInc: 0 });
            setStudents(prevStudents => prevStudents.map(s => (String(s._id) === String(otherParticipant) ? { ...s, unreadCount: 0, lastMessage: msg.text, lastAt: msg.createdAt } : s)));
          } else {
            promoteStudent(otherParticipant, msg.text, { lastAt: msg.createdAt });
          }
          return [...prev, newMsg];
        }

        // Conversation not open: promote participant to top, increment unread if incoming
        const isIncoming = String(msg.to) === String(meId);
        promoteStudent(otherParticipant, msg.text, { lastAt: msg.createdAt, unreadInc: isIncoming ? 1 : 0 });
        return prev;
      });
    });

    socket.on('authenticated', () => {});

    return () => {
      socket.disconnect();
    };
  }, [selectedStudent]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversation = async (student) => {
    setSelectedStudent(student);
    setLoadingMsgs(true);
    try {
      // Try common REST pattern first
      const res = await axiosClient.get(`/api/messages/${student._id}`);
      // Normalize server messages to `{ sender: 'me'|'them', text, createdAt, attachments }`
      const meId = (() => { try { return (JSON.parse(localStorage.getItem('user')||'{}'))._id || localStorage.getItem('userId'); } catch (e) { return localStorage.getItem('userId'); } })();
      const raw = res.data.data || res.data || [];
      const normalized = (raw || []).map(msg => ({
        _id: msg._id, // Include message ID for deletion
        sender: String(msg.from) === String(meId) ? 'me' : 'them',
        text: msg.text || msg.body || '',
        attachments: msg.attachments || [],
        createdAt: msg.createdAt || msg.created_at || msg.updatedAt || new Date().toISOString()
      }));
      setMessages(normalized);
      // Promote the student entry to the top when opening the conversation
      promoteStudent(student._id);
      // Mark messages as read on server and clear unread locally
      try {
        await axiosClient.post(`/api/messages/${student._id}/read`);
      } catch (e) {}
      setStudents(prev => prev.map(s => s._id === student._id ? { ...s, unreadCount: 0 } : s));
    } catch (err) {
      // If endpoint not available, attempt a query-based endpoint
      try {
        const res2 = await axiosClient.get('/api/messages', { params: { userId: student._id } });
        const meId2 = (() => { try { return (JSON.parse(localStorage.getItem('user')||'{}'))._id || localStorage.getItem('userId'); } catch (e) { return localStorage.getItem('userId'); } })();
        const raw2 = res2.data.data || res2.data || [];
        const normalized2 = (raw2 || []).map(msg => ({
          _id: msg._id, // Include message ID for deletion
          sender: String(msg.from) === String(meId2) ? 'me' : 'them',
          text: msg.text || msg.body || '',
          attachments: msg.attachments || [],
          createdAt: msg.createdAt || msg.created_at || msg.updatedAt || new Date().toISOString()
        }));
        setMessages(normalized2);
        promoteStudent(student._id);
          try {
            await axiosClient.post(`/api/messages/${student._id}/read`);
          } catch (e) {}
          setStudents(prev => prev.map(s => s._id === student._id ? { ...s, unreadCount: 0 } : s));
      } catch (err2) {
        // No backend messages yet — fallback to empty conversation
        setMessages([]);
      }
    } finally {
      setLoadingMsgs(false);
    }
  };

  const handleEditMessage = async (messageIndex) => {
    if (!editText.trim()) return;
    const message = messages[messageIndex];
    if (message.sender !== 'me') return;
    
    try {
      setMessages(prev => prev.map((m, i) => i === messageIndex ? { ...m, text: editText, isEdited: true } : m));
      setEditingId(null);
      setEditText('');
      await axiosClient.put(`/api/messages/${message._id || messageIndex}`, { text: editText }).catch(() => {});
    } catch (err) {
      console.error('Failed to edit message', err);
    }
  };

  const handleDeleteMessage = async (messageIndex) => {
    if (!window.confirm('Delete this message? This will permanently remove it from your view.')) return;
    const message = messages[messageIndex];
    
    if (!message._id) {
      console.error('Message ID not found');
      return;
    }
    
    try {
      // Optimistically remove from UI
      setMessages(prev => prev.filter((_, i) => i !== messageIndex));
      setEditingId(null);
      
      // Call backend to mark as deleted for current user
      await axiosClient.delete(`/api/messages/${message._id}`);
    } catch (err) {
      console.error('Failed to delete message', err);
      // Revert on error - reload conversation
      if (selectedStudent) {
        loadConversation(selectedStudent);
      }
    }
  };

  const togglePinStudent = (studentId) => {
    const newPinnedStudents = pinnedStudents.includes(String(studentId))
      ? pinnedStudents.filter(id => id !== String(studentId))
      : [...pinnedStudents, String(studentId)];
    setPinnedStudents(newPinnedStudents);
    localStorage.setItem('pinnedStudents', JSON.stringify(newPinnedStudents));
  };

  const getSortedStudents = (studentList) => {
    return [...studentList].sort((a, b) => {
      const aIsPinned = pinnedStudents.includes(String(a._id));
      const bIsPinned = pinnedStudents.includes(String(b._id));
      if (aIsPinned !== bIsPinned) return aIsPinned ? -1 : 1;
      const ta = a.lastAt ? new Date(a.lastAt).getTime() : 0;
      const tb = b.lastAt ? new Date(b.lastAt).getTime() : 0;
      if (ta === tb) return (a.fullName || '').localeCompare(b.fullName || '');
      return tb - ta;
    });
  };

  const handleAttachFile = (e) => {
    const files = Array.from(e.target.files || []);
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
    
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isDocument = file.type === 'application/pdf' || file.type.includes('word') || file.type.includes('sheet');
      const isSizeValid = file.size <= MAX_FILE_SIZE;
      
      if (!isSizeValid) {
        alert(`File "${file.name}" is too large. Maximum size is 5MB.`);
        return false;
      }
      
      return isImage || isVideo || isDocument;
    });
    
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAttachedFiles(prev => [...prev, {
          id: `${Date.now()}-${Math.random()}`,
          name: file.name,
          type: file.type,
          data: event.target.result,
          size: file.size
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachedFile = (fileId) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if ((!input.trim() && attachedFiles.length === 0) || !selectedStudent) return;
    const text = input.trim();

    // Optimistic UI append with precise timestamp
    const now = new Date().toISOString();
    const tempId = `temp-${Date.now()}`;
    const outgoing = { _id: tempId, sender: 'me', text, to: selectedStudent._id, createdAt: now, attachments: attachedFiles };
    setMessages((m) => [...m, outgoing]);
    setInput('');
    setAttachedFiles([]);

    // Promote the recipient to top immediately (WhatsApp-like) and set lastAt
    promoteStudent(selectedStudent._id, text, { lastAt: now });

    try {
      const payload = { to: selectedStudent._id, text };
      if (attachedFiles.length > 0) {
        payload.attachments = attachedFiles;
      }
      const response = await axiosClient.post('/api/messages', payload);
      // Replace temp message with actual message from server
      if (response.data?.data?._id) {
        const serverMsg = response.data.data;
        setMessages((prev) => {
          const exists = prev.some(p => String(p._id) === String(serverMsg._id));
          if (exists) {
            // Server message already appended via socket — remove temp message
            return prev.filter(p => String(p._id) !== String(tempId));
          }
          // Replace temp message id with server id and attach returned attachments
          return prev.map((msg) => (String(msg._id) === String(tempId) ? { ...msg, _id: serverMsg._id, attachments: serverMsg.attachments || payload.attachments || [] } : msg));
        });
      }
    } catch (err) {
      // Log detailed server response when available to aid debugging
      console.error('Failed to send message', err?.response?.data || err?.message || err);
      // mark last message as failed (simple approach)
      setMessages((m) => m.map((msg, i) => (i === m.length - 1 ? { ...msg, failed: true } : msg)));
    }
  };

  return (
    <AppLayout showGreeting={false}>
      <div style={{ display: 'flex', gap: 18, padding: 20, height: 'calc(100vh - 120px)', boxSizing: 'border-box', overflow: 'hidden' }}>
        <div style={{ width: 320, background: '#fff', borderRadius: 8, padding: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
          <h3 style={{ marginTop: 0 }}>Students</h3>
          <div style={{ marginBottom: 12 }}>
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #ddd',
                fontSize: 14,
                boxSizing: 'border-box'
              }}
            />
          </div>
          {loadingStudents ? (
            <div>Loading students...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, overflowY: 'auto', overflowX: 'auto', boxSizing: 'border-box', paddingRight: 6 }}>
              {getSortedStudents(students)
                .filter((s) => {
                  const searchLower = searchQuery.toLowerCase();
                  const fullName = (s.fullName || s.name || '').toLowerCase();
                  const email = (s.email || '').toLowerCase();
                  return fullName.includes(searchLower) || email.includes(searchLower);
                })
                .map((s) => (
                <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, width: '100%' }}>
                  <button
                    onClick={() => loadConversation(s)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px',
                      textAlign: 'left',
                      borderRadius: 8,
                      border: selectedStudent && selectedStudent._id === s._id ? '1px solid var(--primary)' : '1px solid #eee',
                      background: selectedStudent && selectedStudent._id === s._id ? 'rgba(30,120,240,0.06)' : 'transparent',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 20, background: '#e6eefc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                      {((s.fullName || s.name || 'U').charAt(0) || 'U').toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: (s.unreadCount || 0) > 0 ? 700 : 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.fullName || s.name || 'Unnamed'}</div>
                        <div style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>{s.lastAt ? new Date(s.lastAt).toLocaleTimeString() : ''}</div>
                      </div>
                      <div style={{ fontSize: 12, color: '#666', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{s.lastMessage || s.email || ''}</div>
                        {s.unreadCount > 0 && (
                          <div style={{ background: 'var(--primary)', color: '#fff', borderRadius: 12, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                            {s.unreadCount}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      togglePinStudent(s._id);
                    }}
                    style={{
                      padding: '6px 8px',
                      background: 'transparent',
                      color: pinnedStudents.includes(String(s._id)) ? 'var(--primary)' : '#ccc',
                      border: '1px solid currentColor',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 36,
                      height: 36
                    }}
                    title={pinnedStudents.includes(String(s._id)) ? 'Unpin' : 'Pin'}
                  >
                    {pinnedStudents.includes(String(s._id)) ? '📌' : '📍'}
                  </button>
                </div>
              ))}
              {getSortedStudents(students).filter((s) => {
                const searchLower = searchQuery.toLowerCase();
                const fullName = (s.fullName || s.name || '').toLowerCase();
                const email = (s.email || '').toLowerCase();
                return fullName.includes(searchLower) || email.includes(searchLower);
              }).length === 0 && <div className="text-muted">No students found.</div>}
            </div>
          )}
        </div>

        <div style={{ flex: 1, height: '100%', background: '#fff', borderRadius: 8, padding: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 8, marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>{selectedStudent ? (selectedStudent.fullName || selectedStudent.name) : 'Select a student'}</h3>
            <div style={{ fontSize: 13, color: '#666' }}>{selectedStudent ? (selectedStudent.email || selectedStudent.phone) : 'Click a student to open conversation'}</div>
          </div>

          <div style={{ flex: 1, padding: 8, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {loadingMsgs ? (
              <div>Loading messages...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, overflowY: 'auto', paddingRight: 8 }}>
                {messages.map((m, idx) => (
                  <div key={idx} style={{ alignSelf: m.sender === 'me' ? 'flex-end' : 'flex-start', display: 'flex', flexDirection: 'column', alignItems: m.sender === 'me' ? 'flex-end' : 'flex-start' }}>
                    {editingId === idx ? (
                      <div style={{ display: 'flex', gap: 6, maxWidth: '75%', marginBottom: 8 }}>
                        <input
                          type="text"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--primary)', fontSize: 13 }}
                          autoFocus
                        />
                        <button onClick={() => handleEditMessage(idx)} style={{ padding: '6px 12px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Save</button>
                        <button onClick={() => { setEditingId(null); setEditText(''); }} style={{ padding: '6px 12px', background: '#ddd', color: '#333', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                        <div style={{ maxWidth: '75%', padding: '8px 10px', borderRadius: 8, background: m.sender === 'me' ? 'var(--primary)' : '#f5f5f5', color: m.sender === 'me' ? '#fff' : '#111' }}>
                          {m.text && <div style={{ fontSize: 14 }}>{m.text}</div>}
                          {m.attachments && m.attachments.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: m.text ? 8 : 0 }}>
                              {m.attachments.map((att, aidx) => {
                                const mime = (att.mimeType || att.type || '').toString();
                                const src = att.url || att.data || att;
                                const name = att.filename || att.name || (typeof att === 'string' ? att : 'file');
                                const isImage = mime && mime.startsWith('image/');
                                const isVideo = mime && mime.startsWith('video/');
                                return (
                                  <div key={aidx} style={{ borderRadius: 6, overflow: 'hidden', maxWidth: 150 }}>
                                    {isImage && src && <img src={src} alt={name} style={{ width: '100%', height: 'auto', borderRadius: 4 }} />}
                                    {isVideo && src && <video src={src} style={{ width: '100%', height: 'auto', borderRadius: 4 }} controls />}
                                    {!isImage && !isVideo && (
                                      <div style={{ padding: '8px', background: '#e8e8e8', borderRadius: 4, fontSize: 12 }}>
                                        📄 {name}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 6 }}>{new Date(m.createdAt || Date.now()).toLocaleString()}{m.failed ? ' • Failed' : ''}{m.isEdited ? ' • Edited' : ''}</div>
                        </div>
                        {m.sender === 'me' && !editingId && (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              onClick={() => { setEditingId(idx); setEditText(m.text); }}
                              style={{ padding: '4px 8px', background: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteMessage(idx)}
                              style={{ padding: '4px 8px', background: 'transparent', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                        {m.sender !== 'me' && !editingId && (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              onClick={() => handleDeleteMessage(idx)}
                              style={{ padding: '4px 8px', background: 'transparent', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={endRef} />
              </div>
            )}
          </div>

          {attachedFiles.length > 0 && (
            <div style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 8, padding: 8, background: '#f9f9f9', borderRadius: 8 }}>
              {attachedFiles.map((file) => (
                <div key={file.id} style={{ position: 'relative', display: 'inline-block' }}>
                  {file.type.startsWith('image/') ? (
                    <img src={file.data} alt={file.name} style={{ maxWidth: 80, maxHeight: 80, borderRadius: 4, objectFit: 'cover' }} />
                  ) : file.type.startsWith('video/') ? (
                    <video src={file.data} style={{ maxWidth: 80, maxHeight: 80, borderRadius: 4 }} />
                  ) : (
                    <div style={{ padding: 8, background: '#e8e8e8', borderRadius: 4, fontSize: 12, maxWidth: 80, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      📄 {file.name}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeAttachedFile(file.id)}
                    style={{ position: 'absolute', top: -8, right: -8, background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSend} style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={input} onChange={e => setInput(e.target.value)} placeholder={selectedStudent ? `Message ${selectedStudent.fullName || 'student'}` : 'Select a student to message'} style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd' }} disabled={!selectedStudent} />
            <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,.pdf" onChange={handleAttachFile} style={{ display: 'none' }} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach file"
              style={{ padding: '10px 12px', background: '#f0f0f0', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer', fontSize: 16 }}
            >
              📎
            </button>
            <button className="btn btn-primary" type="submit" disabled={!selectedStudent || (!input.trim() && attachedFiles.length === 0)}>Send</button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
