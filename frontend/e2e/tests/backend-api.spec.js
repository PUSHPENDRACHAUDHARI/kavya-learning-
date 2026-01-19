import { test, expect } from '@playwright/test';

const API_BASE = 'http://127.0.0.1:5000/api';

test.describe.serial('Backend API Integration Tests', () => {
  let authToken = '';
  let userId = '';
  let courseId = '';
  let quizId = '';
  const testEmail = `test_${Date.now()}@test.com`;

  test('1. Register instructor via API', async ({ request }) => {
    const response = await request.post(`${API_BASE}/auth/register`, {
      data: {
        fullName: 'API Test Instructor',
        email: testEmail,
        password: 'TestPass123!',
        role: 'instructor'
      }
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.user).toBeDefined();
    expect(body.user.token).toBeDefined();
    expect(body.user.role).toBe('instructor');

    authToken = body.user.token;
    userId = body.user._id;
    console.log('✓ Test 1 PASSED - Instructor registered:', body.user.email);
  });

  test('2. Create course via API', async ({ request }) => {
    const response = await request.post(`${API_BASE}/courses`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        title: 'E2E Test Course',
        description: 'Test course for API integration',
        duration: '2 weeks',
        level: 'Beginner',
        category: 'Testing',
        price: 0
      }
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body._id).toBeDefined();
    expect(body.title).toBe('E2E Test Course');

    courseId = body._id;
    console.log('✓ Test 2 PASSED - Course created:', courseId);
  });

  test('3. Create quiz via API', async ({ request }) => {
    const response = await request.post(`${API_BASE}/quiz`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        courseId: courseId,
        title: 'E2E Test Quiz',
        description: 'Test quiz for integration',
        questions: [
          {
            question: 'What is 2+2?',
            options: ['1', '2', '3', '4'],
            correctAnswer: '4'
          },
          {
            question: 'Capital of France?',
            options: ['Berlin', 'Paris', 'London', 'Madrid'],
            correctAnswer: 'Paris'
          }
        ],
        passingScore: 50,
        timeLimit: 10
      }
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body._id).toBeDefined();

    quizId = body._id;
    console.log('✓ Test 3 PASSED - Quiz created:', quizId);
  });

  test('4. List quizzes for course', async ({ request }) => {
    // Debug: Print what we're querying
    console.log('DEBUG: Querying with courseId =', courseId);
    console.log('DEBUG: Using token starting with:', authToken.substring(0, 20) + '...');
    
    const response = await request.get(`${API_BASE}/quiz?courseId=${courseId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });

    if (response.status() !== 200) {
      const errorBody = await response.json();
      console.log('ERROR Response:', response.status(), errorBody);
    }

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBeGreaterThan(0);
    console.log('✓ Test 4 PASSED - Quizzes listed:', body.length);
  });

  test('5. Create event via API', async ({ request }) => {
    const response = await request.post(`${API_BASE}/events`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        title: 'E2E Test Event',
        type: 'Live Class',
        date: new Date().toISOString().split('T')[0],
        startTime: '10:00',
        endTime: '11:00',
        location: 'Online',
        maxStudents: 30
      }
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body._id).toBeDefined();
    expect(body.title).toBe('E2E Test Event');
    console.log('✓ Test 5 PASSED - Event created:', body._id);
  });

  test('6. List events via API', async ({ request }) => {
    const response = await request.get(`${API_BASE}/events`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBeGreaterThan(0);
    console.log('✓ Test 6 PASSED - Events listed:', body.length);
  });

  test('7. Get user profile', async ({ request }) => {
    const response = await request.get(`${API_BASE}/auth/profile`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body._id).toBe(userId);
    expect(body.email).toBe(testEmail);
    expect(body.role).toBe('instructor');
    console.log('✓ Test 7 PASSED - Profile retrieved:', body.fullName);
  });

  test('8. Verify data persistence in MongoDB', async ({ request }) => {
    // Verify course persisted
    const coursesRes = await request.get(`${API_BASE}/courses`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
    expect(coursesRes.status()).toBe(200);
    const coursesData = await coursesRes.json();
    expect(coursesData.courses).toBeDefined();
    expect(coursesData.courses.find(c => c._id === courseId)).toBeDefined();
    console.log('✓ Test 8a PASSED - Course persisted in MongoDB');

    // Verify quiz persisted
    const quizzesRes = await request.get(`${API_BASE}/quiz?courseId=${courseId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
    expect(quizzesRes.status()).toBe(200);
    const quizzes = await quizzesRes.json();
    expect(Array.isArray(quizzes)).toBeTruthy();
    expect(quizzes.find(q => q._id === quizId)).toBeDefined();
    console.log('✓ Test 8b PASSED - Quiz persisted in MongoDB');

    // Verify events persisted
    const eventsRes = await request.get(`${API_BASE}/events`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
    expect(eventsRes.status()).toBe(200);
    const events = await eventsRes.json();
    expect(Array.isArray(events)).toBeTruthy();
    expect(events.length).toBeGreaterThan(0);
    console.log('✓ Test 8c PASSED - Events persisted in MongoDB');
  });
});
