import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/Registration.css";

function Registration() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    gender: "",
    address: "",
    location: "",
    age: "",
    password: "",
    confirmPassword: "",
    role: "student",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('form'); // 'form' | 'otp'
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // PHONE VALIDATION (only digits, max 10)
    if (name === "phone") {
      const digits = value.replace(/\D/g, "");
      if (digits.length > 10) return;
      setFormData((prev) => ({ ...prev, phone: digits }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Step 1: send OTP to email (pre-registration)
  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setOtpLoading(true);
      const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
      const resp = await fetch(`${API_BASE}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });
      const jd = await resp.json();
      if (!resp.ok) {
        setError(jd.message || 'Failed to send OTP');
        setOtpLoading(false);
        return;
      }
      setOtpSent(true);
      setStep('otp');
      setOtpLoading(false);
    } catch (err) {
      setError('Connection error. Please try again.');
      setOtpLoading(false);
    }
  };

  // Step 2: verify OTP then submit registration
  const handleVerifyOtpAndSubmit = async () => {
    setError("");
    setOtpLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
      const vresp = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp }),
      });
      const vjson = await vresp.json();
      if (!vresp.ok) {
        setError(vjson.message || 'OTP verification failed');
        setOtpLoading(false);
        return;
      }

      // OTP verified — now submit registration to existing API
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          gender: formData.gender,
          address: formData.address,
          location: formData.location,
          age: formData.age || null,
          password: formData.password,
          role: formData.role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Registration failed");
        setLoading(false);
        setOtpLoading(false);
        return;
      }

      const normalizeGender = (val) => {
        if (!val) return "";
        const s = String(val).trim().toLowerCase();
        if (s === 'male' || s === 'm' || s === 'man' || s === 'boy') return 'male';
        if (s === 'female' || s === 'f' || s === 'woman' || s === 'girl') return 'female';
        return '';
      };
      const userToStore = { ...data.user, gender: normalizeGender(data.user.gender) };
      localStorage.setItem("token", data.user.token);
      localStorage.setItem("user", JSON.stringify(userToStore));
      localStorage.setItem("role", data.user.role);
      localStorage.setItem("userRole", data.user.role);
      try { window.dispatchEvent(new Event('userUpdated')); } catch (e) { /* ignore */ }

      navigate("/");
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setOtpLoading(false);
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div
        className="login-left"
        style={{
          backgroundImage:
            "url('https://cdn.moawin.pk/images/2023/World-education.jpg')",
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
          <h2>Create Your Account</h2>

          {error && (
            <div style={{ color: "red", marginBottom: "10px" }}>{error}</div>
          )}

          <form onSubmit={handleRegister}>
            <input
              type="text"
              placeholder="Full Name"
              className="input-field"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
            />

            <input
              type="email"
              placeholder="Your Email"
              className="input-field"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />

            {/* Phone Number */}
            <input
              type="text"
              placeholder="Phone Number (10 digits)"
              className="input-field"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
            />

            {/* Gender - Radio Buttons */}
            <div style={{ marginBottom: "10px", textAlign: "left" }}>
              <label style={{ fontWeight: "600" }}>Gender:</label>
              <div>
                <label>
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={formData.gender === "male"}
                    onChange={handleChange}
                  />
                  Male
                </label>

                <label style={{ marginLeft: "15px" }}>
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={formData.gender === "female"}
                    onChange={handleChange}
                  />
                  Female
                </label>

                <label style={{ marginLeft: "15px" }}>
                  <input
                    type="radio"
                    name="gender"
                    value="other"
                    checked={formData.gender === "other"}
                    onChange={handleChange}
                  />
                  Other
                </label>
              </div>
            </div>

            {/* Address */}
            <textarea
              name="address"
              placeholder="Address"
              className="input-field"
              style={{ height: "70px", resize: "none" }}
              value={formData.address}
              onChange={handleChange}
              required
            ></textarea>

            {/* Location */}
            <input
              type="text"
              placeholder="Location (City/Region)"
              className="input-field"
              name="location"
              value={formData.location}
              onChange={handleChange}
            />

            {/* Role */}
            <select
              name="role"
              className="input-field"
              value={formData.role}
              onChange={handleChange}
            >
              <option value="student">Student</option>
              <option value="instructor">Instructor</option>
              {/* <option value="parent">Parent</option> */}
            </select>

            {/* Age - Only visible for students */}
            {formData.role === "student" && (
              <input
                type="number"
                placeholder="Age"
                className="input-field"
                name="age"
                value={formData.age}
                onChange={handleChange}
                min="1"
                max="120"
                required
              />
            )}

            <input
              type="password"
              placeholder="Password (min 8 characters)"
              className="input-field"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />

            <input
              type="password"
              placeholder="Confirm Password"
              className="input-field"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />

            {step === 'form' && (
              <button type="submit" className="register-btn" disabled={otpLoading}>
                {otpLoading ? "Sending OTP..." : "Register"}
              </button>
            )}

            {step === 'otp' && (
              <div className="otp-actions">
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  className="otp-input-field"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0,6))}
                />
                <button
                  type="button"
                  className="verify-btn"
                  onClick={handleVerifyOtpAndSubmit}
                  disabled={otpLoading || loading}
                >
                  {otpLoading ? 'Verifying...' : 'Verify & Register'}
                </button>
                <button
                  type="button"
                  className="resend-btn"
                  onClick={async () => {
                    // resend OTP
                    setError('');
                    setOtpLoading(true);
                    try {
                      const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
                      const resp = await fetch(`${API_BASE}/api/auth/send-otp`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: formData.email }),
                      });
                      const jd = await resp.json();
                      if (!resp.ok) setError(jd.message || 'Failed to resend OTP');
                    } catch (e) {
                      setError('Connection error. Please try again.');
                    } finally { setOtpLoading(false); }
                  }}
                >
                  {otpLoading ? 'Sending...' : 'Resend OTP'}
                </button>
              </div>
            )}
          </form>

          <p className="login-text" color="gray">
            Already have an account? <a href="/">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Registration;
