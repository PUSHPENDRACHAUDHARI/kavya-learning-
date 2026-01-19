// Small helper to register an instructor, create a course and a quiz, then list quizzes
(async () => {
  try {
    const BASE = 'http://localhost:5000/api';
    const fetch = global.fetch;

    // Register
    const regRes = await fetch(`${BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: 'Dev Instructor', email: 'dev_instructor2@test.com', password: 'Password123!', role: 'instructor' })
    });
    console.log('register', regRes.status);
    const reg = await regRes.json();
    console.log(reg);

    let token = reg.user?.token || reg.token;
    if (!token) {
      // Try login if user exists
      const loginRes = await fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'dev_instructor2@test.com', password: 'Password123!' }) });
      console.log('login', loginRes.status);
      const login = await loginRes.json();
      console.log(login);
      token = login.token || login.user?.token;
    }
    if (!token) throw new Error('No token received');

    const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    // Create course
    const courseRes = await fetch(`${BASE}/courses`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ title: 'Dev Course', description: 'Course for dev', duration: '1 week', level: 'Beginner', category: 'Dev', price: 0 })
    });
    console.log('create course', courseRes.status);
    const course = await courseRes.json();
    console.log(course);

    // Create quiz
    // Build quiz payload matching model shape (options as objects, include duration and totalMarks)
    const questionsPayload = [
      { question: 'What is 2+2?', options: [{ text: '1', isCorrect: false }, { text: '2', isCorrect: false }, { text: '3', isCorrect: false }, { text: '4', isCorrect: true }], marks: 1 }
    ];
    const totalMarks = questionsPayload.reduce((s, q) => s + (q.marks || 0), 0);

    const quizRes = await fetch(`${BASE}/quiz`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ courseId: course._id, title: 'Dev Quiz', description: 'Simple quiz', questions: questionsPayload, passingScore: 50, timeLimit: 10, duration: 10, totalMarks })
    });
    console.log('create quiz', quizRes.status);
    console.log(await quizRes.json());

    // List quizzes
    const listRes = await fetch(`${BASE}/quiz?courseId=${course._id}`, { headers: authHeaders });
    console.log('list', listRes.status);
    console.log(await listRes.json());
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
