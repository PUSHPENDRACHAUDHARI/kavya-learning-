import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../assets/chatbox.css';
import categories from './aiCategories';

const initialMessages = [
  { sender: 'ai', text: 'Hello! How can I help you today?' }
];

const allQuestions = new Set();
Object.values(categories).forEach(cat => {
  cat.questions.forEach(q => allQuestions.add(q.toLowerCase()));
});

const ChatBox = ({ onClose, initialCategory = null }) => {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [showCategories, setShowCategories] = useState(true);
  const messagesEndRef = useRef(null);
 
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
 
  const sendToBackend = async (message) => {
    setLoading(true);
    if (!allQuestions.has(message.toLowerCase())) {
      try {
        const response = await axios.post('/api/ai/chat', { message });
        const reply = response?.data?.reply || response?.data?.message || (typeof response?.data === 'string' ? response.data : JSON.stringify(response?.data));
        setMessages(msgs => [...msgs, { sender: 'ai', text: reply }]);
      } catch (err) {
        console.error('Chat error', err?.response?.data || err.message);
        const serverMsg = err?.response?.data?.message || err?.response?.data?.error || 'Something went wrong. Please try again.';
        setMessages(msgs => [...msgs, { sender: 'ai', text: serverMsg }]);
      }
    } else {
      let answer = 'Sorry, I could not find an answer.';
      Object.values(categories).forEach(cat => {
        if (cat.answers[message]) answer = cat.answers[message];
      });
      await new Promise(r => setTimeout(r, 250));
      setMessages(msgs => [...msgs, { sender: 'ai', text: answer }]);
    }
    setLoading(false);
  };
 
  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim()) return;
    setMessages(prev => [...prev, { sender: 'user', text: input }]);
    await sendToBackend(input.trim());
    setInput('');
  };
 
  const handleCategoryClick = (category) => {
    if (selectedCategory !== category) {
      setMessages(initialMessages);
    }
    setSelectedCategory(category);
    setShowCategories(false);
  };
 
  const handleQuestionClick = async (question) => {
    setMessages(msgs => [...msgs, { sender: 'user', text: question }]);
    const answer = categories[selectedCategory].answers[question];
    await new Promise(r => setTimeout(r, 200));
    setMessages(msgs => [...msgs, { sender: 'ai', text: answer }]);
  };
 
  const handleBack = () => {
    setShowCategories(true);
    setSelectedCategory(null);
  };
 
  return (
    <div className="chat-popup" role="dialog" aria-label="AI Chat">
      <div className="chatbox-header"> Kavya AI Tutor <button className="close-btn" onClick={onClose}>X</button></div>
      <div className="dashboard">
        <div className="sidebar">
          {showCategories ? (
            <div className="categories">
              {Object.keys(categories).map((category, idx) => (
                <button key={idx} className="category-button" onClick={() => handleCategoryClick(category)}>
                  {category}
                </button>
              ))}
            </div>
          ) : (
            <div className="questions">
              <button className="back-button" onClick={handleBack}>← Back to Categories</button>
              {categories[selectedCategory].questions.map((question, idx) => (
                <button key={idx} className="question-button" onClick={() => handleQuestionClick(question)}>
                  {question}
                </button>
              ))}
            </div>
          )}
        </div>
 
        <div className="chat-area">
          <div className="chatbox-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-message ${msg.sender}`}>
                <span>{msg.text}</span>
              </div>
            ))}
            {loading && (
              <div className="chat-message ai"><span>Thinking...</span></div>
            )}
            <div ref={messagesEndRef} />
          </div>
 
          <form className="chatbox-input" onSubmit={handleSend}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={loading}
            />
            <button type="submit" disabled={loading}>Send</button>
          </form>
        </div>
      </div>
    </div>
  );
};
 
export default ChatBox;
 
 