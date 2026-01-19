import {
  Trophy,
  Crown,
  TrendingUp,
  TrendingDown,
  Award,
  Star,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/leaderboard.css";
import AppLayout from "../components/AppLayout";

// we'll populate leaderboard from API

const achievements = [
  { icon: Crown, label: "Top Performer", color: "#fbbf24" },
  { icon: TrendingUp, label: "Fast Learner", color: "#60a5fa" },
  { icon: Award, label: "Consistent", color: "#4ade80" },
  { icon: Star, label: "High Scorer", color: "#60a5fa" },
];

// ==========================================

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

  const tabs = ["Overall", "This Month", "This Week", "My Courses"];

  const navigate = useNavigate();

  const [leaderboard, setLeaderboard] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLeaderboard() {
      setLoading(true);
      try {
        const res = await fetch('/api/achievements/leaderboard', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: localStorage.getItem('token')
              ? `Bearer ${localStorage.getItem('token')}`
              : undefined,
          },
        });

        if (!res.ok) {
          console.warn('Failed to fetch leaderboard');
          setLoading(false);
          return;
        }

        const data = await res.json();
        // API returns { leaderboard, myRank }
        setLeaderboard(Array.isArray(data.leaderboard) ? data.leaderboard : []);
        setMyRank(data.myRank || null);
      } catch (err) {
        console.error('Error loading leaderboard', err);
      }
      setLoading(false);
    }
    loadLeaderboard();
  }, []);

  const renderLeaderboardContent = () => {
    const streakAchievement = achievements.find(
      (a) => a.label === "Consistent"
    ) || {
      icon: Award,
      color: "#fbbf24",
    };

    const StreakIcon = streakAchievement.icon;
    const streakColor = streakAchievement.color;

    if (activeTab === "Overall") {
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
                {leaderboard.slice(0, 3).map((item, idx) => {
                  const performer = {
                    rank: idx + 1,
                    name: item._id?.name || 'Unknown',
                    points: item.totalPoints || 0,
                    initials: (item._id?.name || 'U')
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase(),
                    color: ['#1e3a5f', '#3b6ea5', '#4ca89a'][idx] || '#3b6ea5'
                  };

                  return (
                    <div
                      key={performer.rank}
                      className={`podium-item podium-rank-${performer.rank}`}
                      onClick={() => navigate('/profile', { state: { user: item._id } })}
                      style={{ cursor: 'pointer' }}
                    >
                      <div
                        className="podium-avatar"
                        style={{ backgroundColor: performer.color }}
                      >
                        {performer.rank === 1 && (
                          <Crown
                            className="crown-icon"
                            size={24}
                            style={{ marginBottom: "8px" }}
                          />
                        )}
                        <span
                          className={`rank-number ${
                            performer.rank === 1 ? "rank-number-1st" : ""
                          }`}
                        >
                          {performer.rank === 1
                            ? "1st"
                            : performer.rank === 2
                            ? "2nd"
                            : "3rd"}
                        </span>
                      </div>

                      <div className="podium-name">{performer.name}</div>
                      <div className="podium-points">{performer.points} pts</div>

                      <div
                        className="podium-bar"
                        style={{ backgroundColor: performer.color }}
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
                {leaderboard.map((item, index) => {
                  const name = item._id?.name || 'Unknown';
                  const initials = name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();

                  const userRow = {
                    rank: index + 1,
                    name,
                    initials,
                    points: item.totalPoints || 0,
                    courses: 0,
                    avg: 0,
                    streak: 0,
                    trend: 'up'
                  };

                  return (
                    <div
                      key={index}
                      className={`ranking-item ${
                        selectedRank === userRow.rank ? "ranking-selected" : ""
                      }`}
                      style={
                        selectedRank === userRow.rank
                          ? { border: "1px solid black" }
                          : {}
                      }
                      onClick={() => {
                        setSelectedRank(userRow.rank);
                        navigate('/profile', { state: { user: item._id } });
                      }}
                    >
                      <div className="ranking-rank">{userRow.rank}</div>

                      <div
                        className="ranking-avatar"
                        style={{
                          backgroundColor:
                            userRow.rank === 1
                              ? "#1e3a5f"
                              : userRow.rank === 2
                              ? "#3b6ea5"
                              : userRow.rank === 3
                              ? "#4ca89a"
                              : "#3b6ea5",
                        }}
                      >
                        {userRow.initials}
                      </div>

                      <div className="ranking-info">
                        <div className="ranking-name">{userRow.name}</div>

                        <div className="ranking-stats">
                          {userRow.courses} courses · {userRow.avg}% avg ·{' '}
                          <StreakIcon size={14} style={{ color: streakColor }} />{' '}
                          {userRow.streak} day streak
                        </div>
                      </div>

                      <div className="ranking-points">{userRow.points}</div>

                      {userRow.trend === "up" ? (
                        <TrendingUp
                          className="ranking-trend trend-up"
                          size={20}
                        />
                      ) : (
                        <TrendingDown
                          className="ranking-trend trend-down"
                          size={20}
                        />
                      )}
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
                <div className="ranking-circle">{myRank ? myRank.rank : '-'}</div>
              </div>

              <div className="your-ranking-points">{myRank ? myRank.totalPoints : '-'}</div>
              <div className="your-ranking-label">Total Points</div>

              <div className="your-ranking-stats">
                <div className="stat-row">
                  <span>Courses Completed</span>
                  <span className="stat-value">{myRank?.coursesCompleted ?? '-'}</span>
                </div>
                <div className="stat-row">
                  <span>Average Score</span>
                  <span className="stat-value">{myRank?.avgScore ? myRank.avgScore + '%' : '-'}</span>
                </div>
                <div className="stat-row">
                  <span>Current Streak</span>
                  <span className="stat-value">{myRank?.streak ? myRank.streak + ' days' : '-'}</span>
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
              <h3 className="section-title">Your Achievements</h3>

              <div className="achievements-list">
                {achievements.map((achievement, index) => (
                  <div key={index} className="achievement-item">
                    <achievement.icon
                      className="achievement-icon"
                      size={20}
                      style={{ color: achievement.color }}
                    />
                    <span>{achievement.label}</span>
                  </div>
                ))}
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
                  <div>Complete 5 Courses</div>
                  <div className="challenge-progress-value">3/5</div>
                </div>

                <div className="challenge-progress-bar">
                  <div
                    className="challenge-progress-fill"
                    style={{ width: "60%", backgroundColor: "#4ade80" }}
                  ></div>
                </div>
              </div>

              <div className="challenge-item">
                <div className="challenge-label-row">
                  <div>Study 10 Hours</div>
                  <div className="challenge-progress-value">7/10</div>
                </div>

                <div className="challenge-progress-bar">
                  <div
                    className="challenge-progress-fill"
                    style={{ width: "70%", backgroundColor: "#3b82f6" }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Motivation */}
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
                You're just 50 points away from overtaking the 2nd position.
                Keep up the great work!
              </p>
            </div>
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

        {/* TABS */}
        <div className="filter-tabs">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`tab ${activeTab === tab ? "tab-active" : ""}`}
              onClick={() => {
                // For month/week tabs, navigate straight to Profile page
                if (tab === "This Month" || tab === "This Week") {
                  navigate("/profile");
                  setActiveTab(tab);
                  return;
                }

                // For 'My Courses' tab, navigate to courses page
                if (tab === "My Courses") {
                  navigate("/courses");
                  setActiveTab(tab);
                  return;
                }

                setActiveTab(tab);
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        {renderLeaderboardContent()}
      </div>
    </AppLayout>
  );
}
