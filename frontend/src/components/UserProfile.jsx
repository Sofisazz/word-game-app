import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { userAPI } from '../services/api';
import EditProfileModal from './EditProfileModal';
import './UserProfile.css';

const UserProfile = ({ user, onUserUpdate }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);
  
  const defaultAvatar = 'https://media.istockphoto.com/id/1495088043/ru/%D0%B2%D0%B5%D0%BA%D1%82%D0%BE%D1%80%D0%BD%D0%B0%D1%8F/%D0%B7%D0%BD%D0%B0%D1%87%D0%BE%D0%BA-%D0%BF%D1%80%D0%BE%D1%84%D0%B8%D0%BB%D1%8F-%D0%BF%D0%BE%D0%BB%D1%8C%D0%B7%D0%BE%D0%B2%D0%B0%D1%82%D0%B5%D0%BB%D1%8F-%D0%B7%D0%BD%D0%B0%D1%87%D0%BE%D0%BA-%D0%B0%D0%B2%D0%B0%D1%82%D0%B0%D1%80%D0%B0-%D0%B8%D0%BB%D0%B8-%D1%87%D0%B5%D0%BB%D0%BE%D0%B2%D0%B5%D0%BA%D0%B0-%D0%B0%D0%B2%D0%B0%D1%82%D0%B0%D1%80%D0%BA%D0%B0-%D0%BF%D0%BE%D1%80%D1%82%D1%80%D0%B5%D1%82%D0%BD%D1%8B%D0%B9-%D1%81%D0%B8%D0%BC%D0%B2%D0%BE%D0%BB.jpg?s=612x612&w=0&k=20&c=DS9psRxdq8gUIBtTsGzzy1UYI37nag-gCQ33xqtkpPk=';

  useEffect(() => {
    fetchUserStats();
    
    const handleUserUpdated = () => {
      const userData = sessionStorage.getItem('user');
      if (userData) {
        const updatedUser = JSON.parse(userData);
        setCurrentUser(updatedUser);
        if (onUserUpdate) {
          onUserUpdate(updatedUser);
        }
      }
      
      fetchUserStats();
    };
const handleXPUpdated = (event) => {  
  const eventData = event.detail || event;
  
  if (eventData && eventData.level_info) {
    setStats(prevStats => {
      const newStats = {
        ...prevStats,
        level_info: eventData.level_info,
        stats: {
          ...prevStats?.stats,
          total_xp: eventData.level_info.total_xp,
          level: eventData.level_info.level,
          total_games_played: (prevStats?.stats?.total_games_played || 0) + 1,
          total_correct_answers: (prevStats?.stats?.total_correct_answers || 0) + (eventData.correct_answers || 0)
        }
      };
      return newStats;
    });
  } else if (eventData && eventData.event_data) {    
    if (eventData.event_data.level_info) {
      setStats(prevStats => ({
        ...prevStats,
        level_info: eventData.event_data.level_info,
        stats: {
          ...prevStats?.stats,
          total_xp: eventData.event_data.level_info.total_xp,
          level: eventData.event_data.level_info.level
        }
      }));
    }
  } else {
    fetchUserStats();
  }
};
    window.addEventListener('userUpdated', handleUserUpdated);
    window.addEventListener('xpUpdated', handleXPUpdated);
    
    return () => {
      window.removeEventListener('userUpdated', handleUserUpdated);
      window.removeEventListener('xpUpdated', handleXPUpdated);
    };
  }, []);

  const fetchUserStats = async () => {
    try {      
      setLoading(true);
      setError('');
      
      const response = await userAPI.getStats(currentUser.id);
      console.log('Full stats response:', response.data);
      
      if (response.data.success) {
        setStats(response.data.data);
      } else {
        setError(response.data.message || response.data.error || 'Ошибка загрузки статистики');
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      if (err.response) {
        setError(err.response.data?.message || err.response.data?.error || 'Ошибка сервера');
      } else if (err.request) {
        setError('Нет ответа от сервера');
      } else {
        setError('Ошибка при выполнении запроса');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUserUpdate = (updatedUser) => {
    setCurrentUser(updatedUser);
    if (onUserUpdate) {
      onUserUpdate(updatedUser);
    }
    fetchUserStats();
  };

  const renderAchievementIcon = (achievement) => {
    if (achievement.image_url) {
      return (
        <div className="achievement-icon-image">
          <img 
            src={achievement.image_url} 
            alt={achievement.name}
            className="achievement-img-small"
            onError={(e) => {
              console.error('Failed to load achievement image:', achievement.image_url);
              e.target.style.display = 'none';
              const fallback = e.target.nextSibling;
              if (fallback) fallback.style.display = 'block';
            }}
          />
          <span className="achievement-fallback-icon-small" style={{display: 'none'}}>
            {achievement.icon || '🏆'}
          </span>
        </div>
      );
    }

    return (
      <div className="achievement-emoji-small">
        {achievement.icon || '🏆'}
      </div>
    );
  };

  if (loading) return <div className="loading">Загрузка профиля...</div>;
  if (error) return <div className="error">Ошибка: {error}</div>;
  if (!stats) return <div className="error">Статистика не найдена</div>;

  const { stats: userStats = {}, achievements = [], level_info = {} } = stats;

  const currentXP = level_info.total_xp || 0;
  const currentLevel = level_info.level || 1;
  const nextLevelXP = level_info.next_level_xp || 250;
  const currentLevelXP = level_info.current_xp || 0; 
  const xpNeeded = level_info.xp_needed || 0; 
  const progress = level_info.progress_percentage || 0; 
    
  const displayName = currentUser.display_name || currentUser.username;

  return (
    <div className="profile-container">
      <div className="profile-actions">
        <button 
          onClick={() => setShowEditModal(true)}
          className="btn btn-primary"
        >
          Редактировать профиль
        </button>
        <Link to="/achievements" className="btn btn-secondary">
          Все достижения
        </Link>
      </div>

      <div className="profile-header">
        <div className="user-info">
          <div className="user-avatar">
            <img 
              src={currentUser.avatar ? `http://localhost${currentUser.avatar}` : defaultAvatar} 
              alt="Avatar" 
              className="avatar-image large"
              onError={(e) => {
                console.error('Failed to load uploaded avatar:', currentUser.avatar);
                e.target.src = defaultAvatar;
              }}
            />
          </div>
          <div className="user-details">
            <h1>{displayName}</h1>
            <p className="username">@{currentUser.username}</p>
            <p className="email">{currentUser.email}</p>
          </div>
        </div>
        
        <div className="level-card">
          <div className="level-badge">
            <span className="level-number">Ур. {currentLevel}</span>
            <div className="level-details">
              <small>Всего XP: {currentXP}</small>
            </div>
          </div>
          <div className="xp-progress">
            <div className="xp-info">
              <span>{currentLevelXP.toFixed(0)} XP</span>
              <span>{nextLevelXP} XP</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
                title={`${currentLevelXP.toFixed(0)} из ${nextLevelXP} XP в этом уровне`}
              ></div>
            </div>
            <div className="xp-remaining">
              До следующего уровня: {xpNeeded.toFixed(0)} XP
              {xpNeeded <= 0 && (
                <span className="level-up-badge">Уровень повышен!</span>
              )}
            </div>
            <div className="level-progress-info">
              <small>Уровень {currentLevel} • Прогресс: {progress.toFixed(1)}%</small>
            </div>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🎮</div>
          <div className="stat-info">
            <h3>Игр сыграно</h3>
            <span className="stat-value">{userStats.total_games_played || 0}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <h3>Правильных ответов</h3>
            <span className="stat-value">{userStats.total_correct_answers || 0}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-info">
            <h3>Слов изучено</h3>
            <span className="stat-value">{userStats.total_words_learned || userStats.words_learned || 0}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🏆</div>
          <div className="stat-info">
            <h3>Всего XP</h3>
            <span className="stat-value">{currentXP}</span>
            <div className="stat-subtext">
              Уровень {currentLevel}
            </div>
          </div>
        </div>
      </div>

      <div className="achievements-section">
        <h2>Достижения ({achievements.length})</h2>
        <div className="achievements-grid-profile">
          {achievements.map((achievement) => (
            <div key={achievement.id} className="achievement-card-profile">
              <div className="achievement-icon-profile">
                {renderAchievementIcon(achievement)}
              </div>
              <div className="achievement-info-profile">
                <h4>{achievement.name}</h4>
                <p>{achievement.description}</p>
                <div className="achievement-rewards">
                  {achievement.xp_reward > 0 && (
                    <span className="achievement-xp">+{achievement.xp_reward} XP</span>
                  )}
                  {achievement.badge && (
                    <span className="achievement-badge">{achievement.badge}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {achievements.length === 0 && (
            <div className="no-achievements">
              <p>Пока нет достижений. Играйте больше, чтобы их получить!</p>
            </div>
          )}
        </div>
      </div>

      {showEditModal && (
        <EditProfileModal
          user={currentUser}
          defaultAvatar={defaultAvatar}
          onClose={() => setShowEditModal(false)}
          onUpdate={handleUserUpdate}
        />
      )}
    </div>
  );
};

export default UserProfile;