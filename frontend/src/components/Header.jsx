import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PracticeBadge from './PracticeBadge';
import { wrongWordsAPI } from '../services/api';
import './Header.css';

const Header = ({ user, onLogout }) => {
  const location = useLocation();
  const [wrongWordsCount, setWrongWordsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const isHomePage = location.pathname === '/' && !user;

  // Дефолтная аватарка
  const defaultAvatar = 'https://media.istockphoto.com/id/1495088043/ru/%D0%B2%D0%B5%D0%BA%D1%82%D0%BE%D1%80%D0%BD%D0%B0%D1%8F/%D0%B7%D0%BD%D0%B0%D1%87%D0%BE%D0%BA-%D0%BF%D1%80%D0%BE%D1%84%D0%B8%D0%BB%D1%8F-%D0%BF%D0%BE%D0%BB%D1%8C%D0%B7%D0%BE%D0%B2%D0%B0%D1%82%D0%B5%D0%BB%D1%8F-%D0%B7%D0%BD%D0%B0%D1%87%D0%BE%D0%BA-%D0%B0%D0%B2%D0%B0%D1%82%D0%B0%D1%80%D0%B0-%D0%B8%D0%BB%D0%B8-%D1%87%D0%B5%D0%BB%D0%BE%D0%B2%D0%B5%D0%BA%D0%B0-%D0%B0%D0%B2%D0%B0%D1%82%D0%B0%D1%80%D0%BA%D0%B0-%D0%BF%D0%BE%D1%80%D1%82%D1%80%D0%B5%D1%82%D0%BD%D1%8B%D0%B9-%D1%81%D0%B8%D0%BC%D0%B2%D0%BE%D0%BB.jpg?s=612x612&w=0&k=20&c=DS9psRxdq8gUIBtTsGzzy1UYI37nag-gCQ33xqtkpPk=';

  // Загружаем количество неправильных слов при монтировании
  useEffect(() => {
    if (user) {
      fetchWrongWordsCount();
    }
  }, [user]);

// В компоненте Header
const fetchWrongWordsCount = async () => {
  try {
    setLoading(true);
    const response = await wrongWordsAPI.getWrongWordsCount();
    
    if (response.data && response.data.success) {
      setWrongWordsCount(response.data.count);
    } else {
      setWrongWordsCount(0);
    }
  } catch (error) {
    console.error('Ошибка получения количества слов:', error);
    setWrongWordsCount(0);
  } finally {
    setLoading(false);
  }
};

  // Обновляем счетчик при изменении страницы
  useEffect(() => {
    if (user && location.pathname !== '/practice') {
      fetchWrongWordsCount();
    }
  }, [location.pathname, user]);

  return (
    <header className={`header ${isHomePage ? 'header-transparent' : ''}`}>
      <div className="header-content">
        <Link to="/" className="logo-link">
          <div className="logo">
            WordGame
          </div>
        </Link>
        <nav className="nav">
          {user ? (
            <>
              <Link 
                to="/sets" 
                className={`nav-link ${location.pathname === '/sets' ? 'active' : ''}`}
              >
                Наборы слов
              </Link>
              
              {/* Ссылка на практику с бейджем */}
              <Link 
                to="/practice" 
                className={`nav-link practice-link ${location.pathname === '/practice' ? 'active' : ''}`}
              >
                Практика
                {!loading && wrongWordsCount > 0 && (
                  <span className="practice-badge-inline">
                    {wrongWordsCount > 99 ? '99+' : wrongWordsCount}
                  </span>
                )}
              </Link>

              <Link 
                to="/help" 
                className={`nav-link ${location.pathname === '/help' ? 'active' : ''}`}
              >
                Помощь
              </Link>
              
              {/* Профиль пользователя */}
              <Link 
                to="/profile" 
                className={`nav-link profile-link ${location.pathname === '/profile' ? 'active' : ''}`}
              >
                <div className="user-menu">
                  <img 
                    src={user.avatar ? `http://localhost${user.avatar}` : defaultAvatar} 
                    alt="Avatar" 
                    className="avatar-image medium"
                    onError={(e) => {
                      e.target.src = defaultAvatar;
                    }}
                  />
                  <span className="user-greeting">
                    {user.display_name || user.username}
                  </span>
                  {/* Отдельный компонент бейджа для уведомлений */}
                  <PracticeBadge />
                </div>
              </Link>
              
              {/* Кнопка выхода */}
              <button onClick={onLogout} className="btn-logout">Выйти</button>
            </>
          ) : (
            <>
              {/* Ссылки для гостей */}
              {!isHomePage && (
                <Link 
                  to="/" 
                  className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
                >
                  Главная
                </Link>
              )}
              
              <Link 
                to="/help" 
                className={`nav-link ${location.pathname === '/help' ? 'active' : ''}`}
              >
                Помощь
              </Link>
              
              <Link 
                to="/login" 
                className={`nav-link btn-login ${location.pathname === '/login' ? 'active' : ''}`}
              >
                Войти
              </Link>
              
              {location.pathname !== '/register' && (
                <Link 
                  to="/register" 
                  className={`nav-link btn-register ${location.pathname === '/register' ? 'active' : ''}`}
                >
                  Регистрация
                </Link>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;