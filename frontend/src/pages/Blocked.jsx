import React from 'react';
import AppLayout from '../components/AppLayout';

const Blocked = () => {
  return (
    <AppLayout>
      <div style={{ padding: 30, textAlign: 'center' }}>
        <h2>Account Blocked ⚠️</h2>
        <p>Your account has been blocked by the administrator. You cannot log in or access protected content.</p>
        <p>If you believe this is a mistake, please contact support.</p>
        <div style={{ marginTop: 18 }}>
          <button className="btn btn-primary" onClick={() => { localStorage.removeItem('token'); window.location = '/'; }}>
            Sign out
          </button>
        </div>
      </div>
    </AppLayout>
  );
};

export default Blocked;
