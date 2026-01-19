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
 
          <p className="signup-text">
            Don't you have an account? <a href="/register">Sign up</a>
          </p>
        </div>
      </div>
    </div>
  );
}
 
export default LoginPage;