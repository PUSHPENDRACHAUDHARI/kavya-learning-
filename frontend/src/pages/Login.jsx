import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import "../assets/Login.css";
 
function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  // Reset / Forgot modal states
  const [showRequestReset, setShowRequestReset] = useState(false);
  const [requestEmail, setRequestEmail] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [requestSuccess, setRequestSuccess] = useState('');
  const [requestResetUrl, setRequestResetUrl] = useState('');

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
 
  // Check for logout success message
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
     
      // Clear message after 5 seconds
      const timer = setTimeout(() => {
        setSuccessMessage("");
      }, 5000);
 
      return () => clearTimeout(timer);
    }
  }, [location]);

  // If the URL has a reset token (e.g. /reset-password?token=...), open the reset modal on the login page
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    if (token) {
      setResetToken(token);
      setShowResetModal(true);
    }
  }, [location.search]);
 
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage(""); // Clear success message when logging in
 
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
 
      const data = await response.json();
 
      if (!response.ok) {
        setError(data.message || "Login failed");
        setLoading(false);
        return;
      }
 
      // Store token and user info
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data));
      localStorage.setItem("userRole", data.role);
      
      // Redirect based on role
      if (data.role === 'admin' || data.role === 'sub-admin') {
        navigate("/admin/dashboard");
      } else if (data.role === 'instructor') {
        navigate("/instructor/dashboard");
      } else if (data.role === 'student') {
        navigate("/dashboard");
      } else if (data.role === 'parent') {
        navigate("/parent/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError("Connection error. Please try again.");
      setLoading(false);
    }
  };
 
  return (
    <div className="login-container">
      <div
        className="login-left"
        style={{
          backgroundImage:
            "url('https://i.pinimg.com/736x/a3/cd/39/a3cd39079280f9c79410817b6236e47e.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="overlay-text">
          <h1>
            KAVYA <span>LEARN</span> AI POWERED LEARNING
          </h1>
        </div>
      </div>
      {/* Request Reset Modal */}
      {showRequestReset && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1200}} onClick={() => setShowRequestReset(false)}>
          <div style={{width:360, background:'#fff', borderRadius:10, padding:20, boxShadow:'0 10px 30px rgba(0,0,0,0.2)'}} onClick={(e)=>e.stopPropagation()}>
            <h3 style={{marginTop:0}}>Forgot password</h3>
            <p style={{marginTop:0, marginBottom:12, color:'#374151'}}>Enter your account email and we'll send a reset link.</p>
            {requestError && <div style={{background:'#fee2e2', color:'#b91c1c', padding:8, borderRadius:6, marginBottom:8}}>{requestError}</div>}
            {requestSuccess && <div style={{background:'#d1fae5', color:'#065f46', padding:8, borderRadius:6, marginBottom:8}}>{requestSuccess}</div>}
            <input className="input-field" placeholder="Email" value={requestEmail} onChange={(e)=>setRequestEmail(e.target.value)} style={{marginBottom:10}} />
            <div style={{display:'flex', gap:8}}>
              <button className="login-btn" onClick={async ()=>{
                setRequestError(''); setRequestSuccess(''); setRequestLoading(true);
                try {
                  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
                  const resp = await fetch(`${API_BASE}/api/auth/forgot-password`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email: requestEmail }) });
                  const jd = await resp.json();
                  if (!resp.ok) setRequestError(jd.message || 'Request failed');
                  else {
                    setRequestSuccess(jd.message || 'If that email is registered, a reset link has been sent.');
                    if (jd.resetUrl) setRequestResetUrl(jd.resetUrl);
                  }
                } catch (e) { setRequestError('Connection error'); }
                setRequestLoading(false);
              }} disabled={requestLoading || !requestEmail}>{requestLoading ? 'Sending...' : 'Send reset link'}</button>
              <button className="login-btn" style={{background:'#ddd', color:'#111'}} onClick={()=>setShowRequestReset(false)}>Close</button>
            </div>
            {/* When a reset URL is available (provided externally), show Open reset link */}
            {requestResetUrl && (
              <div style={{marginTop:12, padding:10, border:'1px dashed #e5e7eb', borderRadius:6}}>
                <div style={{display:'flex', gap:8}}>
                  <button className="login-btn" onClick={()=>{
                    try {
                      const url = new URL(requestResetUrl);
                      const token = url.searchParams.get('token');
                      if (token) {
                        navigate(`/reset-password?token=${encodeURIComponent(token)}`);
                      } else {
                        window.location.href = requestResetUrl;
                      }
                    } catch (e) {
                      window.location.href = requestResetUrl;
                    }
                  }}>Open reset link</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reset Password Modal (opened when token present) */}
      {showResetModal && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1200}} onClick={() => { setShowResetModal(false); window.history.replaceState({}, document.title, window.location.pathname); }}>
          <div style={{width:400, background:'#fff', borderRadius:10, padding:24, boxShadow:'0 12px 40px rgba(0,0,0,0.25)'}} onClick={(e)=>e.stopPropagation()}>
            <h3 style={{marginTop:0}}>Set a new password</h3>
            <p style={{marginTop:0, marginBottom:12, color:'#374151'}}>Choose a secure password for your account.</p>
            {resetError && <div style={{background:'#fee2e2', color:'#b91c1c', padding:8, borderRadius:6, marginBottom:8}}>{resetError}</div>}
            <input type="password" className="input-field" placeholder="New password" value={resetPassword} onChange={(e)=>setResetPassword(e.target.value)} style={{marginBottom:8}} />
            <input type="password" className="input-field" placeholder="Confirm password" value={resetConfirm} onChange={(e)=>setResetConfirm(e.target.value)} style={{marginBottom:12}} />
            <div style={{display:'flex', gap:8}}>
              <button className="login-btn" onClick={async ()=>{
                setResetError('');
                if (!resetPassword || !resetConfirm) return setResetError('Please enter and confirm your password');
                if (resetPassword !== resetConfirm) return setResetError('Passwords do not match');
                if (resetPassword.length < 6) return setResetError('Password must be at least 6 characters');
                setResetLoading(true);
                try {
                  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
                  const resp = await fetch(`${API_BASE}/api/auth/reset-password`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ token: resetToken, password: resetPassword }) });
                  const jd = await resp.json();
                  if (!resp.ok) {
                    setResetError(jd.message || 'Reset failed');
                  } else {
                    // success — close modal, clear token from URL, and navigate to login with message
                    setShowResetModal(false);
                    window.history.replaceState({}, document.title, window.location.pathname);
                    navigate('/', { state: { message: jd.message || 'Password changed. Please login.' } });
                  }
                } catch (e) { setResetError('Connection error'); }
                setResetLoading(false);
              }} disabled={resetLoading}>{resetLoading ? 'Saving...' : 'Set password'}</button>
              <button className="login-btn" style={{background:'#ddd', color:'#111'}} onClick={()=>{ setShowResetModal(false); window.history.replaceState({}, document.title, window.location.pathname); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
 
      <div className="login-right">
        <div className="login-card">
          <h2>Welcome back!</h2>
 
          {/* Success Message */}
          {successMessage && (
            <div style={{
              padding: "12px 20px",
              backgroundColor: "#10B981",
              color: "white",
              borderRadius: "8px",
              marginBottom: "15px",
              textAlign: "center",
              fontSize: "14px",
              fontWeight: "500"
            }}>
              {successMessage}
            </div>
          )}
 
          {/* Error Message */}
          {error && (
            <div style={{
              padding: "12px 20px",
              backgroundColor: "#EF4444",
              color: "white",
              borderRadius: "8px",
              marginBottom: "15px",
              textAlign: "center",
              fontSize: "14px",
              fontWeight: "500"
            }}>
              {error}
            </div>
          )}
 
          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Your Email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="forgot">
              <button type="button" style={{background:'none', border:'none', color:'#2563eb', cursor:'pointer', padding:0}} onClick={() => { setShowRequestReset(true); setRequestEmail(''); setRequestError(''); setRequestSuccess(''); setRequestResetUrl(''); }}>
                Forget password?
              </button>
            </div>
 
            <button
              type="submit"
              className="login-btn"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
 
          <div className="divider">
            <span>or</span>
          </div>
 
          <p className="signup-text">
            Don't you have an account? <a href="/register">Sign up</a>
          </p>
        </div>
      </div>
    </div>
  );
}
 
export default LoginPage;