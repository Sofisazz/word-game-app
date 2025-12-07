import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css'; 

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  });
  
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({
    identifier: false,
    password: false
  });
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const navigate = useNavigate();

  const forbiddenCharsRegex = /[0-9.,?!*/_+-]/;

  const validateIdentifier = (identifier, forceValidation = false) => {
    if (!forceValidation && !touched.identifier) return '';
    if (!identifier.trim()) return 'Введите имя пользователя или email';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmail = emailRegex.test(identifier);
    
    if (!isEmail) {
      if (identifier.length < 2) return 'Имя пользователя должно быть не короче 2 символов';
      if (identifier.length > 30) return 'Имя пользователя не должно превышать 30 символов';
      
      if (forbiddenCharsRegex.test(identifier)) {
        return 'Имя не должно содержать цифры, знаки препинания и специальные символы';
      }
      
      const validCharsRegex = /^[a-zA-Zа-яА-ЯёЁ\s-]+$/;
      if (!validCharsRegex.test(identifier)) {
        return 'Имя должно содержать только буквы, пробелы и дефисы';
      }
    }
    
    return '';
  };

  const validatePassword = (password, forceValidation = false) => {
    if (!forceValidation && !touched.password) return '';
    if (!password) return 'Введите пароль';
    
    if (passwordError) {
      return 'Неверный пароль';
    }
    
    return '';
  };

  const validateForm = () => {
    const newErrors = {};
    
    newErrors.identifier = validateIdentifier(formData.identifier, true);
    newErrors.password = validatePassword(formData.password, true);
    
    setErrors(newErrors);
    
    return !Object.values(newErrors).some(error => error !== '');
  };

  const handleIdentifierChange = (value) => {
    if (passwordError) {
      setPasswordError(false);
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const looksLikeEmail = emailRegex.test(value);
    
    let cleanedValue = value;
    
    if (!looksLikeEmail && value.length > 0) {
      const hasAtSymbol = value.includes('@');
      
      if (!hasAtSymbol) {
        cleanedValue = value.replace(forbiddenCharsRegex, '');
      } else {
        cleanedValue = value;
      }
    }
    
    setFormData({
      ...formData,
      identifier: cleanedValue
    });
    
    if (touched.identifier && errors.identifier) {
      setErrors(prev => ({
        ...prev,
        identifier: ''
      }));
    }
  };

  const handlePasswordChange = (value) => {
    if (passwordError) {
      setPasswordError(false);
    }
    
    setFormData({
      ...formData,
      password: value
    });
    
    if (touched.password && errors.password) {
      setErrors(prev => ({
        ...prev,
        password: ''
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'identifier') {
      handleIdentifierChange(value);
    } else {
      handlePasswordChange(value);
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    
    if (!touched[name]) {
      setTouched(prev => ({
        ...prev,
        [name]: true
      }));
    }
    
    let error = '';
    switch (name) {
      case 'identifier':
        error = validateIdentifier(value, touched.identifier);
        break;
      case 'password':
        error = validatePassword(value, touched.password);
        break;
      default:
        break;
    }
    
    if (error !== errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: error
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setPasswordError(false);
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setErrors(prev => ({ ...prev, form: '' }));

    try {
      console.log('Отправка данных для входа:', {
        identifier: formData.identifier,
        password: '***'
      });
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isEmail = emailRegex.test(formData.identifier);
      
      const loginPayload = {
        password: formData.password
      };
      
      if (isEmail) {
        loginPayload.email = formData.identifier;
      } else {
        loginPayload.username = formData.identifier;
      }
      
      const response = await fetch('http://localhost/backend/api/login.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(loginPayload)
      });

      const data = await response.json();
      console.log('Ответ от сервера:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка входа');
      }

      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        console.log('User saved to localStorage:', data.user);
        
        const userData = await onLogin(data.user);
        console.log('Пользователь установлен:', userData);
        
        setErrors(prev => ({
          ...prev,
          form: 'success: Вход выполнен успешно!'
        }));
        
        setTimeout(() => {
          if (userData.role === 'admin') {
            navigate('/admin');
          } else {
            navigate('/');
          }
        }, 500);
        
      } else {
        throw new Error(data.error || 'Ошибка входа');
      }
    } catch (err) {
      console.error('Ошибка входа:', err);
      
      let errorMessage = err.message || 'Произошла ошибка при входе';
      let isPasswordError = false;
      
      if (err.message.includes('не найден') || err.message.includes('не существует')) {
        errorMessage = 'Пользователь с такими данными не найден. Проверьте имя пользователя или email';
      } else if (err.message.includes('пароль') || err.message.includes('password') || err.message.includes('неверный') || err.message.includes('Invalid credentials')) {
        errorMessage = 'Неверный пароль';
        isPasswordError = true;
      } else if (err.message.includes('email')) {
        errorMessage = 'Неверный email или пароль';
      } else if (err.response && err.response.status === 429) {
        errorMessage = 'Слишком много попыток входа. Попробуйте позже';
      }
      
      if (isPasswordError) {
        console.log('Устанавливаем ошибку пароля');
        
        setPasswordError(true);
        setTouched(prev => ({
          ...prev,
          password: true
        }));
        setErrors(prev => ({
          ...prev,
          password: 'Неверный пароль',
          form: errorMessage
        }));
      } else {
        setErrors(prev => ({
          ...prev,
          form: errorMessage
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  const getInputClassName = (fieldName) => {
    console.log(`getInputClassName для ${fieldName}:`, {
      errors: errors[fieldName],
      touched: touched[fieldName],
      passwordError
    });
    
    if (fieldName === 'password') {
      if (passwordError && touched.password) {
        console.log('Возвращаем password-error для поля пароля');
        return 'password-error';
      }
      if (errors.password && touched.password) {
        console.log('Возвращаем error-input для поля пароля');
        return 'error-input';
      }
    }
    
    if (errors[fieldName] && touched[fieldName]) {
      return 'error-input';
    }
    
    return '';
  };

  const getFieldHint = (fieldName) => {
    if (errors[fieldName] || (fieldName === 'password' && passwordError)) return null;
    
    if (!touched[fieldName]) return null;
    
    if (fieldName === 'password' && formData.password) {
      if (formData.password.length >= 8) {
        return <div className="field-hint">✓ Пароль достаточно длинный</div>;
      }
    }
    
    return null;
  };

  const getIdentifierPlaceholder = () => {
    if (formData.identifier.includes('@')) {
      return 'example@domain.com';
    }
    return 'Имя пользователя (только буквы и дефисы)';
  };

  return (
    <div className="auth-container">
      <h2>Вход в систему</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label>Имя пользователя или email:</label>
          <input
            type="text"
            name="identifier"
            value={formData.identifier}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={getIdentifierPlaceholder()}
            required
            autoFocus
            className={getInputClassName('identifier')}
          />
          {getFieldHint('identifier')}
          {errors.identifier && touched.identifier && (
            <div className="error-message">{errors.identifier}</div>
          )}
        </div>
        <div className="form-group">
          <label>Пароль:</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Введите пароль"
            required
            className={getInputClassName('password')}
          />
          
          {getFieldHint('password')}
          
          {(errors.password || passwordError) && touched.password && (
            <div className="error-message password-error-text">
              {errors.password || 'Неверный пароль'}
            </div>
          )}
        </div>

        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={loading || (!formData.identifier.trim() || !formData.password.trim())}
        >
          {loading ? (
            <>
              <span className="spinner"></span> Вход...
            </>
          ) : 'Войти'}
        </button>
      </form>
      <p style={{ marginTop: '1rem', textAlign: 'center' }}>
        Нет аккаунта? <Link to="/register">Зарегистрируйтесь</Link>
      </p>
    </div>
  );
};

export default Login;