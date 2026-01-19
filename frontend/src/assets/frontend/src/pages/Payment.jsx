import React, { useState } from 'react';
import AppLayout from '../components/AppLayout';
import { useNavigate, useLocation } from 'react-router-dom';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function Payment() {
  const navigate = useNavigate();
  const query = new URLSearchParams(window.location.search);
  const courseId = query.get('courseId');
  const courseTitle = query.get('title') ? decodeURIComponent(query.get('title')) : '';

  const [name, setName] = useState('');
  const [card, setCard] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !card || !expiry || !cvv) return alert('Please complete the payment form');

    setProcessing(true);
    try {
      const token = localStorage.getItem('token');

      // 1) Create payment record on backend
      const paymentRes = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          courseId: courseId || null,
          amount: undefined,
          paymentMethod: 'card',
          transactionId: `tx_${Date.now()}`
        })
      });

      let paymentData = null;
      let paymentId = null;

      if (!paymentRes.ok) {
        // Backend couldn't record payment (e.g., demo course id). Log and fall back
        const err = await paymentRes.json().catch(() => ({}));
        console.warn('Backend payment recording failed:', err);
      } else {
        paymentData = await paymentRes.json();
        paymentId = paymentData._id;
      }

      // 2) If we have an enrollmentId (pending), activate it. Otherwise create enrollment then activate.
      let enrollmentToActivate = query.get('enrollmentId');

      if (!enrollmentToActivate) {
        // attempt to create pending enrollment post-payment (useful for demo/course-id mismatches)
        try {
          const enrollRes = await fetch('/api/enrollments/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ courseId: courseId })
          });
          if (enrollRes.ok) {
            const enrollData = await enrollRes.json();
            enrollmentToActivate = enrollData.enrollmentId;
          }
        } catch (err) {
          console.warn('Could not create enrollment after payment', err);
        }
      }

      if (enrollmentToActivate) {
        try {
          const activateRes = await fetch(`/api/enrollments/activate/${encodeURIComponent(enrollmentToActivate)}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ paymentId })
          });

          if (!activateRes.ok) {
            const err = await activateRes.json().catch(() => ({}));
            console.warn('Failed to activate enrollment on server:', err);
          }
        } catch (err) {
          console.warn('Activation request failed:', err);
        }
      }

      // Persist payment flags so Courses page can pick them up. Also set local per-user enrolled fallback
      try {
        if (courseId) window.localStorage.setItem('currentCourseId', String(courseId));
        if (courseTitle) window.localStorage.setItem('currentCourseTitle', courseTitle);
        window.localStorage.setItem('justPaid', 'true');
        // Persist an optimistic enrolled flag scoped to user+course or guest+course
        try {
          const token = localStorage.getItem('token');
          let key = `enrolled_guest_${courseId || 'unknownCourse'}`;
          if (token) {
            try {
              const profileRes = await fetch('/api/auth/profile', { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
              if (profileRes.ok) {
                const profile = await profileRes.json();
                if (profile && profile._id) key = `enrolled_${profile._id}_${courseId || 'unknownCourse'}`;
              }
            } catch (e) {
              // ignore profile fetch errors and fall back to guest key
            }
          }
          window.localStorage.setItem(key, JSON.stringify(true));
        } catch (_) {}
      } catch (e) {
        console.warn('Could not write payment flags to localStorage', e);
      }

      // Redirect to Courses page with course id in query
      navigate(`/courses?id=${encodeURIComponent(courseId || '')}`);
    } catch (err) {
      console.error('Payment failed', err);
      alert(err?.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AppLayout showGreeting={false}>
      <div className="container py-5">
        <div className="mx-auto" style={{maxWidth:520}}>
          <h3 className="mb-3">Payment for {courseTitle || 'Course'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="mb-2">
              <label className="form-label small">Name on card</label>
              <input className="form-control" value={name} onChange={(e)=>setName(e.target.value)} />
            </div>
            <div className="mb-2">
              <label className="form-label small">Card number</label>
              <input className="form-control" value={card} onChange={(e)=>setCard(e.target.value)} />
            </div>
            <div className="d-flex gap-2 mb-3">
              <input className="form-control" placeholder="MM/YY" value={expiry} onChange={(e)=>setExpiry(e.target.value)} />
              <input className="form-control" placeholder="CVV" value={cvv} onChange={(e)=>setCvv(e.target.value)} />
            </div>
            <div className="d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-light" onClick={() => navigate(-1)} disabled={processing}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={processing}>{processing ? 'Processing...' : 'Pay'}</button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
