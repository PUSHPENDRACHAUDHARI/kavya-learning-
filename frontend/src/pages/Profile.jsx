import React, { useState, useEffect } from "react";
import axios from 'axios';
import AppLayout from "../components/AppLayout";
import SmallChatBox from "../components/SmallChatBox";
import avatarFemale from "../assets/avatar-female.svg";
import profileAvatar from "../assets/profile.png";
import 'bootstrap/dist/css/bootstrap.min.css';

import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  BookOpen,
  Clock,
  Award,
  TrendingUp,
  Edit3,
  Users,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import "../assets/Profile.css";

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isSmallChatOpen, setIsSmallChatOpen] = useState(false);
  const [loadingCertCourseId, setLoadingCertCourseId] = useState(null);

  const [profile, setProfile] = useState({
    initials: "",
    name: "",
    badge: "Premium Member",
    bio: "Passionate learner exploring web development and computer science. On a mission to master full-stack development!",
    email: "",
    phone: "+91 ",
    location: "",
    joined: " ",
    gender: "",
    avatar: null,
    stats: {
      courses: 0,
      hours: 0,
      achievements: 0,
      avg: "0%",
    },
  });
  const [streakDays, setStreakDays] = useState(0);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [userRole, setUserRole] = useState('student'); // Default to student
  const [childName, setChildName] = useState('');

  

  // Check if user is a student (show all sections) or other role (hide certain sections)
  const isStudent = userRole === 'student';

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        // Get role from localStorage or API
        const storedRole = localStorage.getItem('userRole');
        if (storedRole) {
          setUserRole(storedRole);
        }

        const api = await import("../api");
        const profileRes = await api.getProfile();

        if (profileRes && profileRes._id) {
          // Update role from response if available
          if (profileRes.role) {
            setUserRole(profileRes.role);
            localStorage.setItem('userRole', profileRes.role);
          }
          setProfile((prev) => ({
            ...prev,
            name: profileRes.fullName || prev.name,
            email: profileRes.email || prev.email,
            phone: profileRes.phone || prev.phone,
            location: profileRes.location || prev.location,
            bio: profileRes.bio || prev.bio,
            gender: profileRes.gender || prev.gender,
            avatar: profileRes.avatar || null,
            initials: ((profileRes.fullName || prev.name) + "")
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase(),
            joined: profileRes.createdAt
              ? `Joined ${new Date(profileRes.createdAt).toLocaleString()}`
              : prev.joined,
          }));
          // If the user is a parent, fetch linked children and show child name in profile
          try {
            const roleNormalized = (profileRes.role || localStorage.getItem('userRole') || '').toString().toLowerCase();
            if (roleNormalized === 'parent') {
              const token = localStorage.getItem('token');
              try {
                const childrenRes = await axios.get('/api/parents/students', { headers: { Authorization: `Bearer ${token}` } });
                const children = childrenRes.data.children || [];
                if (children.length === 1) setChildName(children[0].fullName || '');
                else if (children.length > 1) setChildName(children.map(c => c.fullName).join(', '));
                else setChildName('No linked children');
              } catch (e) {
                setChildName('No linked children');
              }
            }
          } catch (e) {
            // ignore
          }
          try {
            // Keep localStorage user in sync so Header and other components update
            const userToStore = { ...profileRes };
            localStorage.setItem('user', JSON.stringify(userToStore));
            window.dispatchEvent(new Event('userUpdated'));
          } catch (e) {
            // ignore storage errors
          }
        }

        // Load streak
        try {
          const streakData = await api.getStreak();
          if (streakData && streakData.streakDays !== undefined) {
            setStreakDays(streakData.streakDays);
          }
        } catch (err) {
          console.warn("Could not load streak", err);
        }

        // Load dynamic progress, skills, certificates and activity
        try {
          const progress = await api.getProgressOverview();

          if (progress && progress.stats) {
            console.log('📚 Profile: Courses Enrolled =', progress.stats.enrolledCourses ?? 0);
            console.log('⏰ Profile: Hours Learned =', progress.stats.learningHours ?? 0);
            setProfile((prev) => ({
              ...prev,
              stats: {
                courses: progress.stats.enrolledCourses ?? 0,
                hours: progress.stats.learningHours ?? 0,
                achievements: progress.stats.achievements ?? 0,
                avg: `${progress.stats.avgScore ?? 0}%`,
              },
            }));
          }

          if (progress && Array.isArray(progress.skills)) {
            setSkills(progress.skills);
          }

          if (progress && Array.isArray(progress.certificates)) {
            setCertificates(progress.certificates);
          }

          if (progress && Array.isArray(progress.recentActivity)) {
            setActivities(
              progress.recentActivity.map((a) => ({
                text: a.description || a.action,
                time: new Date(a.createdAt).toLocaleString(),
                color: a.color || "#1b65d4",
              }))
            );
          }
        } catch (err) {
          // If progress endpoint fails (e.g. new backend not deployed), keep graceful defaults
          console.warn("Could not load progress overview", err);
        }
      } catch (err) {
        // ignore if unauthenticated — log for visibility
        console.warn('Could not load profile or user not authenticated', err?.message || err);
      }
    };

    loadProfileData();

    // Re-fetch data when window regains focus (e.g., after enrolling in another tab)
    const handleFocus = () => {
      console.log('🔄 Profile: Window focused, reloading data...');
      loadProfileData();
    };
    window.addEventListener('focus', handleFocus);

    // Re-fetch data when enrollment happens (custom event)
    const handleEnrollmentUpdate = () => {
      console.log('🔄 Profile: Enrollment updated! Reloading data...');
      loadProfileData();
    };
    window.addEventListener('enrollmentUpdated', handleEnrollmentUpdate);
    console.log('✅ Profile: Event listeners registered');

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('enrollmentUpdated', handleEnrollmentUpdate);
    };
  }, []);
  

  const [skills, setSkills] = useState([
    { name: "Course Progress", percent: 0, color: "#1b65d4" },
    { name: "Quiz Performance", percent: 0, color: "#2db88e" },
    { name: "Engagement", percent: 0, color: "#4acb9a" },
    { name: "Overall Skill", percent: 0, color: "#27c5aa" },
  ]);

  const [activities, setActivities] = useState([]);

  const [certificates, setCertificates] = useState([]);

  const prefs = {
    goal: "2 hours",
    level: "Intermediate",
    style: "Visual",
    notifications: "Enabled",
  };

  const handleDownloadCertificate = async (cert) => {
    if (!cert.courseId || cert.status === "Pending") return;
    try {
      setLoadingCertCourseId(cert.courseId);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/progress/certificates/${cert.courseId}/download`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        // Check if response is JSON (error) or PDF (success)
        const contentType = response.headers.get("content-type");
        let errorMsg = `Failed to download certificate (${response.status})`;
        if (contentType?.includes("json")) {
          try {
            const errData = await response.json();
            errorMsg = errData.message || errorMsg;
          } catch (e) {
            // If JSON parsing fails, use the status message
          }
        }
        throw new Error(errorMsg);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeTitle = (cert.title || "Course").replace(/[^a-z0-9]/gi, "_");
      link.download = `${safeTitle}_Certificate.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Optimistically update status in the UI
      setCertificates((prev) =>
        prev.map((c) =>
          c.courseId === cert.courseId ? { ...c, status: "Downloaded" } : c
        )
      );
    } catch (err) {
      alert(
        err?.message ||
          "Certificate is not yet available. Please complete the course first."
      );
    } finally {
      setLoadingCertCourseId(null);
    }
  };

  const handleChange = (e) => {
  const { name, value } = e.target;

  // PHONE VALIDATION
  if (name === "phone") {
    // remove all non-digits
    const digitsOnly = value.replace(/\D/g, "");

    // limit to 10 digits
    if (digitsOnly.length > 10) return;

    setProfile({ ...profile, phone: digitsOnly });
    return;
  }

  // NORMAL FIELDS
  setProfile({ ...profile, [name]: value });
};


  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    try {
      setUploadingPhoto(true);
      const api = await import("../api");
      const result = await api.uploadProfilePhoto(file);
      
      if (result.avatar) {
        setProfile((prev) => ({
          ...prev,
          avatar: result.avatar,
        }));
        try {
          // Update stored user and notify other components (Header)
          const stored = localStorage.getItem('user');
          if (stored) {
            const u = JSON.parse(stored);
            u.avatar = result.avatar;
            localStorage.setItem('user', JSON.stringify(u));
          } else {
            // store minimal user object if none exists
            localStorage.setItem('user', JSON.stringify({ avatar: result.avatar, fullName: profile.name, role: userRole }));
          }
          window.dispatchEvent(new Event('userUpdated'));
        } catch (e) {}
        alert("✅ Profile photo uploaded successfully!");
      }
    } catch (error) {
      alert(error.message || "Failed to upload photo. Please try again.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!profile.avatar) return;
    if (!window.confirm('Delete current profile photo?')) return;
    try {
      const api = await import('../api');
      await api.deleteProfilePhoto();
      setProfile(prev => ({ ...prev, avatar: null }));
      try {
        const stored = localStorage.getItem('user');
        if (stored) {
          const u = JSON.parse(stored);
          u.avatar = null;
          localStorage.setItem('user', JSON.stringify(u));
          // Notify other components (Header) to refresh
          window.dispatchEvent(new Event('userUpdated'));
        }
      } catch (e) {
        // ignore localStorage errors
      }
      alert('✅ Profile photo deleted');
    } catch (err) {
      console.error('Failed to delete profile photo', err);
      alert(err?.message || 'Failed to delete profile photo');
    }
  };

  const handleSubmit = (e) => {
  e.preventDefault();

  // ---------------- PHONE VALIDATION ----------------
  if (!/^\d{10}$/.test(profile.phone)) {
    alert("Phone number must be exactly 10 digits and contain only numbers.");
    return;
  }
  // ---------------------------------------------------

  (async () => {
    try {
      const api = await import('../api');
      const payload = {
        fullName: profile.name,
        phone: profile.phone,
        location: profile.location,
        bio: profile.bio,
        gender: profile.gender,
      }; 

      const updated = await api.updateProfile(payload);

      if (updated && updated._id) {
        setProfile((prev) => ({
          ...prev,
          name: updated.fullName || prev.name,
          phone: updated.phone ?? prev.phone,
          avatar: updated.avatar ?? prev.avatar,
        }));
        try {
          const stored = localStorage.getItem('user');
          if (stored) {
            const u = JSON.parse(stored);
            u.fullName = updated.fullName || u.fullName;
            if (updated.avatar) u.avatar = updated.avatar;
            localStorage.setItem('user', JSON.stringify(u));
          } else {
            localStorage.setItem('user', JSON.stringify({ fullName: updated.fullName, avatar: updated.avatar, role: userRole }));
          }
          window.dispatchEvent(new Event('userUpdated'));
        } catch (e) {}
        alert('✅ Profile updated successfully!');
      }
    } catch (err) {
      alert(err?.message || 'Failed to update profile');
    } finally {
      setIsEditing(false);
    }
  })();
};


  // prevent background scrolling when modal is open
  useEffect(() => {
    document.body.classList.toggle("modal-open", isEditing || isContactModalOpen);
  }, [isEditing, isContactModalOpen]);

  return (
    <AppLayout showGreeting={false}>
      <div className="profile-page">
        {/* === Profile Card === */}
        <div className="profile-wrapper">
          <div className="profile-top-card">
            <div className="avatar">
              {profile.avatar ? (
                <img 
                  src={profile.avatar} 
                  alt={profile.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                />
              ) : (
                (profile.gender === 'female') ? (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                    <img 
                      src={avatarFemale} 
                      alt="female avatar"
                      style={{ width: '90%', height: '90%' }}
                    />
                  </div>
                ) : (profile.gender === 'male') ? (
                  <img
                    src={profileAvatar}
                    alt="male avatar"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                  />
                ) : (
                  profile.initials
                )
              )}
            </div>

            <div className="profile-main">
              <div className="profile-main-row">
                <h2 className="profile-name">{profile.name}</h2>
                <span className="badge">{profile.badge}</span>
              </div>

              <p className="profile-bio">{profile.bio}</p>
              <div className="profile-contacts">
                <div className="left">
                  <div className="contact-item">
                    <Mail size={16} /> {profile.email}
                  </div>
                  <div className="contact-item">
                    <MapPin size={16} /> {profile.address || profile.location || 'India'}
                  </div>
                </div>
                <div className="right">
                  <div className="contact-item">
                    <Phone size={16} /> {profile.phone}
                  </div>
                  <div className="contact-item">
                    {userRole === 'parent' ? <Users size={16} /> : <Calendar size={16} />} {userRole === 'parent' ? (childName || 'No linked children') : profile.joined}
                  </div>
                </div>
              </div>
            </div>

            <div className="profile-action">
              <button className="btn-edit" onClick={() => setIsEditing(true)}>
                <Edit3 size={16} /> Edit Profile
              </button>
            </div>
          </div>

          <div className="profile-stat-grid">
            {isStudent && (
              <>
                <ProfileStatCard
                  icon={<BookOpen color="#1b337f" size={25} />}
                  value={profile.stats.courses}
                  label="Courses Enrolled"
                  iconColor="#eaf1ff"
                  valueColor="#1b337f"
                />
                <ProfileStatCard
                  icon={<Clock color="#00796b" size={25} />}
                  value={profile.stats.hours}
                  label="Hours Learned"
                  iconColor="#eaf1ff"
                  valueColor="#00796b"
                />
                <ProfileStatCard
                  icon={<Award color="#60b684ff" size={25} />}
                  value={profile.stats.achievements}
                  label="Achievements"
                  iconColor="#eaf1ff"
                  valueColor="#60b684ff"
                />
                <ProfileStatCard
                  icon={<TrendingUp color="#388e3c" size={25} />}
                  value={profile.stats.avg}
                  label="Avg. Score"
                  iconColor="#eaf1ff"
                  valueColor="#388e3c"
                />
              </>
            )}
          </div>
        </div>

        {/* === Skills and Activity (Only for Students) === */}
        {isStudent && (
        <div className="skills-activity-section">
          <div className="skills-card">
            <h3>Skills & Progress</h3>
            {skills.map((skill, i) => (
              <div className="skill-item" key={i}>
                <div className="skill-header">
                  <span>{skill.name}</span>
                  <span className="percent">{skill.percent}%</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${skill.percent}%`,
                      background: skill.color,
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          <div className="activity-card">
            <h3>Recent Activity</h3>
            <ul>
              {activities.map((a, i) => (
                <li key={i}>
                  <span
                    className="activity-dot"
                    style={{ background: a.color }}
                  ></span>
                  <div>
                    <p className="activity-text">{a.text}</p>
                    <p className="activity-time">{a.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        )}

        {/* === Bottom Section (Only for Students) === */}
        {isStudent && (
        <div className="bottom-sections">
          <div className="left-column">
            <div className="certificates-section">
              <div className="certificates-header">
                <h3>Certificates</h3>
                <button className="view-all-btn">View All</button>
              </div>
              <div className="certificates-grid">
                {certificates.map((cert, i) => (
                  <div className="certificate-card" key={cert.id || i}>
                    <div className="cert-info">
                      <div className="cert-icon">
                        <Award size={18} />
                      </div>
                      <div>
                        <h4>{cert.title}</h4>
                        <p>
                          {cert.enrolledAt
                            ? new Date(cert.enrolledAt).toLocaleDateString()
                            : ""}
                        </p>
                        <p className="cert-status">
                          Status: {cert.status || "Pending"}
                        </p>
                      </div>
                    </div>
                    <button
                      className="download-btn"
                      disabled={
                        cert.status === "Pending" ||
                        loadingCertCourseId === cert.courseId
                      }
                      onClick={() => handleDownloadCertificate(cert)}
                    >
                      {cert.status === "Downloaded"
                        ? "Re-download"
                        : "Download"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="right-columnn">
            <div className="preferences-card">
              <h3>Learning Preferences</h3>
              <div className="pref-row">
                <span>Daily Goal</span>
                <span>{prefs.goal}</span>
              </div>
              <div className="pref-row">
                <span>Difficulty Level</span>
                <span>{prefs.level}</span>
              </div>
              <div className="pref-row">
                <span>Learning Style</span>
                <span>{prefs.style}</span>
              </div>
              <div className="pref-row">
                <span>Notifications</span>
                <span>{prefs.notifications}</span>
              </div>
            </div>

            <div className="streak-card">
              <h3>Achievement Streak</h3>
              <div className="streak-icon">
                <Award size={36} color="white" />
              </div>
              <h4>{streakDays} {streakDays === 1 ? 'Day' : 'Days'}</h4>
              <p>{streakDays === 0 ? 'Start your streak by logging in daily!' : 'Keep up the great work!'}</p>
            </div>

            <div className="support-card">
              <h3>Need Help?</h3>
              <p>
                Contact our support team or chat with{" "}
                <strong>Kavya AI Tutor</strong> for assistance.
              </p>
              <div className="support-buttons">
                <button className="support-btn" onClick={() => setIsContactModalOpen(true)}>Contact Support</button>
                <button className="ai-btn" onClick={() => setIsSmallChatOpen(true)}>Chat with AI Tutor</button>
                {isSmallChatOpen && (
                  <div style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 4000 }}>
                    <SmallChatBox initialCategory={"Profile / General Dashboard"} onClose={() => setIsSmallChatOpen(false)} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* === 🧩 Modal for Editing Profile === */}
        {isEditing && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Edit Profile</h2>
              <form className="edit-form" onSubmit={handleSubmit}>
      {/* Profile Photo */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
          Profile Photo
        </label>

        <input
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          disabled={uploadingPhoto}
          style={{ width: "100%", padding: "0.5rem" }}
        />

        {uploadingPhoto && (
          <p style={{ marginTop: "0.5rem", color: "#666" }}>Uploading...</p>
        )}

        {profile.avatar && (
          <div style={{ marginTop: "0.5rem", display: 'flex', alignItems: 'center', gap: 12 }}>
            <img
              src={profile.avatar}
              alt="Preview"
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
            <div>
              <button
                type="button"
                onClick={handleDeletePhoto}
                style={{ padding: '6px 10px', background: '#fff', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: 6, cursor: 'pointer' }}
              >
                Delete Photo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inputs */}
      <input
        type="text"
        name="name"
        value={profile.name}
        onChange={handleChange}
        placeholder="Name"
      />

      <input
        type="email"
        name="email"
        value={profile.email}
        onChange={handleChange}
        placeholder="Email"
      />

      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          name="phone"
          value={profile.phone}
          onChange={handleChange}
          placeholder="Phone"
          inputMode="numeric"
          style={{ flex: 1 }}
        />

        <select name="gender" value={profile.gender} onChange={handleChange} style={{ flex: 1 }}>
          <option value="">Select Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </div>

      <input
        type="text"
        name="location"
        value={profile.location}
        onChange={handleChange}
        placeholder="Location"
      />

      <textarea
        name="bio"
        value={profile.bio}
        onChange={handleChange}
        placeholder="Bio"
        rows={3}
      />

      {/* Buttons */}
      <div className="form-buttons">
        <button type="submit" className="btn-save">
          Save Changes
        </button>

        <button
          type="button"
          className="btn-cancel"
          onClick={() => setIsEditing(false)}
        >
          Cancel
        </button>
      </div>
    </form>
            </div>
          </div>
        )}

        {/* === 🧩 Modal for Contact Support === */}
        {isContactModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Contact Support</h2>
              <p>Call our support team for assistance:</p>
              <div className="contact-phone-section">
                <Phone size={24} />
                <a href="tel:+918888999910" className="phone-link">+91 8888999910</a>
              </div>
              <div className="form-buttons">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setIsContactModalOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

/* Small sub-component for Stats */
function ProfileStatCard({ icon, value, label, iconColor, valueColor }) {
  return (
    <div className="profile-stat-card">
      <div className="stat-left">
        <div className="icon" style={{ backgroundColor: iconColor }}>
          {icon}
        </div>
        <p className="stat-label">{label}</p>
      </div>
      <h4 className="stat-value" style={{ color: valueColor }}>
        {value}
      </h4>
    </div>
  );
}
