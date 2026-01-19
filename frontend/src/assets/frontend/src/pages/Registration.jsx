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
    password: "",
    confirmPassword: "",
    role: "student",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

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
          password: formData.password,
          role: formData.role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Registration failed");
        setLoading(false);
        return;
      }

      localStorage.setItem("token", data.user.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("role", data.user.role);

      navigate("/");
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
              <option value="admin">Admin</option>
              <option value="parent">Parent</option>
            </select>

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

            <button type="submit" className="register-btn" disabled={loading}>
              {loading ? "Registering..." : "Register"}
            </button>
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
