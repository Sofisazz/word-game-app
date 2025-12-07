import React from 'react';
import { Link } from 'react-router-dom';
import './Hero.css';

const Hero = ({ user }) => {
  const defaultAvatar = 'https://media.istockphoto.com/id/1495088043/ru/%D0%B2%D0%B5%D0%BA%D1%82%D0%BE%D1%80%D0%BD%D0%B0%D1%8F/%D0%B7%D0%BD%D0%B0%D1%87%D0%BE%D0%BA-%D0%BF%D1%80%D0%BE%D1%84%D0%B8%D0%BB%D1%8F-%D0%BF%D0%BE%D0%BB%D1%8C%D0%B7%D0%BE%D0%B2%D0%B0%D1%82%D0%B5%D0%BB%D1%8F-%D0%B7%D0%BD%D0%B0%D1%87%D0%BE%D0%BA-%D0%B0%D0%B2%D0%B0%D1%82%D0%B0%D1%80%D0%B0-%D0%B8%D0%BB%D0%B8-%D1%87%D0%B5%D0%BB%D0%BE%D0%B2%D0%B5%D0%BA%D0%B0-%D0%B0%D0%B2%D0%B0%D1%82%D0%B0%D1%80%D0%BA%D0%B0-%D0%BF%D0%BE%D1%80%D1%82%D1%80%D0%B5%D1%82%D0%BD%D1%8B%D0%B9-%D1%81%D0%B8%D0%BC%D0%B2%D0%BE%D0%BB.jpg?s=612x612&w=0&k=20&c=DS9psRxdq8gUIBtTsGzzy1UYI37nag-gCQ33xqtkpPk=';

  const getAvatarUrl = (avatarPath) => {
    if (!avatarPath) return defaultAvatar;
    
    if (avatarPath.startsWith('http')) {
      return avatarPath;
    }
    
    if (avatarPath.startsWith('/')) {
      return `http://localhost${avatarPath}`;
    }
    
    return defaultAvatar;
  };

  return (
    <div className="hero">
      <div className="hero-background">
        <div className="floating-shape shape-1"></div>
        <div className="floating-shape shape-2"></div>
        <div className="floating-shape shape-3"></div>
        <div className="floating-shape shape-4"></div>
      </div>

      <div className="hero-content">
        <div className="hero-text">
          {user ? (
            <div className="user-welcome">
              <div className="user-avatar-large">
                <img 
                  src={getAvatarUrl(user.avatar)} 
                  alt="Avatar" 
                  className="avatar-image hero-avatar"
                  onError={(e) => {
                    console.error('Failed to load avatar:', user.avatar);
                    e.target.src = defaultAvatar;
                  }}
                  onLoad={() => console.log('Avatar loaded successfully')}
                />
              </div>
              <h1 className="hero-title">
                Добро пожаловать, 
                <span className="gradient-text"> {user.display_name || user.username}!</span>
              </h1>
              <p className="hero-subtitle">
                Рады видеть вас! Готовы изучать новые слова?
              </p>
              
              <div className="hero-buttons-user">
                <Link to="/sets" className="btn btn-primary btn-large">
                   Продолжить обучение
                </Link>
                <Link to="/profile" className="btn btn-secondary btn-large">
                   Мой профиль
                </Link>
              </div>
            </div>
          ) : (
            <>
              <h1 className="hero-title">
                Изучай слова
                <span className="gradient-text"> играя</span>
              </h1>
              <p className="hero-subtitle">
                Эффективный и увлекательный способ пополнить словарный запас. 
                Игры, которые действительно работают!
              </p>
              
              <div className="hero-stats">
                <div className="stat">
                  <div className="stat-number">500+</div>
                  <div className="stat-label">слов для изучения</div>
                </div>
                <div className="stat">
                  <div className="stat-number">3</div>
                  <div className="stat-label">типа игр</div>
                </div>
                <div className="stat">
                  <div className="stat-number">100%</div>
                  <div className="stat-label">эффективность</div>
                </div>
              </div>

              <div className="hero-buttons">
                <Link to="/register" className="btn btn-primary btn-large">
                  Начать учиться
                </Link>
                <Link to="/login" className="btn btn-secondary btn-large">
                  Уже есть аккаунт
                </Link>
              </div>
            </>
          )}
        </div>

        <div className="hero-visual">
          <div className="game-cards">
            <Link to="/games/choice" className="game-card-link">
              <div className="game-card card-1">
                <h4>Выбор перевода</h4>
                <p>Выбирай правильный вариант из четырех</p>
              </div>
            </Link>
            
            <Link to="/games/typing" className="game-card-link">
              <div className="game-card card-2">
                <h4>Написание слов</h4>
                <p>Проверь свою грамотность</p>
              </div>
            </Link>
            
            <Link to="/games/listening" className="game-card-link">
              <div className="game-card card-3">
                <h4>Аудирование</h4>
                <p>Слушай и запоминай</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <div className="waves">
        <div className="wave wave-1"></div>
        <div className="wave wave-2"></div>
      </div>
    </div>
  );
};

export default Hero;