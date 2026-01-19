import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import StatCard from "../components/StatCard";
import { LuAward, LuBookOpen, LuClock4 } from "react-icons/lu";
import { FaBell } from "react-icons/fa";
import chatbot from "../assets/chatbot.png";
import trophy from "../assets/leaderboard-trophy.png";
import { FaArrowTrendUp } from "react-icons/fa6";
import AppLayout from "../components/AppLayout";
import ChatBox from "../components/ChatBox"; // ✅ Import ChatBox
import "../assets/dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
  const [activeVideo, setActiveVideo] = useState(null);
  const [openChat, setOpenChat] = useState(false); // ✅ Chat state
  const [user, setUser] = useState(null);
  const [totalCourses, setTotalCourses] = useState(0);
  const [hoursLearned, setHoursLearned] = useState(0);
  const [achievementsCount, setAchievementsCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [recentAchievements, setRecentAchievements] = useState([]);
  const [earnedBadges, setEarnedBadges] = useState([]); // Track user's earned badges
  const [reminders, setReminders] = useState({}); // Track which classes user has set reminders for
  const [enrolledCourses, setEnrolledCourses] = useState([]); // Fetch enrolled courses from backend
  const coursesContainerRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  // ANNOUNCEMENTS
  const [announcements] = useState([
    { text: "New batch starting soon", link: "https://example.com/batch" },
    { text: "Live classes updated", link: "https://example.com/live" },
    { text: "AI mentor improvements released", link: "https://example.com/ai" },
    { text: "Exams scheduled for next week", link: "https://example.com/exams" },
  ]);

  // UPCOMING CLASSES
  const upcoming = [
    { title: "Mathematics", date: "16 December 2025, 1:00 PM" },
    { title: "Physics", date: "20 December 2025, 10:00 AM" },
    { title: "Chemistry", date: "25 December 2025, 2:00 PM"},
  ];

  // ✅ Greeting passed to Header from Dashboard ONLY
  const firstName = user?.fullName ? user.fullName.split(' ')[0] : (user?.email ? user.email.split('@')[0] : 'User');
  
  // Check if this is first login - check localStorage first (from login response), then user object
  const storedUserData = localStorage.getItem('user');
  let isFirstLogin = false;
  if (storedUserData) {
    try {
      const storedUser = JSON.parse(storedUserData);
      isFirstLogin = storedUser.isFirstLogin === true || storedUser.firstLogin === true;
    } catch (e) {
      // If parsing fails, check user object
      isFirstLogin = user?.isFirstLogin === true || user?.firstLogin === true;
    }
  } else {
    isFirstLogin = user?.isFirstLogin === true || user?.firstLogin === true;
  }
  
  const greeting = (
    <div>
      <h1 className="mb-1" style={{ color: "#1A365D", fontSize: "1.3rem" }}>
        Hello, {firstName}
      </h1>
      <p style={{ margin: 0, fontSize: "1.2rem", fontWeight: "400", color: "#758096" }}>
        {isFirstLogin ? "Welcome to your learning journey!" : "Welcome back to your learning journey!"}
      </p>
    </div>
  );

  useEffect(() => {
    // Lazy-load profile; use the app's API helper if available.
    async function loadProfile() {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Fetch user profile
        const profileRes = await fetch('/api/auth/profile', {
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setUser(profileData);
          try {
            // Preserve isFirstLogin from localStorage if it exists, otherwise use firstLogin from profile
            const storedUser = localStorage.getItem('user');
            let isFirstLoginValue = profileData.firstLogin === true;
            if (storedUser) {
              try {
                const parsedStoredUser = JSON.parse(storedUser);
                if (parsedStoredUser.isFirstLogin !== undefined) {
                  isFirstLoginValue = parsedStoredUser.isFirstLogin === true;
                }
              } catch (e) {
                // If parsing fails, use firstLogin from profile
              }
            }
            // Save profile data with isFirstLogin flag
            const userDataToSave = {
              ...profileData,
              isFirstLogin: isFirstLoginValue
            };
            localStorage.setItem('user', JSON.stringify(userDataToSave));
            window.dispatchEvent(new Event('userUpdated'));
          } catch (e) {
            console.warn('Could not save user to localStorage', e);
          }
        }

        // Fetch reminders from backend notifications
        try {
          const notificationsRes = await fetch('/api/notifications', {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            }
          });
          if (notificationsRes.ok) {
            const notificationsData = await notificationsRes.json();
            const notifications = notificationsData.notifications || notificationsData || [];
            
            // Extract reminder event titles and set them in state
            const remindersMap = {};
            notifications.forEach(notif => {
              try {
                // Extract from route if it contains eventTitle parameter
                if (notif.route && typeof notif.route === 'string') {
                  const match = notif.route.match(/eventTitle=([^&]*)/);
                  if (match && match[1]) {
                    const eventTitle = decodeURIComponent(match[1]);
                    remindersMap[eventTitle] = true;
                  }
                }
              } catch (err) {
                console.warn('Error processing notification:', err);
              }
            });
            
            setReminders(remindersMap);
          }
        } catch (err) {
          console.warn('Failed to fetch reminders:', err);
        }

        // Fetch user's enrolled courses count and hours learned
        const userProfileRes = await fetch('/api/users/profile', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });
        if (userProfileRes.ok) {
          const userProfileData = await userProfileRes.json();
          const badges = [];

          if (userProfileData.enrolledCourses) {
            setTotalCourses(userProfileData.enrolledCourses.length);
            // Sum up hours from all enrolled courses
            const totalHours = userProfileData.enrolledCourses.reduce((sum, course) => sum + (course.hoursSpent || 0), 0);
            setHoursLearned(totalHours);

            // Check for Fast Learner badge (5 courses in 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const recentEnrollments = userProfileData.enrolledCourses.filter(course => {
              const enrollmentDate = new Date(course.enrollmentDate);
              return enrollmentDate >= thirtyDaysAgo;
            });

            if (recentEnrollments.length >= 5) {
              badges.push({
                type: 'fastLearner',
                title: 'Fast Learner',
                description: `Completed ${recentEnrollments.length} courses in 30 days`
              });
            }

            // Check for Perfect Attendance badge (100% completion)
            const completedCourses = userProfileData.enrolledCourses.filter(course => 
              course.completionPercentage === 100
            );
            
            if (userProfileData.enrolledCourses.length > 0 && 
                completedCourses.length === userProfileData.enrolledCourses.length) {
              badges.push({
                type: 'perfectAttendance',
                title: 'Perfect Attendance',
                description: `100% course completion rate`
              });
            }
          }

          if (userProfileData.achievements) {
            setAchievementsCount(userProfileData.achievements.length);
          }

          setEarnedBadges(badges);

          // Set enrolled courses for "Your Courses" section
          if (userProfileData.enrolledCourses && userProfileData.enrolledCourses.length > 0) {
            const coursesData = userProfileData.enrolledCourses.map(enrollment => ({
              _id: enrollment.course?._id || enrollment.course,
              name: enrollment.course?.title || 'Unknown Course',
              progress: enrollment.completionPercentage || 0,
              hoursSpent: enrollment.hoursSpent || 0
            }));
            setEnrolledCourses(coursesData);
          }
        }

        // Fetch user's achievements
        const achRes = await fetch('/api/achievements/my-achievements', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });
        if (achRes.ok) {
          const achData = await achRes.json();
          setAchievements(achData || []);
          setAchievementsCount(achData.length);
        }

        // Fetch recent achievements from all students
        const recentAchRes = await fetch('/api/achievements/recent', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });
        if (recentAchRes.ok) {
          const recentAchData = await recentAchRes.json();
          setRecentAchievements(recentAchData || []);
        }

        // Fetch leaderboard (top 3 students)
        const leaderboardRes = await fetch('/api/achievements/leaderboard', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });
        if (leaderboardRes.ok) {
          const leaderboardData = await leaderboardRes.json();
          // Take top 3 and map to display format
          const topThree = leaderboardData.slice(0, 3).map((entry, index) => ({
            name: entry._id?.fullName || entry._id?.email || `Student ${index + 1}`,
            score: entry.totalPoints || 0
          }));
          setLeaderboard(topThree);
        }
      } catch (err) {
        console.warn('Could not load dashboard data', err);
      }
    }
    loadProfile();
  }, []);

  // ✅ Handle setting reminder for upcoming class
  const handleSetReminder = async (classTitle, classDate) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to set reminders');
        return;
      }

      // Send reminder to backend
      const reminderRes = await fetch('/api/events/reminder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          eventTitle: classTitle,
          eventDate: classDate,
          reminderType: 'upcoming_class'
        })
      });

      if (reminderRes.ok) {
        const data = await reminderRes.json();
        // Update local state to show reminder is set
        setReminders(prev => ({
          ...prev,
          [classTitle]: true
        }));

        // Dispatch event so Schedule page refreshes reminders
        window.dispatchEvent(new Event('reminderSet'));

        // Show success message
        alert(`✅ Reminder set for ${classTitle} — You will be notified before the class.`);
      } else {
        const errData = await reminderRes.json();
        alert(errData.message || 'Failed to set reminder. Please try again.');
      }
    } catch (err) {
      console.warn('Error setting reminder:', err);
      alert('Error setting reminder: ' + err.message);
    }
  };

  return (
    <AppLayout showGreeting={true} greetingContent={greeting}>
      {/* ============ STAT CARDS ============ */}
      <div className="stats">
        <StatCard title="Total Courses" value={totalCourses} color2="#1D3E69" color1="#397ACF" IconComponent={LuBookOpen} />
        <StatCard title="Hours Learned" value={hoursLearned} color1="#35AAAD" color2="#2B73B0" IconComponent={LuClock4} />
        <StatCard title="Achievements" value={achievementsCount} color1="#46BA7D" color2="#3CB49F" IconComponent={LuAward} />
      </div>

      {/* ============ ANNOUNCEMENTS SCROLL ============ */}
      <div className="latest-announcement" style={{ background: "#d9e8feff", padding: "12px 0", margin: "20px 0", borderRadius: "10px", overflow: "hidden", whiteSpace: "nowrap" }}>
        <div style={{ display: "inline-block", paddingLeft: "100%", animation: "scroll-left 15s linear infinite", fontSize: "16px", fontWeight: "500", color: "#1A365D" }}>
          {announcements.map((a, index) => (
            <a key={index} href={a.link} target="_blank" rel="noopener noreferrer" style={{ marginRight: "30px", color: "#1A365D", textDecoration: "none", cursor: "pointer" }}>
              {a.text}
            </a>
          ))}
        </div>
      </div>

      {/* ============ MAIN GRID ============ */}
      <div className="main-grid">
        {/* ============ LEFT SECTION ============ */}
        <div className="left">
          {/* YOUR COURSES */}
          <div className="card" style={{ borderRadius: "15px", height: "295px" }}>
            <div className="card-header bg-white" style={{ borderColor: "white" }}>
              <h3 className="fw-normal">Your Courses</h3>
              {/* Show View More Courses button only when there are 2+ enrolled courses */}
              {enrolledCourses && enrolledCourses.length >= 2 && (
                <button
                  className="view-btn"
                  onClick={() => navigate('/courses')}
                >
                  View More Courses
                </button>
              )}
            </div>
            {enrolledCourses && enrolledCourses.length > 0 ? (
              <div
                ref={coursesContainerRef}
                className="courses-list"
                style={{
                  overflow: 'hidden'
                }}
              >
                {enrolledCourses.map((course) => (
                  <div key={course._id || course.name} className="progress-item">
                    <div className="label">
                      <span>{course.name}</span>
                      <span>{course.progress}%</span>
                    </div>
                    <div className="progress-bar-dash">
                      <div className="progress-fill" style={{ width: `${course.progress}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: "20px", textAlign: "center", color: "#758096" }}>
                <p>No courses enrolled yet. Start learning today!</p>
              </div>
            )}
          </div>

          {/* UPCOMING LIVE CLASSES */}
          <div className="card" style={{ borderRadius: "15px" }}>
            <h3 className="fw-normal upcoming-head">Upcoming Live Classes</h3>
            {upcoming.map((u) => (
              <div key={u.title} className="class-item fw-light">
                <div>
                  <h3 style={{ fontSize: "18px" }}>{u.title}</h3>
                  <p>{u.date}</p>
                </div>
                <button 
                  style={{ 
                    fontSize: "16px",
                    fontWeight: "600",
                    padding: "14px 28px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: reminders[u.title] ? "#4CAF50" : "#397ACF",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    boxShadow: "0 2px 8px rgba(57, 122, 207, 0.3)",
                    minWidth: "140px",
                    whiteSpace: "nowrap",
                    hover: {
                      boxShadow: "0 4px 12px rgba(57, 122, 207, 0.4)"
                    }
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.boxShadow = reminders[u.title] ? "0 4px 12px rgba(76, 175, 80, 0.4)" : "0 4px 12px rgba(57, 122, 207, 0.4)";
                    e.target.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.boxShadow = reminders[u.title] ? "0 2px 8px rgba(76, 175, 80, 0.3)" : "0 2px 8px rgba(57, 122, 207, 0.3)";
                    e.target.style.transform = "translateY(0)";
                  }}
                  onClick={() => handleSetReminder(u.title, u.date)}
                >
                  <FaBell size={16} />
                  {reminders[u.title] ? 'Reminded' : 'Remind'}
                </button>
              </div>
            ))}
            {activeVideo && (
              <div style={{ marginTop: "15px" }}>
                <iframe width="100%" height="300" src={activeVideo} style={{ borderRadius: "10px" }} allow="autoplay; encrypted-media"></iframe>
              </div>
            )}
          </div>
        </div>

        {/* ============ RIGHT SECTION ============ */}
        <div className="right">
          {/* ASK KAVYA */}
          <div className="card ask-kavya" style={{ borderRadius: "15px" }}>
            <div className="tutor">
              <div className="round">
                <img src={chatbot} alt="ChatBot" height={113} width={113} />
              </div>
              <div className="content">
                <h6 className="text-white">Ask Kavya</h6>
                <p className="fw-light">AI Tutor</p>
              </div>
            </div>
            <p className="chat-message">
              Need help with your studies? Chat with Kavya, your personal AI tutor available 24/7.
            </p>

            {/* ✅ Open ChatBox on button click */}
            <button onClick={() => setOpenChat(true)}>Start Chat</button>
          </div>

          {/* Show ChatBox when openChat is true */}
          {openChat && <ChatBox onClose={() => setOpenChat(false)} />}

          {/* LEADERBOARD */}
          <div className="card" style={{ borderRadius: "15px" }}>
            <div className="leaderboard-head">
              <h3 className="fw-normal">Leaderboard</h3>
              <img src={trophy} alt="Trophy" width={30} height={32} />
            </div>
            {leaderboard.map((l, i) => (
              <div key={l.name} className="leader-item">
                <span data-rank={i + 1}>{l.name}</span>
                <span>{l.score}</span>
              </div>
            ))}
          </div>

          {/* ACHIEVEMENTS */}
          <div className="card recent-achievements" style={{ borderRadius: "15px" }}>
            <h3>Recent Achievements</h3>
            <ul className="achievement-ul">
              {/* Display user's earned badges first */}
              {earnedBadges && earnedBadges.length > 0 && (
                earnedBadges.map((badge) => (
                  <li key={badge.type} className="achievement-li">
                    <FaArrowTrendUp style={{ marginRight: "8px", color: "#FFD700" }} />
                    <div>
                      <h4 className="achievement fw-normal">{badge.title} ⭐</h4>
                      <p className="achievement-p">{badge.description}</p>
                    </div>
                  </li>
                ))
              )}
              
              {/* Display recent achievements from other students */}
              {recentAchievements && recentAchievements.length > 0 ? (
                recentAchievements.slice(0, 2).map((ach) => (
                  <li key={ach._id} className="achievement-li">
                    <FaArrowTrendUp style={{ marginRight: "8px" }} />
                    <div>
                      <h4 className="achievement fw-normal">{ach.title}</h4>
                      <p className="achievement-p">
                        {ach.user?.fullName || 'Student'} - {ach.description || 'Achievement earned'}
                      </p>
                    </div>
                  </li>
                ))
              ) : (
                // Fallback if no recent achievements
                earnedBadges.length === 0 && (
                  <>
                    <li className="achievement-li">
                      <FaArrowTrendUp style={{ marginRight: "8px" }} />
                      <div>
                        <h4 className="achievement fw-normal">Keep Learning</h4>
                        <p className="achievement-p">Complete 5 courses in 30 days to earn Fast Learner badge</p>
                      </div>
                    </li>
                    <li className="achievement-li">
                      <LuClock4 style={{ marginRight: "8px" }} />
                      <div>
                        <h4 className="achievement fw-normal">Complete Courses</h4>
                        <p className="achievement-p">Complete all courses to earn Perfect Attendance badge</p>
                      </div>
                    </li>
                  </>
                )
              )}
            </ul>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default Dashboard;
