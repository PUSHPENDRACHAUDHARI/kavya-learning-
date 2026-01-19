// smokeTest.js
// Node 18+ required (global fetch available)
// Usage: node smokeTest.js

const BASE = 'http://localhost:5000/api';

function logStep(name, data) {
  console.log('\n==== ' + name + ' ====');
  if (data instanceof Error) {
    console.error(data);
  } else {
    try {
      console.log(JSON.stringify(data, null, 2));
    } catch (e) {
      console.log(String(data));
    }
  }
}

async function run() {
  try {
    // Use a timestamped email to avoid "user exists" issues
  const ts = Date.now();
  // use a valid public TLD to satisfy email regex in user model
  const email = `smoke_${ts}@test.com`;
    const password = 'Test1234';

    // 1) Register
    try {
      const res = await fetch(`${BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: 'Smoke Tester', email, password, role: 'instructor' })
      });
      const body = await res.json().catch(()=>null);
      logStep('Register', { status: res.status, body });
    } catch (err) {
      logStep('Register', err);
    }

    // 2) Login
    let token = null;
    let user = null;
    try {
      const res = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const body = await res.json().catch(()=>null);
      logStep('Login', { status: res.status, body });
      if (res.ok && body?.token) {
        token = body.token;
        user = body;
      }
    } catch (err) {
      logStep('Login', err);
    }

    if (!token) {
      console.error('\nNo token obtained — aborting remaining tests');
      process.exitCode = 2;
      return;
    }

    const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    // 3) Get profile
    try {
      const res = await fetch(`${BASE}/auth/profile`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json().catch(()=>null);
      logStep('Profile', { status: res.status, body });
    } catch (err) {
      logStep('Profile', err);
    }

    // 4) Create course
    let courseId = null;
    try {
      const payload = { title: 'Smoke Course', description: 'Auto test course', price: 0, duration: '1 week', level: 'Beginner', category: 'Test' };
      const res = await fetch(`${BASE}/courses`, { method: 'POST', headers: authHeaders, body: JSON.stringify(payload) });
      const body = await res.json().catch(()=>null);
      logStep('Create Course', { status: res.status, body });
      if (res.ok && body?._id) courseId = body._id;
    } catch (err) {
      logStep('Create Course', err);
    }

    // 5) List courses
    try {
      const res = await fetch(`${BASE}/courses`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json().catch(()=>null);
      logStep('List Courses', { status: res.status, body });
    } catch (err) {
      logStep('List Courses', err);
    }

    // 6) Create event
    let eventId = null;
    try {
      const payload = { title: 'Smoke Event', description: 'Auto test event', date: '2025-11-20', startTime: '10:00', endTime: '11:00', location: 'Online', capacity: 10 };
      const res = await fetch(`${BASE}/events`, { method: 'POST', headers: authHeaders, body: JSON.stringify(payload) });
      const body = await res.json().catch(()=>null);
      logStep('Create Event', { status: res.status, body });
      if (res.ok && body?._id) eventId = body._id;
    } catch (err) {
      logStep('Create Event', err);
    }

    // 7) List events
    try {
      const res = await fetch(`${BASE}/events`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json().catch(()=>null);
      logStep('List Events', { status: res.status, body });
    } catch (err) {
      logStep('List Events', err);
    }

    console.log('\nSmoke tests completed');
  } catch (err) {
    console.error('Unexpected error running smoke tests:', err);
    process.exitCode = 3;
  }
}

run();
