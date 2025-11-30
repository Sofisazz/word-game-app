// components/PrivacyPage.js
import React from 'react';
import './PrivacyPage.css';

const PrivacyPage = () => {
  return (
    <div className="page-container">
      <div className="page-content">
        <h1>Политика конфиденциальности</h1>
        <div className="privacy-sections">
          <section className="privacy-section">
            <h2>Какие данные мы собираем</h2>
            <ul>
              <li>Электронная почта для регистрации и уведомлений</li>
              <li>Имя пользователя и настройки профиля</li>
              <li>Статистика обучения и прогресс</li>
              <li>Результаты игр и достижения</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>Как мы используем ваши данные</h2>
            <ul>
              <li>Для предоставления услуг обучения</li>
              <li>Для улучшения работы приложения</li>
              <li>Для персонализации опыта обучения</li>
              <li>Для отправки важных уведомлений</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>Защита данных</h2>
            <p>Мы используем современные методы шифрования и защиты для обеспечения безопасности ваших данных. Все передаваемые данные защищены с использованием протоколов безопасного соединения.</p>
          </section>

          <section className="privacy-section">
            <h2>Ваши права</h2>
            <ul>
              <li>Право на доступ к вашим данным</li>
              <li>Право на исправление данных</li>
              <li>Право на удаление аккаунта</li>
              <li>Право на отзыв согласия</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;