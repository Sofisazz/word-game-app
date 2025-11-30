import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header = ({ user, onLogout }) => {
  const location = useLocation();
  const isHomePage = location.pathname === '/' && !user;

  // Дефолтная аватарка
  const defaultAvatar = 'https://media.istockphoto.com/id/1495088043/ru/%D0%B2%D0%B5%D0%BA%D1%82%D0%BE%D1%80%D0%BD%D0%B0%D1%8F/%D0%B7%D0%BD%D0%B0%D1%87%D0%BE%D0%BA-%D0%BF%D1%80%D0%BE%D1%84%D0%B8%D0%BB%D1%8F-%D0%BF%D0%BE%D0%BB%D1%8C%D0%B7%D0%BE%D0%B2%D0%B0%D1%82%D0%B5%D0%BB%D1%8F-%D0%B7%D0%BD%D0%B0%D1%87%D0%BE%D0%BA-%D0%B0%D0%B2%D0%B0%D1%82%D0%B0%D1%80%D0%B0-%D0%B8%D0%BB%D0%B8-%D1%87%D0%B5%D0%BB%D0%BE%D0%B2%D0%B5%D0%BA%D0%B0-%D0%B0%D0%B2%D0%B0%D1%82%D0%B0%D1%80%D0%BA%D0%B0-%D0%BF%D0%BE%D1%80%D1%82%D1%80%D0%B5%D1%82%D0%BD%D1%8B%D0%B9-%D1%81%D0%B8%D0%BC%D0%B2%D0%BE%D0%BB.jpg?s=612x612&w=0&k=20&c=DS9psRxdq8gUIBtTsGzzy1UYI37nag-gCQ33xqtkpPk=';

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
              <Link to="/sets" className={location.pathname === '/' ? 'active' : ''}>
                Наборы слов
              </Link>
              <Link to="/profile" className={location.pathname === '/profile' ? 'active' : ''}>
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
                </div>
              </Link>
              <button onClick={onLogout} className="btn-logout">Выйти</button>
            </>
          ) : (
            <>
              {!isHomePage && <Link to="/">Главная</Link>}
              <Link to="/login" className="btn-login">Войти</Link>
              {location.pathname !== '/register' && (
                <Link to="/register" className="btn-register">Регистрация</Link>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;