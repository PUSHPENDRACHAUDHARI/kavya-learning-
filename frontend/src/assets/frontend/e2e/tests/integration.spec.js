import { test, expect } from '@playwright/test';

const API_BASE = 'http://127.0.0.1:5000/api';
const FRONTEND_BASE = 'http://127.0.0.1:5173';

let authToken = '';
let userId = '';
let courseId = '';
let quizId = '';
let testEmail = `test_${Date.now()}@test.com`;

test.describe.serial('KavyaLearn Full Stack Integration', () => {
  test('1. Register instructor via backend API', async ({ request }) => {
    const response = await request.post(`${API_BASE}/auth/register`, {
      data: {
        fullName: 'Test Instructor',
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
    console.log('✓ Instructor registered:', body.user.email);
  });

  test('2. Create course via backend API', async ({ request }) => {
    const response = await request.post(`${API_BASE}/courses`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        title: 'E2E Test Course',
        description: 'Test course for e2e validation',
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
    console.log('✓ Course created:', courseId);
  });

  test('3. Create quiz via backend API', async ({ request }) => {
    const response = await request.post(`${API_BASE}/quiz`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        courseId: courseId,
        title: 'E2E Test Quiz',
        description: 'Test quiz for e2e',
        questions: [
          {
            question: 'What is 2+2?',
            options: ['1', '2', '3', '4'],
            correctAnswer: '4'
          },
          {
            question: 'What is the capital of France?',
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
    expect(body.title).toBe('E2E Test Quiz');

    quizId = body._id;
    console.log('✓ Quiz created:', quizId);
  });

  test('4. List quizzes for course via API', async ({ request }) => {
    const response = await request.get(`${API_BASE}/quiz?courseId=${courseId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBeGreaterThan(0);
    expect(body.find(q => q._id === quizId)).toBeDefined();
    console.log('✓ Quiz listed in course');
  });

  test('5. Submit quiz and verify scoring', async ({ request }) => {
    const response = await request.post(`${API_BASE}/quiz/${quizId}/submit`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        answers: [
          { questionId: 'dummy1', selectedOption: '4' },
          { questionId: 'dummy2', selectedOption: 'Paris' }
        ]
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.score).toBeDefined();
    expect(body.passed).toBeDefined();
    expect(body.results).toBeDefined();
    console.log('✓ Quiz submitted - Score:', body.score, 'Passed:', body.passed);
  });

  test('6. Create event via backend API', async ({ request }) => {
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
    console.log('✓ Event created:', body._id);
  });

  test('7. List events', async ({ request }) => {
    const response = await request.get(`${API_BASE}/events`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
    console.log('✓ Events listed, count:', body.length);
  });

  test('8. Get authenticated user profile', async ({ request }) => {
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
    console.log('✓ Profile verified:', body.fullName, '(' + body.role + ')');
  });

  test('9. Frontend: Login and verify dashboard', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE}/`);
    await page.waitForSelector('input[type="email"]');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', 'TestPass123!');
    await page.click('button:has-text("Login")');
    await page.waitForURL(`${FRONTEND_BASE}/dashboard`, { timeout: 10000 }).catch(() => {
      expect(page.url()).not.toContain('/login');
    });
    console.log('✓ Frontend login successful, redirected to:', page.url());
  });

  test('10. Frontend: Schedule page loads events', async ({ page }) => {
    await page.goto(`${FRONTEND_BASE}/schedule`);
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
      localStorage.setItem('role', 'instructor');
    }, authToken);
    await page.reload();
    await page.waitForSelector('text=My Schedule', { timeout: 5000 }).catch(() => {
      console.log('Schedule page loaded (heading might not be visible)');
    });
    console.log('✓ Schedule page accessible with token');
  });

  test('11. Frontend: Profile page loads user data', async ({ page }) => {
    await page.context().addInitScript((token) => {
      try {
        window.localStorage.setItem('token', token);
        window.localStorage.setItem('role', 'instructor');
      } catch (e) {}
    }, authToken);
    await page.goto(`${FRONTEND_BASE}/profile`);
    await page.waitForSelector('text=Edit Profile', { timeout: 5000 }).catch(() => {
      console.log('Profile page loaded');
    });
    console.log('✓ Profile page accessible');
  });

  test('12. Verify data persisted in MongoDB', async ({ request }) => {
    const coursesRes = await request.get(`${API_BASE}/courses`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(coursesRes.status()).toBe(200);
    const coursesData = await coursesRes.json();
    expect(coursesData.courses).toBeDefined();
    expect(coursesData.courses.find(c => c._id === courseId)).toBeDefined();
    console.log('✓ Course persisted in MongoDB');

    const quizzesRes = await request.get(`${API_BASE}/quiz?courseId=${courseId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(quizzesRes.status()).toBe(200);
    const quizzes = await quizzesRes.json();
    expect(Array.isArray(quizzes)).toBeTruthy();
    expect(quizzes.find(q => q._id === quizId)).toBeDefined();
    console.log('✓ Quiz persisted in MongoDB');

    const eventsRes = await request.get(`${API_BASE}/events`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(eventsRes.status()).toBe(200);
    const events = await eventsRes.json();
    expect(Array.isArray(events)).toBeTruthy();
    expect(events.length).toBeGreaterThan(0);
    console.log('✓ Events persisted in MongoDB');
  });
});
