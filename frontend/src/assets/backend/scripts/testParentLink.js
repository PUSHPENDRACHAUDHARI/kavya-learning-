const axios = require('axios');

const API = process.env.API_URL || 'http://localhost:5000';

async function run() {
  try {
    // 1. log in as demo parent
    const loginRes = await axios.post(`${API}/api/auth/login`, {
      email: 'demo-parent@example.com',
      password: 'parentpass'
    });
    const token = loginRes.data.token || (loginRes.data && loginRes.data.token);
    if (!token) {
      console.error('Login did not return token:', loginRes.data);
      return process.exit(1);
    }
    console.log('Logged in, token length:', token.length);

    const headers = { Authorization: `Bearer ${token}` };

    // 2. link demo student
    const linkRes = await axios.post(`${API}/api/parents/link`, { email: 'demo-student@example.com' }, { headers });
    console.log('Link response:', linkRes.data);

    // 3. list children
    const childrenRes = await axios.get(`${API}/api/parents/students`, { headers });
    console.log('Children:', childrenRes.data);
    const child = childrenRes.data.children && childrenRes.data.children[0];
    if (!child) return console.log('No children found after linking');

    // 4. get student report
    const reportRes = await axios.get(`${API}/api/parents/student/${child._id}/report`, { headers });
    console.log('Report:', JSON.stringify(reportRes.data.report, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Test error:', err.response ? err.response.data : err.message);
    process.exit(1);
  }
}

run();
