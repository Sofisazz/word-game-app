import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import './Register.css'
const Register = ({ onRegister }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({
    username: false,
    email: false,
    password: false,
    confirmPassword: false
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shakingFields, setShakingFields] = useState({});
  const navigate = useNavigate();

  const triggerShake = (fieldName) => {
       setShakingFields(prev => ({
      ...prev,
      [fieldName]: true
    }));
    
    setTimeout(() => {
      setShakingFields(prev => ({
        ...prev,
        [fieldName]: false
      }));
    }, 500);
  };

  const validateUsername = (username, forceValidation = false) => {
    if (!forceValidation && !touched.username && !submitted) return '';
    if (!username.trim()) return 'Имя пользователя обязательно';
    
    const forbiddenChars = /[0-9.,?!*/_+-]/;
    if (forbiddenChars.test(username)) {
      return 'Имя не должно содержать цифры, знаки препинания и специальные символы';
    }
    
    if (username.length < 3) return 'Имя должно содержать минимум 3 символа';
    if (username.length > 20) return 'Имя не должно превышать 20 символов';
    
    const validChars = /^[a-zA-Zа-яА-ЯёЁ\s-]+$/;
    if (!validChars.test(username)) {
      return 'Имя должно содержать только буквы, пробелы и дефисы';
    }
    
    return '';
  };

  const validateEmail = (email, forceValidation = false) => {
    if (!forceValidation && !touched.email && !submitted) return '';
    if (!email.trim()) return 'Email обязателен';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Введите корректный email адрес';
    }
    
    return '';
  };

  const validatePassword = (password, forceValidation = false) => {
    if (!forceValidation && !touched.password && !submitted) return '';
    if (!password) return 'Пароль обязателен';
    
    if (password.length < 6) return 'Пароль должен содержать минимум 6 символов';
    if (password.length > 30) return 'Пароль не должен превышать 30 символов';
    
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    
    const errorMessages = [];
    if (!hasUpperCase) errorMessages.push('хотя бы одну заглавную букву');
    if (!hasLowerCase) errorMessages.push('хотя бы одну строчную букву');
    if (!hasNumbers) errorMessages.push('хотя бы одну цифру');
    
    if (errorMessages.length > 0) {
      return `Пароль должен содержать: ${errorMessages.join(', ')}`;
    }
    
    const weakPasswords = ['password', '123456', 'qwerty', 'admin', 'пароль'];
    if (weakPasswords.includes(password.toLowerCase())) {
      return 'Пароль слишком простой';
    }
    
    return '';
  };

  const validateConfirmPassword = (confirmPassword, forceValidation = false) => {
    if (!forceValidation && !touched.confirmPassword && !submitted) return '';
    if (!confirmPassword) return 'Подтверждение пароля обязательно';
    if (confirmPassword !== formData.password) return 'Пароли не совпадают';
    return '';
  };

  const validateForm = () => {
    const newErrors = {};
    
    newErrors.username = validateUsername(formData.username, true);
    newErrors.email = validateEmail(formData.email, true);
    newErrors.password = validatePassword(formData.password, true);
    newErrors.confirmPassword = validateConfirmPassword(formData.confirmPassword, true);
    
    setErrors(newErrors);
    
    Object.keys(newErrors).forEach(fieldName => {
      if (newErrors[fieldName]) {
        triggerShake(fieldName);
      }
    });
    
    return !Object.values(newErrors).some(error => error !== '');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'username') {
      const cleanedValue = value.replace(/[0-9.,?!*/_+-]/g, '');
      setFormData({
        ...formData,
        [name]: cleanedValue
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
    
    if (touched[name] && errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    
    if (!touched[name]) {
      setTouched({
        ...touched,
        [name]: true
      });
    }
    
    let error = '';
    switch (name) {
      case 'username':
        error = validateUsername(value, touched.username || submitted);
        break;
      case 'email':
        error = validateEmail(value, touched.email || submitted);
        break;
      case 'password':
        error = validatePassword(value, touched.password || submitted);
        break;
      case 'confirmPassword':
        error = validateConfirmPassword(value, touched.confirmPassword || submitted);
        break;
      default:
        break;
    }
    
    if (error !== errors[name]) {
      setErrors({
        ...errors,
        [name]: error
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    
    if (!validateForm()) {
      setErrors(prev => ({
        ...prev,
        form: 'Пожалуйста, исправьте ошибки в форме'
      }));
      return;
    }
    
    setLoading(true);

    try {
      console.log('📤 Отправляем данные для регистрации:', {
        username: formData.username,
        email: formData.email,
        password: '***'
      });

      const registerData = await authAPI.register({
        username: formData.username,
        email: formData.email,
        password: formData.password
      });
      
      
      if (registerData && registerData.success) {
        const loginData = await authAPI.login({
          username: formData.email,
          password: formData.password
        });
        
        
        if (loginData && loginData.success) {
          onRegister(loginData.user);
          navigate('/');
        } else {
          setErrors({
            form: 'Регистрация успешна! Пожалуйста, войдите вручную.'
          });
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        }
      } else {
        let fieldToShake = null;
        let errorMessage = registerData?.error || registerData?.message || 'Ошибка при регистрации';
        
        if (errorMessage.includes('email') || errorMessage.includes('почта')) {
          fieldToShake = 'email';
        } else if (errorMessage.includes('username') || errorMessage.includes('имя') || errorMessage.includes('логин')) {
          fieldToShake = 'username';
        } else if (errorMessage.includes('пароль') || errorMessage.includes('password')) {
          fieldToShake = 'password';
        }
        
        if (fieldToShake) {
          triggerShake(fieldToShake);
          setTouched(prev => ({ ...prev, [fieldToShake]: true }));
          setErrors(prev => ({ 
            ...prev, 
            [fieldToShake]: errorMessage,
            form: errorMessage 
          }));
        } else {
          setErrors({ form: errorMessage });
        }
      }
      
    } catch (error) {
      
      if (error.response) {
        if (error.response.status === 409) {
          const errorMessage = 'Пользователь с таким именем или email уже существует';
          
          if (error.response.data?.error?.includes('email')) {
            triggerShake('email');
            setTouched(prev => ({ ...prev, email: true }));
            setErrors({ 
              email: errorMessage,
              form: errorMessage 
            });
          } else if (error.response.data?.error?.includes('username')) {
            triggerShake('username');
            setTouched(prev => ({ ...prev, username: true }));
            setErrors({ 
              username: errorMessage,
              form: errorMessage 
            });
          } else {
            triggerShake('username');
            triggerShake('email');
            setTouched(prev => ({ 
              ...prev, 
              username: true,
              email: true 
            }));
            setErrors({ form: errorMessage });
          }
          
        } else if (error.response.status === 400) {
          const errorMessage = 'Некорректные данные: ' + (error.response.data?.error || '');
          setErrors({ form: errorMessage });
        } else {
          setErrors({
            form: error.response.data?.error || `Ошибка ${error.response.status}`
          });
        }
      } else if (error.request) {
        setErrors({
          form: 'Нет соединения с сервером'
        });
      } else {
        setErrors({
          form: 'Ошибка: ' + error.message
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getInputClassName = (fieldName) => {
    const hasError = errors[fieldName] && (touched[fieldName] || submitted);
    const isShaking = shakingFields[fieldName];
    
    let className = '';
    if (hasError) {
      className = 'error-input';
    }
    if (isShaking) {
      className += ' shake-animation';
    }
    
    return className.trim();
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
            onBlur={handleBlur}
            placeholder="Только буквы, пробелы и дефисы"
            required
            className={getInputClassName('username')}
          />
          {errors.username && (touched.username || submitted) && (
            <div className="error-message">{errors.username}</div>
          )}
        </div>
        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="example@domain.com"
            required
            className={getInputClassName('email')}
          />
          {errors.email && (touched.email || submitted) && (
            <div className="error-message">{errors.email}</div>
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
            placeholder="Минимум 6 символов, заглавные, строчные буквы и цифры"
            required
            className={getInputClassName('password')}
          />
          {errors.password && (touched.password || submitted) && (
            <div className="error-message">{errors.password}</div>
          )}
        </div>
        <div className="form-group">
          <label>Подтвердите пароль:</label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Повторите пароль"
            required
            className={getInputClassName('confirmPassword')}
          />
          {errors.confirmPassword && (touched.confirmPassword || submitted) && (
            <div className="error-message">{errors.confirmPassword}</div>
          )}
        </div>
        
        <div className="password-requirements">
          <p><strong>Пароль должен содержать:</strong></p>
          <ul>
            <li className={formData.password.length >= 6 ? 'valid' : ''}>Минимум 6 символов</li>
            <li className={/[A-Z]/.test(formData.password) ? 'valid' : ''}>Хотя бы одну заглавную букву</li>
            <li className={/[a-z]/.test(formData.password) ? 'valid' : ''}>Хотя бы одну строчную букву</li>
            <li className={/\d/.test(formData.password) ? 'valid' : ''}>Хотя бы одну цифру</li>
          </ul>
        </div>
        
        {errors.form && <div className="error-message form-error">{errors.form}</div>}
        
        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={loading || (!formData.username.trim() || !formData.email.trim() || !formData.password.trim() || !formData.confirmPassword.trim())}
        >
          {loading ? (
            <>
              <span className="spinner"></span> Регистрация...
            </>
          ) : 'Зарегистрироваться'}
        </button>
      </form>
      <p style={{ marginTop: '1rem', textAlign: 'center' }}>
        Уже есть аккаунт? <Link to="/login">Войдите</Link>
      </p>
    </div>
  );
};

export default Register;