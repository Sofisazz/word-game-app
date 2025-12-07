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
  
  // Дефолтная аватарка
  const defaultAvatar = 'https://img.freepik.com/premium-vector/silver-membership-icon-default-avatar-profile-icon-membership-icon-social-media-user-image-vector-illustration_561158-4195.jpg?semt=ais_se_enriched&w=740&q=80';

  useEffect(() => {
    console.log('🔄 UserProfile mounted with user:', currentUser);
    fetchUserStats();
    
    // Слушаем кастомное событие обновления пользователя
    const handleUserUpdated = () => {
      console.log('📢 User updated event received, refreshing stats...');
      
      // Обновляем пользователя из sessionStorage
      const userData = sessionStorage.getItem('user');
      if (userData) {
        const updatedUser = JSON.parse(userData);
        console.log('🔄 Updated user from sessionStorage:', updatedUser);
        setCurrentUser(updatedUser);
        if (onUserUpdate) {
          onUserUpdate(updatedUser);
        }
      }
      
      // Запрашиваем свежую статистику с сервера
      fetchUserStats();
    };
// В UserProfile.js, в useEffect для прослушивания событий:
const handleXPUpdated = (event) => {
  console.log('📈 XP updated event received:', event.detail);
  
  // Проверяем разные возможные форматы данных
  const eventData = event.detail || event;
  
  if (eventData && eventData.level_info) {
    // Если в событии есть level_info, обновляем сразу
    console.log('🎯 Updating level info from game result:', eventData.level_info);
    
    // Обновляем stats с новыми данными
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
      
      console.log('📊 Updated stats:', newStats);
      return newStats;
    });
  } else if (eventData && eventData.event_data) {
    // Если данные в event_data (как вы настроили на бэкенде)
    console.log('🎯 Updating from event_data:', eventData.event_data);
    
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
    // Иначе запрашиваем свежую статистику
    console.log('🔄 No level_info in event, fetching fresh stats');
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
      console.log('🔄 Fetching stats for user ID:', currentUser.id);
      
      setLoading(true);
      setError('');
      
      const response = await userAPI.getStats(currentUser.id);
      console.log('Full stats response:', response.data);
      
      if (response.data.success) {
        // Устанавливаем данные как есть с бэкенда
        setStats(response.data.data);
        console.log('✅ Stats loaded successfully:', response.data.data);
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
    // Обновляем статистику после редактирования профиля
    fetchUserStats();
  };

  // Функция для отображения иконки/картинки достижения
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
  
  // ВСЕ ДАННЫЕ БЕРЕМ С БЭКЕНДА - НЕ ПЕРЕСЧИТЫВАЕМ!
  const currentXP = level_info.total_xp || 0;
  const currentLevel = level_info.level || 1;
  const nextLevelXP = level_info.next_level_xp || 250;
  const currentLevelXP = level_info.current_xp || 0; // XP в текущем уровне (208 на изображении)
  const xpNeeded = level_info.xp_needed || 0; // XP до следующего уровня (192 на изображении)
  const progress = level_info.progress_percentage || 0; // Процент прогресса (83,2% на изображении)
    
  const displayName = currentUser.display_name || currentUser.username;

  console.log('🎮 Current level info from backend:', level_info);

  return (
    <div className="profile-container">
      {/* Кнопка редактирования */}
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
              {/* Здесь currentLevelXP = XP в текущем уровне (208) */}
              <span>{currentLevelXP.toFixed(0)} XP</span>
              {/* Здесь nextLevelXP = сколько всего нужно для след уровня (1250) */}
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
              {/* xpNeeded = сколько осталось (192) */}
              До следующего уровня: {xpNeeded.toFixed(0)} XP
              {xpNeeded <= 0 && (
                <span className="level-up-badge">🎉 Уровень повышен!</span>
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

      {/* Модальное окно редактирования */}
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