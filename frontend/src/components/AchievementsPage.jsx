// components/AchievementsPage.jsx
import React, { useState, useEffect } from 'react';
import { userAPI } from '../services/api';
import './AchievementsPage.css';

const AchievementsPage = () => {
  const [achievements, setAchievements] = useState([]);
  const [userAchievements, setUserAchievements] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAchievementsData();
  }, []);

  const fetchAchievementsData = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      
      if (!user) {
        setError('Пользователь не авторизован');
        setLoading(false);
        return;
      }

      // Получаем достижения и статистику
      const [achievementsResponse, statsResponse] = await Promise.all([
        userAPI.getAllAchievements(user.id),
        userAPI.getStats(user.id)
      ]);

      if (achievementsResponse.data.success) {
        setAchievements(achievementsResponse.data.data || []);
        setUserAchievements(achievementsResponse.data.user_achievements || []);
        
            console.log('All achievements:', achievementsResponse.data.data);
        // Отладочная информация в консоль
        console.log('Achievements loaded:', achievementsResponse.data.data);
        if (achievementsResponse.data.data && achievementsResponse.data.data.length > 0) {
          console.log('First achievement image_url:', achievementsResponse.data.data[0].image_url);
        
           const wordsAchievement = achievementsResponse.data.data.find(a => 
                a.name.includes('50') || a.condition_type === 'words_learned'
            );
            if (wordsAchievement) {
                console.log('Words achievement:', wordsAchievement);
            }
          }
      } else {
        setError('Ошибка загрузки достижений');
      }

      if (statsResponse.data.success) {
        setUserStats(statsResponse.data.data);
         console.log('User stats:', statsResponse.data.data);
            console.log('Total words learned (stats):', statsResponse.data.data.stats.total_words_learned);
            console.log('Words learned (calculated):', statsResponse.data.data.stats.words_learned);
        if (statsResponse.data.data.stats.total_words_learned >= 55) {
                console.log('✅ User has enough words for achievement!');
            } else {
                console.log(`❌ User needs ${55 - statsResponse.data.data.stats.total_words_learned} more words`);
            }
        }

    } catch (err) {
      console.error('Error:', err);
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const hasAchievement = (achievementId) => {
    return userAchievements.includes(achievementId);
  };

  const getAchievementProgress = (achievement) => {
    if (!userStats) return 0;

    const stats = userStats.stats || userStats || {};
    const conditionType = achievement.condition_type;
    const conditionValue = achievement.condition_value;

    let currentProgress = 0;

    switch (conditionType) {
      case 'games_played':
        currentProgress = stats.total_games_played || 0;
        break;
      case 'correct_answers':
        currentProgress = stats.total_correct_answers || 0;
        break;
      case 'words_learned':
        currentProgress = stats.total_words_learned || 0;
        break;
      case 'total_xp':
        currentProgress = stats.total_xp || 0;
        break;
      case 'perfect_games':
        currentProgress = stats.perfect_games || 0;
        break;
      case 'level':
        currentProgress = stats.level || 0;
        break;
      default:
        currentProgress = 0;
    }

    return Math.min(currentProgress, conditionValue);
  };

  const getDisplayIcon = (achievement, unlocked) => {
    // Всегда показываем картинку или иконку, даже для заблокированных достижений
    // Для заблокированных просто добавляем класс locked и значок замка поверх

    // Если есть картинка в image_url, используем ее
    if (achievement.image_url) {
      return (
        <div className={`achievement-image ${unlocked ? '' : 'locked'}`}>
          <img 
            src={achievement.image_url}
            alt={achievement.name}
            className="achievement-img"
            onError={(e) => {
              // Если картинка не загружается, показываем иконку
              console.error('Failed to load image:', achievement.image_url);
              e.target.style.display = 'none';
              const fallback = e.target.parentNode.querySelector('.achievement-fallback-icon');
              if (fallback) fallback.style.display = 'block';
            }}
          />
          <span className="achievement-fallback-icon" style={{display: 'none'}}>
            {achievement.icon || '🏆'}
          </span>
          {!unlocked && (
            <div className="lock-overlay">
              <span className="lock-icon">🔒</span>
            </div>
          )}
        </div>
      );
    }

    // Если нет картинки, используем emoji иконку
    return (
      <div className={`achievement-emoji ${unlocked ? '' : 'locked'}`}>
        {achievement.icon || '🏆'}
        {!unlocked && (
          <div className="lock-overlay">
            <span className="lock-icon">🔒</span>
          </div>
        )}
      </div>
    );
  };

  const getDisplayBadge = (achievement) => {
    return achievement.badge || null;
  };

  const getDisplayXp = (achievement) => {
    return achievement.xp_reward || 0;
  };

  if (loading) return <div className="loading">Загрузка достижений...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="achievements-page">
      <div className="achievements-header">
        <h1>🎖️ Достижения</h1>
        <p>Зарабатывайте достижения, играя и улучшая свои навыки!</p>
       
        <div className="achievements-stats">
          <div className="achievement-stat">
            <span className="stat-number">{userAchievements.length}</span>
            <span className="stat-label">получено</span>
          </div>
          <div className="achievement-stat">
            <span className="stat-number">{achievements.length}</span>
            <span className="stat-label">всего</span>
          </div>
          <div className="achievement-stat">
            <span className="stat-number">
              {achievements.length > 0 ? Math.round((userAchievements.length / achievements.length) * 100) : 0}%
            </span>
            <span className="stat-label">прогресс</span>
          </div>
        </div>
      </div>

      <div className="achievements-categories">
        <h2>Все достижения ({achievements.length})</h2>
        <div className="achievements-grid">
          {achievements.map((achievement) => {
            const unlocked = hasAchievement(achievement.id);
            const progress = getAchievementProgress(achievement);
            const conditionValue = achievement.condition_value;
            const progressPercent = conditionValue > 0 ? (progress / conditionValue) * 100 : 0;
            
            const displayIcon = getDisplayIcon(achievement, unlocked);
            const displayBadge = getDisplayBadge(achievement);
            const displayXp = getDisplayXp(achievement);

            return (
              <div 
                key={achievement.id} 
                className={`achievement-card ${unlocked ? 'unlocked' : 'locked'}`}
              >
                <div className="achievement-icon-container">
                  {displayIcon}
                </div>
                
                <div className="achievement-info">
                  <h3>{achievement.name}</h3>
                  <p>{achievement.description}</p>
                  
                  <div className="achievement-reward">
                    {displayXp > 0 && (
                      <span className="xp-badge">+{displayXp} XP</span>
                    )}
                    {displayBadge && (
                      <span className="badge">{displayBadge}</span>
                    )}
                  </div>

                  {!unlocked && conditionValue > 0 && (
                    <div className="achievement-progress">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>
                      <span className="progress-text">
                        {progress} / {conditionValue}
                      </span>
                    </div>
                  )}
                  
                  {unlocked && (
                    <div className="achievement-unlocked">
                      <span className="unlocked-text">🎉 Получено!</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {achievements.length === 0 && (
          <div className="no-achievements">
            <p>Достижения пока не загружены. Попробуйте обновить страницу.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AchievementsPage;