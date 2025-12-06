// components/Register.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

const Register = ({ onRegister }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate(); // Добавляем навигацию

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

  if (formData.password !== formData.confirmPassword) {
    setError('Пароли не совпадают');
    setLoading(false);
    return;
  }

  try {
    console.log('📤 Отправляем данные для регистрации:', {
      username: formData.username,
      email: formData.email,
      password: '***'
    });

    // 1. РЕГИСТРАЦИЯ
    const registerData = await authAPI.register({
      username: formData.username,
      email: formData.email,
      password: formData.password
    });
    
    console.log('📨 Данные от регистрации:', registerData);
    
    // ВАЖНО: registerData уже данные, а не response
    if (registerData && registerData.success) {
      console.log('✅ Регистрация успешна! ID пользователя:', registerData.user?.id);
      
      // 2. АВТОМАТИЧЕСКИЙ ВХОД
      console.log('🔐 Пытаемся войти...');
      const loginData = await authAPI.login({
        username: formData.email,
        password: formData.password
      });
      
      console.log('🔑 Данные от входа:', loginData);
      
      // Здесь тоже loginData уже данные
      if (loginData && loginData.success) {
        console.log('🎉 Вход успешен!');
        onRegister(loginData.user);
        navigate('/');
      } else {
        console.warn('⚠️ Регистрация успешна, но вход не удался');
        setError('Регистрация успешна! Пожалуйста, войдите вручную.');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } else {
      console.warn('❌ Сервер не подтвердил успешность регистрации');
      setError(registerData?.error || registerData?.message || 'Ошибка при регистрации');
    }
    
  } catch (error) {
    console.error('💥 Ошибка в процессе регистрации:', error);
    
    // Обработка ошибок
    if (error.response) {
      if (error.response.status === 409) {
        setError('Пользователь с таким именем или email уже существует');
      } else if (error.response.status === 400) {
        setError('Некорректные данные: ' + (error.response.data?.error || ''));
      } else {
        setError(error.response.data?.error || `Ошибка ${error.response.status}`);
      }
    } else if (error.request) {
      setError('Нет соединения с сервером');
    } else {
      setError('Ошибка: ' + error.message);
    }
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="auth-container">
      <h2>Регистрация</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label>Имя пользователя:</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            name="email"
            value={formData.email}
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
            minLength="6"
          />
        </div>
        <div className="form-group">
          <label>Подтвердите пароль:</label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>
        {error && <div className="error">{error}</div>}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Регистрация...' : 'Зарегистрироваться'}
        </button>
      </form>
      <p style={{ marginTop: '1rem', textAlign: 'center' }}>
        Уже есть аккаунт? <Link to="/login">Войдите</Link>
      </p>
    </div>
  );
};

export default Register;