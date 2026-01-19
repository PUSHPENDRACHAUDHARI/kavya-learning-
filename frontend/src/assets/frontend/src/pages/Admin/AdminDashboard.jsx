import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import AppLayout from '../../components/AppLayout';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const AdminDashboard = () => {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axiosClient.get('/api/admin/dashboard/summary');
        setSummary(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  if (!summary) return <AppLayout><div style={{ padding: '20px', textAlign: 'center' }}>Loading dashboard...</div></AppLayout>;

  const data = [
    { name: 'Students', value: summary.totalStudents },
    { name: 'Parents', value: summary.totalParents },
    { name: 'Instructors', value: summary.totalInstructors },
    { name: 'Courses', value: summary.totalCourses },
    { name: 'Enrollments', value: summary.totalEnrollments },
  ];

  return (
    <AppLayout showGreeting={false}>
      <h2>Admin Dashboard</h2>
      <div className="cards" style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div className="card p-3">Total Students: {summary.totalStudents}</div>
        <div className="card p-3">Total Courses: {summary.totalCourses}</div>
        <div className="card p-3">Total Enrollments: {summary.totalEnrollments}</div>
        <div className="card p-3">Completed Courses: {summary.completedCourses}</div>
      </div>

      <div style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;
