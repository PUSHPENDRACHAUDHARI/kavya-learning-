import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import AppLayout from '../../components/AppLayout';
import './StudentAchievements.css';

const StudentAchievements = () => {
  const [achievements, setAchievements] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      const res = await axiosClient.get('/api/student/achievements');
      setAchievements(res.data.data);
    } catch (error) {
      console.error('Failed to load achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <AppLayout><div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div></AppLayout>;
  }

  return (
    <AppLayout showGreeting={false}>
      <div className="student-achievements">
        <h1>My Achievements 🏅</h1>

        {/* Summary Stats */}
        <div className="achievements-summary">
          <div className="summary-card">
            <h3>{achievements.total.all}</h3>
            <p>Total Achievements</p>
          </div>
          <div className="summary-card">
            <h3>{achievements.total.courseCompletions}</h3>
            <p>Courses Completed</p>
          </div>
          <div className="summary-card">
            <h3>{achievements.total.assessmentScores}</h3>
            <p>Assessments Passed</p>
          </div>
          <div className="summary-card">
            <h3>{achievements.total.special}</h3>
            <p>Special Badges</p>
          </div>
        </div>

        {/* Course Completions */}
        {achievements.courseCompletions && achievements.courseCompletions.length > 0 && (
          <div className="achievement-section">
            <h2>Course Completions 📚</h2>
            <div className="achievement-grid">
              {achievements.courseCompletions.map((achievement, idx) => (
                <div key={idx} className="achievement-item">
                  <div className="achievement-icon">📜</div>
                  <h4>{achievement.title}</h4>
                  <p className="course-name">
                    {achievement.course?.title || 'Course'}
                  </p>
                  <p className="date">
                    {new Date(achievement.dateEarned).toLocaleDateString()}
                  </p>
                  <div className="points">+{achievement.points} pts</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assessment Scores */}
        {achievements.assessmentScores && achievements.assessmentScores.length > 0 && (
          <div className="achievement-section">
            <h2>Assessment Results ⭐</h2>
            <div className="achievement-grid">
              {achievements.assessmentScores.map((achievement, idx) => (
                <div key={idx} className="achievement-item score">
                  <div className="achievement-icon">⭐</div>
                  <h4>{achievement.title}</h4>
                  <p className="course-name">
                    {achievement.course?.title || 'Assessment'}
                  </p>
                  <p className="date">
                    {new Date(achievement.dateEarned).toLocaleDateString()}
                  </p>
                  <div className="points">+{achievement.points} pts</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Participation */}
        {achievements.participation && achievements.participation.length > 0 && (
          <div className="achievement-section">
            <h2>Participation 🎯</h2>
            <div className="achievement-grid">
              {achievements.participation.map((achievement, idx) => (
                <div key={idx} className="achievement-item participation">
                  <div className="achievement-icon">🎯</div>
                  <h4>{achievement.title}</h4>
                  <p className="description">{achievement.description}</p>
                  <p className="date">
                    {new Date(achievement.dateEarned).toLocaleDateString()}
                  </p>
                  <div className="points">+{achievement.points} pts</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Special Badges */}
        {achievements.special && achievements.special.length > 0 && (
          <div className="achievement-section">
            <h2>Special Badges ✨</h2>
            <div className="achievement-grid">
              {achievements.special.map((achievement, idx) => (
                <div key={idx} className="achievement-item special">
                  <div className="achievement-icon">✨</div>
                  <h4>{achievement.title}</h4>
                  <p className="description">{achievement.description}</p>
                  <p className="date">
                    {new Date(achievement.dateEarned).toLocaleDateString()}
                  </p>
                  <div className="points">+{achievement.points} pts</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {achievements.total.all === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🎯</div>
            <h2>No Achievements Yet</h2>
            <p>Complete courses and assessments to earn achievements!</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default StudentAchievements;
