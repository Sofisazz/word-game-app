// components/HelpPage.js
import React from 'react';
import './HelpPage.css';

const HelpPage = () => {
  return (
    <div className="page-container">
      <div className="page-content">
        <h1>Помощь и поддержка</h1>
        <div className="help-sections">
          <section className="help-section">
            <h2>Как начать обучение?</h2>
            <ol>
              <li>Зарегистрируйтесь или войдите в аккаунт</li>
              <li>Выберите набор слов для изучения</li>
              <li>Начните с игры "Выбор перевода" для знакомства с словами</li>
              <li>Переходите к более сложным играм по мере прогресса</li>
            </ol>
          </section>

          <section className="help-section">
            <h2>Типы игр</h2>
            <div className="game-types">
              <div className="game-type">
                <h3>Выбор перевода</h3>
                <p>Выбирайте правильный перевод из 4 вариантов. Идеально для начала!</p>
              </div>
              <div className="game-type">
                <h3>Написание слов</h3>
                <p>Печатайте перевод слова. Развивает правописание и память.</p>
              </div>
              <div className="game-type">
                <h3>Аудирование</h3>
                <p>Слушайте слово и выбирайте перевод. Улучшает восприятие на слух.</p>
              </div>
            </div>
          </section>

          <section className="help-section">
            <h2>Система прогресса</h2>
            <ul>
              <li>За каждую игру вы получаете XP</li>
              <li>Повышайте уровень для открытия новых возможностей</li>
              <li>Получайте достижения за особые успехи</li>
              <li>Отслеживайте статистику в профиле</li>
            </ul>
          </section>

          <section className="help-section">
            <h2>Нужна помощь?</h2>
            <p>Пишите нам на: <a href="mailto:support@wordgame.com">support@wordgame.com</a></p>
            <p>Мы отвечаем в течение 24 часов</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;