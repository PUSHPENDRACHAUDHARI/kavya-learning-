const axios = require('axios');

// Quick smoke test: login as demo parent and fetch dashboard
(async () => {
  try {
    const API = process.env.API_BASE || 'http://localhost:5000';

    // login
    const login = await axios.post(`${API}/api/auth/login`, { email: 'demo-parent@example.com', password: 'parentpass' });
    const token = login.data.token;
    console.log('Logged in as demo parent, token length:', token && token.length);

    // fetch dashboard
    const dash = await axios.get(`${API}/api/parents/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
    console.log('Dashboard response keys:', Object.keys(dash.data));
    console.log('Children count:', (dash.data.children || []).length);
    console.log('Notifications count:', (dash.data.notifications || []).length);
    console.log('Upcoming events count:', (dash.data.upcomingEvents || []).length);
  } catch (err) {
    console.error('Smoke test failed:', err.response ? err.response.status : err.message);
    if (err.response && err.response.data) console.error(err.response.data);
    process.exit(1);
  }
})();