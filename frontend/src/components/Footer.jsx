import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>WordGame</h3>
          <p>Изучайте английский язык через увлекательные игры и достигайте новых высот!</p>
        </div>

        <div className="footer-section">
          <h4>Игры</h4>
          <ul>
            <li><Link to="/games/choice">Выбор перевода</Link></li>
            <li><Link to="/games/typing">Написание слов</Link></li>
            <li><Link to="/games/listening">Аудирование</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Навигация</h4>
          <ul>
            <li><Link to="/">Главная</Link></li>
            <li><Link to="/sets">Наборы слов</Link></li>
            <li><Link to="/profile">Профиль</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Поддержка</h4>
          <ul>
            <li><Link to="/help">Помощь</Link></li>
            <li><Link to="/privacy">Конфиденциальность</Link></li>
            <li><Link to="/terms">Условия</Link></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-content">
          <p>&copy; 2025 WordGame. Все права защищены.</p>
          <p>Сделано с ❤️ для изучения английского</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;