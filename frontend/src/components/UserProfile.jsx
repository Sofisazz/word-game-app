// components/UserProfile.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { userAPI } from '../services/api';
import EditProfileModal from './EditProfileModal';
import './UserProfile.css'

const UserProfile = ({ user, onUserUpdate }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);

  // Дефолтная аватарка
  const defaultAvatar = 'https://media.istockphoto.com/id/1495088043/ru/%D0%B2%D0%B5%D0%BA%D1%82%D0%BE%D1%80%D0%BD%D0%B0%D1%8F/%D0%B7%D0%BD%D0%B0%D1%87%D0%BE%D0%BA-%D0%BF%D1%80%D0%BE%D1%84%D0%B8%D0%BB%D1%8F-%D0%BF%D0%BE%D0%BB%D1%8C%D0%B7%D0%BE%D0%B2%D0%B0%D1%82%D0%B5%D0%BB%D1%8F-%D0%B7%D0%BD%D0%B0%D1%87%D0%BE%D0%BA-%D0%B0%D0%B2%D0%B0%D1%82%D0%B0%D1%80%D0%B0-%D0%B8%D0%BB%D0%B8-%D1%87%D0%B5%D0%BB%D0%BE%D0%B2%D0%B5%D0%BA%D0%B0-%D0%B0%D0%B2%D0%B0%D1%82%D0%B0%D1%80%D0%BA%D0%B0-%D0%BF%D0%BE%D1%80%D1%82%D1%80%D0%B5%D1%82%D0%BD%D1%8B%D0%B9-%D1%81%D0%B8%D0%BC%D0%B2%D0%BE%D0%BB.jpg?s=612x612&w=0&k=20&c=DS9psRxdq8gUIBtTsGzzy1UYI37nag-gCQ33xqtkpPk=';

  useEffect(() => {
    console.log('Current user avatar:', currentUser.avatar);
    console.log('Full current user:', currentUser);
    fetchUserStats();
  }, [currentUser]);



  const fetchUserStats = async () => {
    try {
      const response = await userAPI.getStats(currentUser.id);
     console.log('Full stats response:', response.data); // ДОБАВЬТЕ ЭТО
        console.log('User stats:', response.data.data.stats); // ДОБАВЬТЕ ЭТО
        console.log('Total words learned:', response.data.data.stats.total_words_learned); // ДОБАВЬТЕ ЭТО
        console.log('Words learned (calculated):', response.data.data.stats.words_learned); // ДОБАВЬТЕ ЭТО
      if (response.data.success) {
        setStats(response.data.data);
      } else {
        setError(response.data.error || 'Ошибка загрузки статистики');
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError(err.response?.data?.error || 'Ошибка загрузки статистики');
    } finally {
      setLoading(false);
    }
  };

  const handleUserUpdate = (updatedUser) => {
    setCurrentUser(updatedUser);
    if (onUserUpdate) {
      onUserUpdate(updatedUser);
    }
  };

  // Функция для отображения иконки/картинки достижения
  const renderAchievementIcon = (achievement) => {
    // Если есть картинка в image_url, используем ее
    if (achievement.image_url) {
      return (
        <div className="achievement-icon-image">
          <img 
            src={achievement.image_url} 
            alt={achievement.name}
            className="achievement-img-small"
            onError={(e) => {
              // Если картинка не загружается, показываем иконку
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

    // Если нет картинки, используем emoji иконку
    return (
      <div className="achievement-emoji-small">
        {achievement.icon || '🏆'}
      </div>
    );
  };

  if (loading) return <div className="loading">Загрузка профиля...</div>;
  if (error) return <div className="error">Ошибка: {error}</div>;
  if (!stats) return <div className="error">Статистика не найдена</div>;

  const { stats: userStats, achievements, level_info } = stats;
  const progress = level_info.next_level_xp > 0 ? (level_info.current_xp / level_info.next_level_xp) * 100 : 0;
  const displayName = currentUser.display_name || currentUser.username;

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
              onLoad={() => console.log('Uploaded avatar loaded successfully')}
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
            <span className="level-number">Ур. {level_info.level}</span>
          </div>
          <div className="xp-progress">
            <div className="xp-info">
              <span>{level_info.total_xp} XP</span>
              <span>{level_info.total_xp + level_info.next_level_xp - level_info.current_xp} XP</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              ></div>
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
            <span className="stat-value">{userStats.total_xp || 0}</span>
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