import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function ResetPasswordPage(){
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(()=>{
    if(!token) setError('Missing reset token. Use the link you received.');
  }, [token]);

  const handle = async (e)=>{
    e?.preventDefault();
    setError('');
    if(!password || !confirm) return setError('Enter and confirm your password');
    if(password !== confirm) return setError('Passwords do not match');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    try{
      const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ token, password }) });
      const jd = await res.json();
      if(!res.ok) setError(jd.message || 'Reset failed');
      else {
        // show success then redirect to the login route (root path)
        const successMsg = jd.message || 'Password reset. Please login.';
        alert(successMsg);
        // navigate to the login page (app uses `/` for login)
        navigate('/', { state: { message: 'Password changed. Please login.' } });
      }
    }catch(err){
      setError('Connection error');
    }finally{ setLoading(false); }
  };

  return (
    <div style={{display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh'}}>
      <div style={{width:360, padding:20, border:'1px solid #eee', borderRadius:8}}>
        <h2 style={{marginTop:0}}>Reset password</h2>
        {error && <div style={{background:'#fee2e2', color:'#b91c1c', padding:10, borderRadius:6, marginBottom:8}}>{error}</div>}
        <form onSubmit={handle}>
          <input type="password" placeholder="New password" className="input-field" value={password} onChange={(e)=>setPassword(e.target.value)} required />
          <input type="password" placeholder="Confirm password" className="input-field" value={confirm} onChange={(e)=>setConfirm(e.target.value)} required />
          <button type="submit" className="login-btn" disabled={loading} style={{width:'100%'}}>{loading? 'Saving...' : 'Set password'}</button>
        </form>
      </div>
    </div>
  );
}
