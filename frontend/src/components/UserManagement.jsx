// components/admin/UserManagement.js
import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import './UserManagement.css'
// Импорты для экспорта
import * as XLSX from 'xlsx';
import 'jspdf-autotable';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Загрузка пользователей...');
      const response = await adminAPI.getAllUsers();
      console.log('Ответ от сервера:', response.data);
      
      if (response.data && response.data.success) {
        const usersFromServer = response.data.users || [];
        
        // ФИЛЬТРАЦИЯ АДМИНОВ
        const filteredUsers = usersFromServer.filter(user => user.role !== 'admin');
        
        console.log('Итоговый список пользователей:', filteredUsers);
        setUsers(filteredUsers);
      } else {
        throw new Error(response.data?.error || 'Не удалось загрузить пользователей');
      }
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
      setError(error.response?.data?.error || error.message || 'Ошибка при загрузке пользователей');
    } finally {
      setLoading(false);
    }
  };

const deleteUser = async (userId, username) => {
  if (!window.confirm(`Вы уверены, что хотите удалить пользователя ${username}?`)) {
    return;
  }

  try {
    console.log(`🗑️ Удаление пользователя ${userId}...`);
    const response = await adminAPI.deleteUser(userId);
    
    if (response.data.success) {
      setUsers(prev => prev.filter(user => user.id !== userId));
      alert('Пользователь успешно удален');
    } else {
      throw new Error(response.data.error || 'Ошибка удаления');
    }
  } catch (error) {
    console.error('Ошибка удаления:', error);
    alert('Ошибка: ' + (error.response?.data?.error || error.message || 'Неизвестная ошибка'));
  }
};


  // Экспорт всех пользователей в Excel
  const exportAllUsers = () => {
    try {
      const workbook = XLSX.utils.book_new();
      
      const usersData = users.map(user => ({
        'ID': user.id,
        'Имя пользователя': user.username,
        'Email': user.email,
        'Отображаемое имя': user.display_name || '',
        'Роль': user.role,
        'Дата регистрации': formatDate(user.created_at),
        'Последняя активность': formatLastActivity(user.last_activity)
      }));

      const worksheet = XLSX.utils.json_to_sheet(usersData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Все пользователи');

      XLSX.writeFile(workbook, `all_users_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Ошибка экспорта всех пользователей:', error);
      alert('Ошибка при экспорте: ' + error.message);
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (e) {
      console.log(e);
      return dateString;
    }
  };

  const formatLastActivity = (dateString) => {
    if (!dateString) return 'Никогда';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Сегодня';
      if (diffDays === 1) return 'Вчера';
      if (diffDays < 7) return `${diffDays} дн. назад`;
      
      return formatDate(dateString);
    } catch (e) {
      console.log(e);
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading">Загрузка пользователей...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">{error}</div>
        <button onClick={fetchUsers} className="btn-retry">
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="admin-header">
        <h1>Управление пользователями</h1>
        <div className="header-actions">
          <button 
            onClick={exportAllUsers} 
            className="btn-export-all" 
            disabled={users.length === 0}
          >
            Экспорт всех
          </button>
        </div>
      </div>

      <div className="header-info">
        <span className="users-count">Всего пользователей: {users.length}</span>
        <span className="admin-note">(администраторы скрыты)</span>
      </div>

      {users.length === 0 ? (
        <div className="no-data">
          <p>Нет пользователей для отображения</p>
          <p className="no-data-subtitle">Все пользователи с ролью "админ" скрыты из этого списка</p>
        </div>
      ) : (
        <div className="users-list">
          {users.map(user => (
            <div key={user.id} className="user-card">
              <div className="user-avatar">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.username} className="avatar-image" />
                ) : (
                  <div className="avatar-placeholder">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              
              <div className="user-info">
                <div className="user-main">
                  <h3 className="user-name">
                    {user.display_name || user.username}
                    <span className="user-role user">Пользователь</span>
                  </h3>
                  <p className="user-username">@{user.username}</p>
                </div>
                
                <div className="user-details">
                  <div className="user-detail">
                    <span className="detail-label">Email:</span>
                    <span className="detail-value">{user.email}</span>
                  </div>
                  <div className="user-detail">
                    <span className="detail-label">Регистрация:</span>
                    <span className="detail-value">{formatDate(user.created_at)}</span>
                  </div>
                  <div className="user-detail">
                    <span className="detail-label">Последняя активность:</span>
                    <span className="detail-value">{formatLastActivity(user.last_activity)}</span>
                  </div>
                </div>
              </div>

              <div className="user-actions">
                <div className="export-buttons">
                </div>
                <button 
                  className="btn-delete"
                  onClick={() => deleteUser(user.id, user.username)}
                  title="Удалить пользователя"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserManagement;