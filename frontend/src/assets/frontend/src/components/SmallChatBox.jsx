import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import '../assets/chatbox.css';
import categories from './aiCategories';

// A compact chat widget used on smaller pages (Schedule/Profile)
export default function SmallChatBox({ onClose, initialCategory = null }) {
  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const [showCategories, setShowCategories] = useState(Boolean(initialCategory));
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);

  const isGreeting = (txt) => {
    if (!txt) return false;
    const normalized = txt.toLowerCase().trim().replace(/[!?.,]+$/g, '');
    const firstTwo = normalized.split(/\s+/).slice(0,2).join(' ');
    const first = normalized.split(/\s+/)[0];
    const greetings = new Set(['hi','hello','hey','hey there','good morning','good afternoon','good evening']);
    return greetings.has(normalized) || greetings.has(firstTwo) || greetings.has(first);
  };

  const send = async (text) => {
    if (!text || !text.trim()) return;
    const t = text.trim();
    setMessages(prev => [...prev, { role: 'user', content: t }]);
    setLoading(true);
    setInput('');

    if (isGreeting(t)) {
      setMessages(prev => [...prev, { role: 'bot', content: 'Hello! How can I help you today?' }]);
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post('/api/ai/chat', { message: t });
      const reply = res?.data?.reply || res?.data?.message || (typeof res?.data === 'string' ? res.data : JSON.stringify(res?.data));
      setMessages(prev => [...prev, { role: 'bot', content: reply }]);
    } catch (err) {
      console.error('SmallChat error', err?.message || err);
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error;
      setMessages(prev => [...prev, { role: 'bot', content: serverMsg || 'Something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setShowCategories(false);
    setMessages([]);
  };

  const handleQuestionClick = async (question) => {
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    // If we have a canned answer
    const answer = categories[selectedCategory]?.answers?.[question];
    if (answer) {
      await new Promise(r => setTimeout(r, 150));
      setMessages(prev => [...prev, { role: 'bot', content: answer }]);
      return;
    }
    // Otherwise call backend
    setLoading(true);
    try {
      const res = await axios.post('/api/ai/chat', { message: question });
      const reply = res?.data?.reply || res?.data?.message || (typeof res?.data === 'string' ? res.data : JSON.stringify(res?.data));
      setMessages(prev => [...prev, { role: 'bot', content: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', content: 'Something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="small-chat-wrapper" style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button className="small-chat-close" onClick={() => { setOpen(false); onClose && onClose(); }} title="Close">✕</button>
      </div>

      <div className="small-chat" style={{ width: 300, height: 380, display: open ? 'block' : 'none', boxShadow: '0 6px 18px rgba(0,0,0,0.12)', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
        <div className="chat-header" style={{ padding: '8px 12px', background: '#0b69a3', color: 'white' }}>
          <strong>Kavya AI</strong>
        </div>
        {showCategories ? (
          <div style={{ padding: 8, height: 280, overflowY: 'auto' }}>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>Topics</div>
            {Object.keys(categories).map((cat, idx) => (
              <button key={idx} className="question-button" style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 6 }} onClick={() => handleCategoryClick(cat)}>
                {cat}
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="chat-messages" style={{ padding: 8, height: 220, overflowY: 'auto' }}>
              {messages.map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'message user' : 'message bot'} style={{ marginBottom: 6 }}>
                  {m.content}
                </div>
              ))}
              {loading && <div className="message bot">Typing...</div>}
              <div ref={endRef} />
            </div>

            <div style={{ display: 'flex', padding: 8, gap: 8 }}>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send(input)} placeholder={selectedCategory ? `Ask about ${selectedCategory}...` : 'Ask Kavya...'} style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid #e2e8f0' }} />
              <button className="btn btn-color btn-sm" onClick={() => send(input)} disabled={loading} style={{ padding: '6px 10px' }}>Send</button>
            </div>

            {/* Quick questions for selected category */}
            {selectedCategory && (
              <div style={{ padding: 8, borderTop: '1px solid #eef2f7', background: '#fafafa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <small style={{ fontWeight: 600 }}>{selectedCategory}</small>
                  <button className="btn btn-link" onClick={() => { setShowCategories(true); setSelectedCategory(null); setMessages([]); }} style={{ fontSize: 12 }}>Back</button>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {categories[selectedCategory]?.questions?.map((q, i) => (
                    <button key={i} className="question-button" style={{ padding: '6px 8px', fontSize: 12 }} onClick={() => handleQuestionClick(q)}>{q}</button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
