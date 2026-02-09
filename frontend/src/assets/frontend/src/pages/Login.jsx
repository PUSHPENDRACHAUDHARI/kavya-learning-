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
  // Admin login modal state
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
 
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
 
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage(""); // Clear success message when logging in

    // Prevent admin from using the regular login form
    if (email && String(email).trim().toLowerCase() === 'pravinkumar@gmail.com') {
      setError("Admin accounts cannot sign in from this form — please try the 'Login as Admin' form.");
      setLoading(false);
      return;
    }
 
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
 
      // Store token and user info (normalize gender)
      const normalizeGender = (val) => {
        if (!val) return "";
        const s = String(val).trim().toLowerCase();
        if (s === 'male' || s === 'm' || s === 'man' || s === 'boy') return 'male';
        if (s === 'female' || s === 'f' || s === 'woman' || s === 'girl') return 'female';
        return "";
      };

      const userToStore = { ...data, gender: normalizeGender(data.gender) };
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(userToStore));
      localStorage.setItem("userRole", data.role);
      try { window.dispatchEvent(new Event('userUpdated')); } catch (e) { /* ignore */ }
      
      // Redirect based on role
      if (data.role === 'admin' || data.role === 'sub-admin') {
        navigate("/admin/dashboard");
      } else if (data.role === 'instructor') {
        navigate("/instructor/dashboard");
      } else if (data.role === 'student') {
        navigate("/dashboard");
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
            <div className="forgot">Forget password?</div>
 
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

          <div style={{display:'flex', gap:8, justifyContent:'center', marginTop:8}}>
            <button className="login-btn admin" onClick={() => setShowAdminLogin(true)}>Login as Admin</button>
          </div>

          <p className="signup-text">
            Don't you have an account? <a href="/register">Sign up</a>
          </p>

          {/* Admin Login Modal */}
          {showAdminLogin && (
            <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1200}} onClick={() => setShowAdminLogin(false)}>
              <div style={{width:380, background:'#fff', borderRadius:10, padding:20, boxShadow:'0 12px 40px rgba(0,0,0,0.25)'}} onClick={(e)=>e.stopPropagation()}>
                <h3 style={{marginTop:0}}>Admin Login</h3>
                {adminError && <div style={{background:'#fee2e2', color:'#b91c1c', padding:8, borderRadius:6, marginBottom:8}}>{adminError}</div>}
                <input className="input-field" placeholder="Admin Email" value={adminEmail} onChange={(e)=>setAdminEmail(e.target.value)} style={{marginBottom:8}} />
                <input className="input-field" placeholder="Password" type="password" value={adminPassword} onChange={(e)=>setAdminPassword(e.target.value)} style={{marginBottom:12}} />
                <div style={{display:'flex', gap:8}}>
                  <button className="login-btn" onClick={async ()=>{
                    setAdminError(''); setAdminLoading(true);
                    try {
                      const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
                      const resp = await fetch(`${API_BASE}/api/auth/login`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email: adminEmail, password: adminPassword }) });
                      const jd = await resp.json();
                      if (!resp.ok) {
                        setAdminError(jd.message || 'Login failed');
                      } else {
                        if (jd.role === 'admin' || jd.role === 'sub-admin') {
                          localStorage.setItem('token', jd.token);
                          localStorage.setItem('user', JSON.stringify(jd));
                          localStorage.setItem('userRole', jd.role);
                          try { window.dispatchEvent(new Event('userUpdated')); } catch (e) {}
                          setShowAdminLogin(false);
                          navigate('/admin/dashboard');
                        } else {
                          setAdminError('This account is not an admin');
                        }
                      }
                    } catch (e) { setAdminError('Connection error'); }
                    setAdminLoading(false);
                  }} disabled={adminLoading || !adminEmail || !adminPassword}>{adminLoading ? 'Signing in...' : 'Sign in as Admin'}</button>
                  <button className="login-btn" style={{background:'#ddd', color:'#111'}} onClick={()=>setShowAdminLogin(false)}>Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
 
export default LoginPage;