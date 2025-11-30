// components/Login.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

   const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('🔄 Отправка данных для входа:', formData);
      
      const response = await fetch('http://localhost/backend/api/login.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      console.log('✅ Ответ от сервера:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка входа');
      }

      if (data.success) {
        // Передаем данные пользователя в onLogin
        const userData = await onLogin(data.user);
        console.log('✅ Пользователь установлен:', userData);
        
        // Редирект в зависимости от роли
        if (userData.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      } else {
        throw new Error(data.error || 'Ошибка входа');
      }
    } catch (err) {
      console.error('❌ Ошибка входа:', err);
      setError(err.message || 'Произошла ошибка при входе');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Вход в систему</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label>Имя пользователя или email:</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Пароль:</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>
        {error && <div className="error">{error}</div>}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Вход...' : 'Войти'}
        </button>
      </form>
      <p style={{ marginTop: '1rem', textAlign: 'center' }}>
        Нет аккаунта? <Link to="/register">Зарегистрируйтесь</Link>
      </p>
    </div>
  );
};

export default Login;