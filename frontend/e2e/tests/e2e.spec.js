const { test, expect } = require('@playwright/test');
const fetch = require('node-fetch');

test('register -> create course -> create quiz via UI -> attempt quiz', async ({ page, context }) => {
  const API = 'http://127.0.0.1:5000/api';

  // 1) Register instructor via API
  const email = `e2e_instructor_${Date.now()}@test.com`;
  const regRes = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName: 'E2E Instructor', email, password: 'Password123!', role: 'instructor' })
  });
  expect(regRes.status === 201 || regRes.status === 400).toBeTruthy();
  const regBody = await regRes.json();
  const token = regBody.user?.token || regBody.token;
  expect(token).toBeTruthy();

  // 2) Create course via API
  const courseRes = await fetch(`${API}/courses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title: 'E2E Course', description: 'Course for E2E test', duration: '1 week', level: 'Beginner', category: 'E2E', price: 0 })
  });
  expect(courseRes.status === 201).toBeTruthy();
  const course = await courseRes.json();
  expect(course._id).toBeTruthy();

  // 3) Set token in localStorage so frontend requests are authenticated
  await context.addInitScript(({ token }) => {
    window.localStorage.setItem('token', token);
  }, { token });

  // 4) Navigate to quizzes page
  await page.goto('/quizzes');

  // Wait for course select to populate
  await page.waitForSelector('select');
  // Select our course
  await page.selectOption('select', course._id);

  // Fill quiz form
  await page.fill('input[placeholder="Title"]', 'E2E Quiz');
  await page.fill('textarea[placeholder^="Description"]', 'E2E quiz description');
  // questions textarea placeholder contains 'Questions', so find textarea with that placeholder
  const qarea = await page.$('textarea[placeholder*="Questions"]');
  const qtext = 'What is 2+2?|1,2,3,4#3';
  await qarea.fill(qtext);

  // Listen for alert dialogs
  page.on('dialog', async dialog => {
    console.log('dialog:', dialog.message());
    await dialog.accept();
  });

  // Click create
  await page.evaluate(() => {
    const s = document.querySelector('aside.sidebar');
    if (s) {
      s.style.pointerEvents = 'none';
    }
  });
  await page.click('button[type="submit"]');

  // After create, fetch quizzes via API and ensure it exists
  const listRes = await fetch(`${API}/quiz?courseId=${course._id}`, { headers: { Authorization: `Bearer ${token}` } });
  expect(listRes.status === 200).toBeTruthy();
  const quizzes = await listRes.json();
  expect(Array.isArray(quizzes)).toBeTruthy();
  const created = quizzes.find(q => q.title === 'E2E Quiz');
  expect(created).toBeTruthy();

  // Attempt the quiz: in UI there's an Attempt button; click it
  await page.waitForSelector('ul');
  const items = await page.$$('li');
  for (const it of items) {
    const txt = await it.textContent();
    if (txt.includes('E2E Quiz')) {
      const btn = await it.$('button');
      if (btn) {
        await btn.click();
        break;
      }
    }
  }

  const submitRes = await fetch(`${API}/quiz/${created._id}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ answers: [{ questionId: created.questions[0]._id || created.questions[0].questionId, selectedOption: created.questions[0].options[0] }] })
  });
  expect(submitRes.status === 200).toBeTruthy();
  const submitBody = await submitRes.json();
  expect(submitBody).toHaveProperty('score');
});
