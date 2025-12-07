import React from 'react';
import './TermsPage.css';
const TermsPage = () => {
  return (
    <div className="page-container">
      <div className="page-content">
        <h1>Условия использования</h1>
        
        <section className="terms-section">
          <h2>1. Общие положения</h2>
          <p>Используя WordGame, вы соглашаетесь с настоящими условиями использования.</p>
        </section>

        <section className="terms-section">
          <h2>2. Условия регистрации</h2>
          <ul>
            <li>Минимальный возраст для использования: 13 лет</li>
            <li>Один пользователь - один аккаунт</li>
            <li>Запрещено передавать аккаунт третьим лицам</li>
          </ul>
        </section>

        <section className="terms-section">
          <h2>3. Правила использования</h2>
          <ul>
            <li> Разрешено: обучение, совершенствование навыков</li>
            <li>Запрещено: автоматизированные скрипты, читерство</li>
            <li> Запрещено: оскорбительное поведение</li>
          </ul>
        </section>

        <section className="terms-section">
          <h2>4. Интеллектуальная собственность</h2>
          <p>Все материалы на платформе защищены авторским правом.</p>
        </section>

        <section className="terms-section">
          <h2>5. Изменения условий</h2>
          <p>Мы оставляем за собой право изменять условия использования. О значительных изменениях мы уведомим пользователей.</p>
        </section>

        <section className="terms-section">
          <h2>6. Ограничение ответственности</h2>
          <p>WordGame предоставляется "как есть". Мы не несем ответственности за временные неудобства, связанные с техническим обслуживанием.</p>
        </section>

        <section className="terms-section">
          <h2>7. Конфиденциальность</h2>
          <p>Мы защищаем ваши персональные данные в соответствии с нашей Политикой конфиденциальности.</p>
        </section>

        <div className="terms-footer">
          <p><strong>Дата вступления в силу:</strong> 1 января 2025 года</p>
          <p>По вопросам, связанным с условиями использования, обращайтесь: support@wordgame.com</p>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;