#!/usr/bin/env node

const axios = require('axios');
const BASE = 'http://localhost:5000/api';

async function run(){
  try{
    console.log('Logging in demo student...');
    const login = await axios.post(`${BASE}/auth/login`, { email: 'student@demo.com', password: 'demoPassword123' });
    const token = login.data.token;
    console.log('Token received');

    console.log('Calling unenroll-all...');
    const res = await axios.post(`${BASE}/enrollments/unenroll-all`, {}, { headers: { Authorization: `Bearer ${token}` } });
    console.log('Response:', res.status, res.data);
  }catch(e){
    console.error(e.response?.data || e.message || e);
    process.exit(1);
  }
}

run();
