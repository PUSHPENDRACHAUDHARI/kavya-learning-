// backend/__tests__/admin.test.js
// Simple integration tests for admin endpoints
// Run with: npm test (if jest is installed) or node __tests__/admin.test.js

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
let adminToken = '';

const api = axios.create({ baseURL: BASE_URL });

const testRunner = async () => {
  try {
    console.log('\n=== Admin API Integration Tests ===\n');

    // 1. Create an admin account
    console.log('1. Creating admin user...');
    const regRes = await api.post('/api/auth/register', {
      fullName: 'Test Admin',
      email: 'testadmin@example.com',
      password: 'password123',
      role: 'admin'
    });
    adminToken = regRes.data.token;
    console.log('✓ Admin created and logged in');

    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    // 2. Create a course
    console.log('\n2. Creating a course...');
    const courseRes = await api.post('/api/admin/courses', {
      title: 'Test Course',
      description: 'A test course',
      category: 'General',
      level: 'Beginner',
      status: 'active'
    }, { headers: adminHeaders });
    const courseId = courseRes.data._id;
    console.log('✓ Course created:', courseRes.data.title);

    // 3. List courses
    console.log('\n3. Listing courses...');
    const coursesRes = await api.get('/api/admin/courses', { headers: adminHeaders });
    console.log(`✓ Found ${coursesRes.data.data?.length || coursesRes.data?.length || 0} courses`);

    // 4. Create a student
    console.log('\n4. Creating a student...');
    const studentRes = await api.post('/api/admin/users', {
      fullName: 'Test Student',
      email: 'student@example.com',
      password: 'password123',
      role: 'student'
    }, { headers: adminHeaders });
    const studentId = studentRes.data._id;
    console.log('✓ Student created:', studentRes.data.fullName);

    // 5. Enroll student in course
    console.log('\n5. Creating enrollment...');
    const enrollRes = await api.post('/api/admin/enrollments', {
      studentId,
      courseId
    }, { headers: adminHeaders });
    console.log('✓ Enrollment created:', enrollRes.data._id);

    // 6. Get dashboard summary
    console.log('\n6. Fetching dashboard summary...');
    const summaryRes = await api.get('/api/admin/dashboard/summary', { headers: adminHeaders });
    console.log('✓ Dashboard Summary:', {
      totalStudents: summaryRes.data.totalStudents,
      totalCourses: summaryRes.data.totalCourses,
      totalEnrollments: summaryRes.data.totalEnrollments
    });

    // 7. Test feature flags
    console.log('\n7. Testing feature flags...');
    const flagRes = await api.get('/api/flags/CLAUDE_HAIKU_ENABLED');
    console.log('✓ Feature flag retrieved:', flagRes.data);

    const setFlagRes = await api.put('/api/flags/CLAUDE_HAIKU_ENABLED', { value: true }, { headers: adminHeaders });
    console.log('✓ Feature flag updated:', setFlagRes.data);

    // 8. List activity logs
    console.log('\n8. Fetching activity logs...');
    const logsRes = await api.get('/api/admin/logs', { headers: adminHeaders });
    console.log(`✓ Found ${logsRes.data.data?.length || 0} activity logs`);

    console.log('\n=== All tests passed! ===\n');
  } catch (err) {
    console.error('\n✗ Test failed:', err.response?.data || err.message);
    process.exit(1);
  }
};

// Run tests
testRunner();
