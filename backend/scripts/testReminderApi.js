#!/usr/bin/env node

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BASE_URL = 'http://localhost:5000/api';

async function testReminderApi() {
  try {
    console.log('🧪 Testing Reminder API...\n');

    // Step 1: Login as demo student
    console.log('📝 Step 1: Logging in as demo student...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@demo.com',
        password: 'demoPassword123'
      })
    });

    if (!loginRes.ok) {
      throw new Error(`Login failed: ${loginRes.status}`);
    }

    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('✅ Login successful');
    console.log('   Token:', token.substring(0, 20) + '...');

    // Step 2: Set reminder
    console.log('\n📝 Step 2: Setting reminder for Mathematics class...');
    const reminderRes = await fetch(`${BASE_URL}/events/reminder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        eventTitle: 'Mathematics',
        eventDate: '16 December 2025, 1:00 PM',
        reminderType: 'upcoming_class'
      })
    });

    if (!reminderRes.ok) {
      const errData = await reminderRes.json();
      throw new Error(`Reminder failed (${reminderRes.status}): ${JSON.stringify(errData)}`);
    }

    const reminderData = await reminderRes.json();
    console.log('✅ Reminder set successfully!');
    console.log('   Response:', JSON.stringify(reminderData, null, 2));

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

testReminderApi();
