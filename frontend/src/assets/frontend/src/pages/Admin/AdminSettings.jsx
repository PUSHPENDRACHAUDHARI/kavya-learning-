import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import AppLayout from '../../components/AppLayout';

const AdminSettings = () => {
  const [claudeEnabled, setClaudeEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axiosClient.get('/api/flags/CLAUDE_HAIKU_ENABLED');
        setClaudeEnabled(res.data.value === true || res.data.value === 'true');
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleToggle = async (e) => {
    const newValue = e.target.checked;
    setClaudeEnabled(newValue);
    try {
      await axiosClient.put('/api/flags/CLAUDE_HAIKU_ENABLED', { value: newValue });
    } catch (err) {
      alert('Error updating flag: ' + (err.response?.data?.message || err.message));
      setClaudeEnabled(!newValue);
    }
  };

  if (loading) return <AppLayout><div style={{ padding: '20px', textAlign: 'center' }}>Loading settings...</div></AppLayout>;

  return (
    <AppLayout showGreeting={false}>
      <h2>Admin Settings</h2>
      <div className="card p-4">
        <h5>AI Model Configuration</h5>
        <div className="form-check form-switch">
          <input
            className="form-check-input"
            type="checkbox"
            id="claudeToggle"
            checked={claudeEnabled}
            onChange={handleToggle}
          />
          <label className="form-check-label" htmlFor="claudeToggle">
            Enable Claude Haiku 4.5 for all clients
          </label>
        </div>
        <small className="text-muted d-block mt-2">
          When enabled, AI requests will be routed to Claude Haiku 4.5. Make sure CLAUDE_API_KEY is configured on the server.
        </small>
      </div>
    </AppLayout>
  );
};

export default AdminSettings;
