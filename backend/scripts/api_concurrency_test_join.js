require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

async function main() {
  const uri = process.env.MONGO_URI;
  // Connect using the same defaults as the server (do not force a different dbName)
  await mongoose.connect(uri);
  console.log('Connected to DB');

  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));
  const Event = mongoose.model('Event', new mongoose.Schema({}, { strict: false, collection: 'events' }));
  const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false, collection: 'attendances' }));

  // We'll create the event via the API so the running server can see it reliably.
  const BASE = (process.env.VITE_API_BASE_URL ? `${process.env.VITE_API_BASE_URL}/api` : 'http://localhost:5000/api');
  const registerEndpoint = `${BASE}/users/register`;
  const createEventEndpoint = `${BASE}/events`;

  // 1) Create an instructor account via API, then promote in DB so we can use it to create the event
  const instrEmail = `api_instr_${Date.now()}@example.com`;
  const instrPassword = 'Password1!';
  const regRes = await fetch(registerEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName: `API Instructor`, email: instrEmail, password: instrPassword })
  });
  const regBody = await regRes.json().catch(() => null);
  if (!regRes.ok || !regBody || !regBody.user || !regBody.user.token) {
    throw new Error('Failed to create instructor via API: ' + JSON.stringify(regBody));
  }
  const instrToken = regBody.user.token;
  const instrId = regBody.user._id;

  // promote to instructor directly in DB so server authorize() will accept
  await mongoose.model('User').updateOne({ _id: instrId }, { $set: { role: 'instructor' } });

  // Create a minimal Course (required fields) and attach it to the event
  const CourseModel = require('../models/courseModel');
  const course = await CourseModel.create({ title: 'API Test Course', description: 'Test course for concurrency script', instructor: instrId, price: 0, duration: 1, category: 'Test' });

  // Create the event via the API using the instructor token
  const eventPayload = { title: 'API Concurrency Test Event', date: new Date().toISOString().slice(0,10), startTime: '09:00', endTime: '10:00', maxStudents: 3, location: 'Online (test)', course: course._id };
  const createRes = await fetch(createEventEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${instrToken}` },
    body: JSON.stringify(eventPayload)
  });
  const createdEvent = await createRes.json().catch(() => null);
  if (!createRes.ok || !createdEvent || !createdEvent._id) {
    throw new Error('Failed to create event via API: ' + JSON.stringify(createdEvent));
  }
  const event = createdEvent;

  // Cleanup attendance for this event
  await Attendance.deleteMany({ eventId: event._id });
  await Event.updateOne({ _id: event._id }, { $set: { joinedCount: 0, enrolledStudents: [] } });

  // Create test student users via API register endpoint to ensure server-side model consistency
  const userDocs = [];
  const tokens = [];
  for (let i = 0; i < 8; i++) {
    const email = `apitest${Date.now()}_${i}@example.com`;
    const password = 'Password1!';
    const res = await fetch(registerEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: `API Test ${i}`, email, password })
    });
    const body = await res.json().catch(() => null);
    if (res.ok && body && body.user && body.user.token) {
      userDocs.push(body.user);
      tokens.push(body.user.token);
    } else {
      throw new Error(`Failed to register test user: ${email} - ${res.status} ${JSON.stringify(body)}`);
    }
  }

  // Add users to event.enrolledStudents
  const ids = userDocs.map(u => u._id);
  await Event.updateOne({ _id: event._id }, { $set: { enrolledStudents: ids } });

  // Fire concurrent requests to API
  const endpoint = (process.env.VITE_API_BASE_URL ? `${process.env.VITE_API_BASE_URL}/api` : 'http://localhost:5000/api') + '/attendance/join';
  console.log('Endpoint:', endpoint);

  const eventIdStr = event._id.toString();
  const fetches = tokens.map(token => fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ eventId: eventIdStr })
  }).then(async res => ({ status: res.status, body: await res.text() })).catch(err => ({ error: err.message })));

  const results = await Promise.all(fetches);
  console.log('Results:', results);

  // Check DB counts after test
  const finalEvent = await Event.findById(event._id).lean();
  const attendanceCount = await Attendance.countDocuments({ eventId: event._id, joinedAt: { $ne: null } });
  console.log('Final joinedCount:', finalEvent.joinedCount, 'attendanceCount:', attendanceCount);

  // Cleanup created users via DB delete (tokens will be invalid afterwards)
  await User.deleteMany({ _id: { $in: ids } });

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
