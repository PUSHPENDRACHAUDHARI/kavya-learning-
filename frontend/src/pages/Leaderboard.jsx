import {
  Trophy,
  Crown,
  TrendingUp,
  TrendingDown,
  Award,
  Star,
  Zap,
  Flame,
  Target,
  Clock,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/leaderboard.css";
import AppLayout from "../components/AppLayout";

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState("Overall");
  const [selectedRank, setSelectedRank] = useState(null);
  const [, setLeaderboardHover] = useState(false);
  const [topPerformersHover, setTopPerformersHover] = useState(false);
  const [fullRankingsHover, setFullRankingsHover] = useState(false);
  const [yourRankingHover, setYourRankingHover] = useState(false);
  const [achievementsHover, setAchievementsHover] = useState(false);
  const [challengeHover, setChallengeHover] = useState(false);
  const [motivationHover, setMotivationHover] = useState(false);

  const [leaderboard, setLeaderboard] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [myAchievements, setMyAchievements] = useState([]);
  const [weeklyChallenges, setWeeklyChallenges] = useState({
    coursesCompleted: 0,
    coursesTarget: 5,
    hoursStudied: 0,
    hoursTarget: 10,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const interactiveStyle = {
    transition: "all 0.3s ease-in-out",
    cursor: "pointer",
    boxShadow:
      "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.06)",
  };

  const hoverEffect = {
    transform: "translateY(-2px)",
    boxShadow:
      "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.05)",
  };

  const tabs = ["Overall"];

  // Dynamic achievement badges based on user performance
  const getAchievementBadges = (userData) => {
    const badges = [];

    if (userData?.totalPoints > 500) {
      badges.push({
        icon: Crown,
        label: "Top Performer",
        color: "#fbbf24",
      });
    }

    if (userData?.coursesCompleted >= 3) {
      badges.push({
        icon: TrendingUp,
        label: "Fast Learner",
        color: "#60a5fa",
      });
    }

    if (userData?.streakDays >= 7) {
      badges.push({
        icon: Flame,
        label: "Consistent",
        color: "#ef4444",
      });
    }

    if (userData?.averageScore >= 85) {
      badges.push({
        icon: Star,
        label: "High Scorer",
        color: "#fbbf24",
      });
    }

    return badges;
  };

  // Fetch leaderboard data
  useEffect(() => {
    const loadLeaderboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch full leaderboard
        const leaderboardRes = await fetch("/api/achievements/leaderboard", {
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        });

        if (!leaderboardRes.ok) {
          throw new Error("Failed to fetch leaderboard");
        }

        const leaderboardData = await leaderboardRes.json();
        setLeaderboard(
          leaderboardData.leaderboard ? leaderboardData.leaderboard : []
        );

        // Fetch my ranking
        const myRankRes = await fetch("/api/achievements/my-ranking", {
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        });

        if (myRankRes.ok) {
          const myRankData = await myRankRes.json();
          setMyRank(myRankData);
        }

        // Fetch my achievements
        const achievementsRes = await fetch("/api/achievements/my-achievements", {
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        });

        if (achievementsRes.ok) {
          const achievementsData = await achievementsRes.json();
          setMyAchievements(Array.isArray(achievementsData) ? achievementsData : []);
        }

        // Load weekly challenges and progress
        await loadWeeklyChallenges();
      } catch (err) {
        console.error("Error loading leaderboard:", err);
        setError(err.message);
      }
      setLoading(false);
    };

    const loadWeeklyChallenges = async () => {
      try {
        // Fetch student dashboard for hours studied
        const dashboardRes = await fetch("/api/student/dashboard", {
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        });

        if (dashboardRes.ok) {
          const dashboardData = await dashboardRes.json();
          const overview = dashboardData.data?.overview || dashboardData.overview;

          setWeeklyChallenges((prev) => ({
            ...prev,
            coursesCompleted: overview?.completedCourses || 0,
            hoursStudied: overview?.totalStudyHours || 0,
          }));
        }
      } catch (err) {
        console.error("Error loading weekly challenges:", err);
      }
    };

    if (token) {
      loadLeaderboardData();
      
      // Set up auto-refresh every 30 seconds
      const refreshInterval = setInterval(loadLeaderboardData, 30000);
      return () => clearInterval(refreshInterval);
    }
  }, [token]);

  const getRankColor = (rank) => {
    switch (rank) {
      case 1:
        return "#1e3a5f";
      case 2:
        return "#3b6ea5";
      case 3:
        return "#4ca89a";
      default:
        return "#3b6ea5";
    }
  };

  const getRankLabel = (rank) => {
    if (rank === 1) return "1st";
    if (rank === 2) return "2nd";
    if (rank === 3) return "3rd";
    return `${rank}th`;
  };

  const renderLeaderboardContent = () => {
    if (loading) {
      return (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <p>Loading leaderboard data...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div style={{ textAlign: "center", padding: "40px", color: "red" }}>
          <p>Error: {error}</p>
        </div>
      );
    }

    if (activeTab === "Overall") {
      const userAchievementBadges = myRank ? getAchievementBadges(myRank) : [];

      return (
        <div className="content-grid">
          <div className="left-column">
            {/* --- Top Performers --- */}
            <div
              className="top-performers-card"
              style={{
                ...interactiveStyle,
                ...(topPerformersHover ? hoverEffect : {}),
              }}
              onMouseEnter={() => setTopPerformersHover(true)}
              onMouseLeave={() => setTopPerformersHover(false)}
            >
              <h2 className="section-title">Top Performers</h2>

              <div className="podium">
                {leaderboard.slice(0, 3).map((item) => {
                  const color = getRankColor(item.rank);
                  const label = getRankLabel(item.rank);

                  return (
                    <div
                      key={item.rank}
                      className={`podium-item podium-rank-${item.rank}`}
                      onClick={() => navigate("/profile", { state: { user: item.userId } })}
                      style={{ cursor: "pointer" }}
                    >
                      <div
                        className="podium-avatar"
                        style={{ backgroundColor: color }}
                      >
                        {item.rank === 1 && (
                          <Crown
                            className="crown-icon"
                            size={24}
                            style={{ marginBottom: "8px", color: "#FFD700" }}
                          />
                        )}
                        <span
                          className={`rank-number ${
                            item.rank === 1 ? "rank-number-1st" : ""
                          }`}
                        >
                          {label}
                        </span>
                      </div>

                      <div className="podium-name">{item.name}</div>
                      <div className="podium-points">{item.totalPoints} pts</div>

                      <div
                        className="podium-bar"
                        style={{ backgroundColor: color }}
                      ></div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* --- Full Rankings --- */}
            <div
              className="full-rankings-card"
              style={{
                ...interactiveStyle,
                ...(fullRankingsHover ? hoverEffect : {}),
              }}
              onMouseEnter={() => setFullRankingsHover(true)}
              onMouseLeave={() => setFullRankingsHover(false)}
            >
              <h2 className="section-title">Full Rankings</h2>

              <div className="rankings-list">
                {leaderboard.map((item) => {
                  const initials = item.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <div
                      key={item.userId}
                      className={`ranking-item ${
                        selectedRank === item.rank ? "ranking-selected" : ""
                      }`}
                      style={
                        selectedRank === item.rank
                          ? { border: "1px solid black" }
                          : {}
                      }
                      onClick={() => {
                        setSelectedRank(item.rank);
                        navigate("/profile", { state: { user: item.userId } });
                      }}
                    >
                      <div className="ranking-rank">{item.rank}</div>

                      <div
                        className="ranking-avatar"
                        style={{
                          backgroundColor: getRankColor(item.rank),
                        }}
                      >
                        {initials}
                      </div>

                      <div className="ranking-info">
                        <div className="ranking-name">{item.name}</div>

                        <div className="ranking-stats">
                          {item.coursesCompleted || 0} courses ·{" "}
                          {item.averageScore || 0}% avg ·
                          <Flame
                            size={14}
                            style={{ color: "#ef4444", marginLeft: "4px" }}
                          />{" "}
                          {item.streakDays || 0} day streak
                        </div>
                      </div>

                      <div className="ranking-points">{item.totalPoints} pts</div>

                      <TrendingUp
                        className="ranking-trend trend-up"
                        size={20}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* --- Right Column --- */}
          <div className="right-column">
            {/* Your Ranking */}
            <div
              className="your-ranking-card"
              style={{
                ...interactiveStyle,
                ...(yourRankingHover ? hoverEffect : {}),
              }}
              onMouseEnter={() => setYourRankingHover(true)}
              onMouseLeave={() => setYourRankingHover(false)}
            >
              <div className="your-ranking-header">
                <span>Your Ranking</span>
                <Trophy size={24} />
              </div>

              <div className="your-ranking-badge">
                <div className="ranking-circle">
                  {myRank?.rank || "-"}
                </div>
              </div>

              <div className="your-ranking-points">
                {myRank?.totalPoints || 0}
              </div>
              <div className="your-ranking-label">Total Points</div>

              <div className="your-ranking-stats">
                <div className="stat-row">
                  <span>Courses Completed</span>
                  <span className="stat-value">
                    {myRank?.coursesCompleted || 0}
                  </span>
                </div>
                <div className="stat-row">
                  <span>Average Score</span>
                  <span className="stat-value">
                    {myRank?.avgScore || 0}%
                  </span>
                </div>
                <div className="stat-row">
                  <span>Current Streak</span>
                  <span className="stat-value">
                    {myRank?.streakDays || 0} days
                  </span>
                </div>
              </div>
            </div>

            {/* Achievements */}
            <div
              className="achievements-card"
              style={{
                ...interactiveStyle,
                ...(achievementsHover ? hoverEffect : {}),
              }}
              onMouseEnter={() => setAchievementsHover(true)}
              onMouseLeave={() => setAchievementsHover(false)}
            >
              <h3 className="section-title mb-5">Your Achievements</h3>

              <div className="achievements-list">
                {userAchievementBadges.length > 0 ? (
                  userAchievementBadges.map((achievement, index) => (
                    <div key={index} className="achievement-item">
                      <achievement.icon
                        className="achievement-icon"
                        size={20}
                        style={{ color: achievement.color }}
                      />
                      <span>{achievement.label}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ color: "#999", fontSize: "14px" }}>
                    Complete courses and earn points to unlock achievements!
                  </div>
                )}

                {myAchievements.length > 0 && (
                  <div style={{ marginTop: "15px", paddingTop: "15px", borderTop: "1px solid #eee" }}>
                    <div style={{ fontSize: "12px", color: "#666", marginBottom: "10px" }}>
                      Recent Achievements ({myAchievements.length})
                    </div>
                    {myAchievements.slice(0, 3).map((achievement) => (
                      <div key={achievement._id} style={{ fontSize: "13px", marginBottom: "8px" }}>
                        <Award size={14} style={{ color: "#4ade80" }} /> {achievement.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Weekly Challenge */}
            <div
              className="challenge-card"
              style={{
                ...interactiveStyle,
                ...(challengeHover ? hoverEffect : {}),
              }}
              onMouseEnter={() => setChallengeHover(true)}
              onMouseLeave={() => setChallengeHover(false)}
            >
              <h3 className="section-title">Weekly Challenge</h3>

              <div className="challenge-item">
                <div className="challenge-label-row">
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <Target size={16} /> Complete {weeklyChallenges.coursesTarget} Courses
                  </div>
                  <div className="challenge-progress-value">
                    {weeklyChallenges.coursesCompleted}/{weeklyChallenges.coursesTarget}
                  </div>
                </div>

                <div className="challenge-progress-bar">
                  <div
                    className="challenge-progress-fill"
                    style={{
                      width: `${Math.min(
                        (weeklyChallenges.coursesCompleted /
                          weeklyChallenges.coursesTarget) *
                          100,
                        100
                      )}%`,
                      backgroundColor: "#4ade80",
                    }}
                  ></div>
                </div>
              </div>

              <div className="challenge-item">
                <div className="challenge-label-row">
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <Clock size={16} /> Study {weeklyChallenges.hoursTarget} Hours
                  </div>
                  <div className="challenge-progress-value">
                    {weeklyChallenges.hoursStudied}/{weeklyChallenges.hoursTarget}
                  </div>
                </div>

                <div className="challenge-progress-bar">
                  <div
                    className="challenge-progress-fill"
                    style={{
                      width: `${Math.min(
                        (weeklyChallenges.hoursStudied /
                          weeklyChallenges.hoursTarget) *
                          100,
                        100
                      )}%`,
                      backgroundColor: "#3b82f6",
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Motivation Card */}
            {myRank?.rank && myRank.rank > 1 && (
              <div
                className="motivation-card"
                style={{
                  ...interactiveStyle,
                  ...(motivationHover ? hoverEffect : {}),
                }}
                onMouseEnter={() => setMotivationHover(true)}
                onMouseLeave={() => setMotivationHover(false)}
              >
                <Star className="motivation-icon" size={24} />
                <h4 className="motivation-title">Keep Going!</h4>
                <p className="motivation-text">
                  You're at rank #{myRank.rank}. Keep earning points and
                  completing courses to move up the leaderboard!
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <AppLayout showGreeting={false}>
      <div
        className="leaderboard-container"
        onMouseEnter={() => setLeaderboardHover(true)}
        onMouseLeave={() => setLeaderboardHover(false)}
      >
        <div className="leaderboard-header">
          <Trophy className="header-icon" size={40} />

          <div>
            <h1 className="header-title">Leaderboard</h1>
            <p className="header-subtitle">
              Compete with peers and track your progress
            </p>
          </div>
        </div>

        {/* CONTENT */}
        {renderLeaderboardContent()}
      </div>
    </AppLayout>
  );
}

