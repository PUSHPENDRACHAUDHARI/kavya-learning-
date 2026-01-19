(async () => {
  try {
    const base = 'http://localhost:5000';
    // login
    const loginRes = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo-student@example.com', password: 'studentpass' })
    });
    const loginJson = await loginRes.json().catch(() => ({}));
    console.log('Login response status:', loginRes.status);
    console.log('Login body:', loginJson);
    const token = loginJson.token || loginJson.token;
    if (!token) {
      console.error('No token received, cannot proceed');
      process.exit(1);
    }

    // call upcoming
    const upRes = await fetch(`${base}/api/schedule/upcoming`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const upJson = await upRes.json().catch(() => ({}));
    console.log('Upcoming response status:', upRes.status);
    console.log('Upcoming body:', JSON.stringify(upJson, null, 2));
  } catch (err) {
    console.error('Error testing API:', err);
    process.exit(1);
  }
})();
