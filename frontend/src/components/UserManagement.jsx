// components/admin/UserManagement.js
import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import './UserManagement.css';
import * as XLSX from 'xlsx';

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
      
      console.log('🔄 Загрузка пользователей...');
      
      let response;
      try {
        response = await adminAPI.getAllUsersWithStats();
        console.log('✅ Получены пользователи со статистикой:');
        
        // Отладка первого пользователя
        if (response.data.users && response.data.users.length > 0) {
          const firstUser = response.data.users[0];
          console.log('👤 Первый пользователь:', firstUser.username);
          console.log('📅 created_at:', firstUser.created_at);
          console.log('📅 last_activity (raw):', firstUser.last_activity);
          console.log('📅 last_activity_text (с сервера):', firstUser.last_activity_text);
        }
      } catch (statsError) {
        console.warn('⚠️ Не удалось получить пользователей со статистикой:', statsError.message);
        response = await adminAPI.getAllUsers();
        console.log('✅ Получены пользователи без статистики:');
      }
      
      if (response.data && response.data.success) {
        const usersFromServer = response.data.users || [];
        
        // ФИЛЬТРАЦИЯ АДМИНОВ
        const filteredUsers = usersFromServer.filter(user => user.role !== 'admin');
        
        console.log('👥 Отфильтрованные пользователи:', filteredUsers.length);
        
        // Обрабатываем данные для правильного отображения
        const processedUsers = filteredUsers.map(user => {
          // Определяем последнюю активность
          const lastActivity = user.last_activity || user.created_at;
          
          // Создаем форматированное время
          let displayText;
          if (!lastActivity || lastActivity === 'null' || lastActivity === '0000-00-00 00:00:00') {
            displayText = 'Никогда';
          } else {
            // Проверяем, есть ли уже форматированный текст с сервера
            if (user.last_activity_text && user.last_activity_text !== 'null') {
              displayText = user.last_activity_text;
            } else {
              // Форматируем на клиенте
              displayText = formatDateTime(lastActivity);
            }
          }
          
          // Для отладки
          if (filteredUsers.length <= 5) { // Логируем только первых 5 пользователей для удобства
            console.log(`👤 ${user.username}:`);
            console.log('  - Регистрация:', user.created_at);
            console.log('  - Последняя активность (сырая):', user.last_activity);
            console.log('  - Отображаемый текст:', displayText);
          }
          
          return {
            ...user,
            last_activity: lastActivity,
            last_activity_display: displayText
          };
        });
        
        setUsers(processedUsers);
      } else {
        throw new Error(response.data ? response.data.error : 'Не удалось загрузить пользователей');
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки пользователей:', error);
      setError(error.response ? error.response.data.error : error.message || 'Ошибка при загрузке пользователей');
    } finally {
      setLoading(false);
    }
  };

  // Функция для получения URL аватара
  const getAvatarUrl = (avatarPath) => {
    if (!avatarPath) return null;
    
    // Если это уже полный URL
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      return avatarPath;
    }
    
    // Если путь начинается с /backend
    if (avatarPath.startsWith('/backend/')) {
      return `http://localhost${avatarPath}`;
    }
    
    // Если путь относительный
    if (avatarPath.startsWith('uploads/') || avatarPath.startsWith('/uploads/')) {
      return `http://localhost/backend/${avatarPath.replace(/^\//, '')}`;
    }
    
    // Если это просто имя файла
    if (avatarPath.includes('avatar_')) {
      return `http://localhost/backend/uploads/avatars/${avatarPath}`;
    }
    
    return avatarPath;
  };

  // Функция для экспорта в Excel
  const exportAllUsers = () => {
    try {
      if (users.length === 0) {
        alert('Нет данных для экспорта');
        return;
      }
      
      const workbook = XLSX.utils.book_new();
      
      // Основной лист с данными пользователей
      const usersData = users.map(user => ({
        'ID': user.id,
        'Имя пользователя': user.username,
        'Email': user.email,
        'Отображаемое имя': user.display_name || '-',
        'Дата регистрации': formatDateTimeForExcel(user.created_at),
        'Последняя активность': formatDateTimeForExcel(user.last_activity),
    
        
        // Статистика (если есть)
        'Уровень': user.level || 1,
        'Опыт (XP)': user.total_xp || 0,
        'Всего игр': user.total_games_played || 0,
        'Правильных ответов': user.total_correct_answers || 0,
        'Процент правильных': user.accuracy_percent ? `${user.accuracy_percent}%` : '0%',
        'Средний XP за игру': user.average_xp_per_game || 0,
        
       
        'Выучено слов ': user.total_words_learned || 0,
        
        'Количество достижений': user.achievements_count || 0,
 }));

      const worksheet = XLSX.utils.json_to_sheet(usersData);
      
      // Настройка ширины столбцов
      const colWidths = [
        { wch: 5 },   // ID
        { wch: 15 },  // Имя пользователя
        { wch: 25 },  // Email
        { wch: 25 },  // Отображаемое имя
        { wch: 20 },  // Дата регистрации
        { wch: 25 },  // Последняя активность (точное время)
        { wch: 8 },   // Уровень
        { wch: 10 },  // Опыт (XP)
        { wch: 10 },  // Всего игр
        { wch: 20 },  // Правильных ответов
        { wch: 20 },  // Процент правильных
        { wch: 20 },  // Средний XP за игру
        { wch: 20 },  // Выучено слов
       
        { wch: 25 },  // Количество достижений
      ];
      worksheet['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Все пользователи');

      // Лист со сводной статистикой (только если есть данные)
      if (users.some(user => user.total_games_played > 0)) {
        const totalUsers = users.length;
        const totalGames = users.reduce((sum, user) => sum + (user.total_games_played || 0), 0);
        const totalCorrectAnswers = users.reduce((sum, user) => sum + (user.total_correct_answers || 0), 0);
        const totalWordsLearned = users.reduce((sum, user) => sum + (user.learned_words_count || user.total_words_learned || 0), 0);
        const totalXP = users.reduce((sum, user) => sum + (user.total_xp || 0), 0);
        const avgLevel = totalUsers > 0 ? Math.round(users.reduce((sum, user) => sum + (user.level || 1), 0) / totalUsers) : 0;
        
        const summaryData = [
          ['Сводная статистика пользователей'],
          ['Дата генерации:', new Date().toLocaleString('ru-RU')],
          [''],
          ['Общее количество пользователей:', totalUsers],
          ['Всего сыграно игр:', totalGames],
          ['Всего правильных ответов:', totalCorrectAnswers],
          ['Всего выучено слов:', totalWordsLearned],
          ['Общий опыт (XP):', totalXP],
          ['Средний уровень:', avgLevel],
          [''],
          ['Топ пользователи:'],
          ['Самый активный:', getMostActiveUser(users)],
          ['Самый высокий уровень:', getTopLevelUser(users)],
          ['Самый большой опыт:', getTopXPUser(users)],
        ];
        
        if (totalUsers > 0) {
          summaryData.push(
            [''],
            ['Средние показатели:'],
            ['Среднее количество игр на пользователя:', Math.round(totalGames / totalUsers)],
            ['Среднее количество слов на пользователя:', Math.round(totalWordsLearned / totalUsers)],
            ['Средний опыт на пользователя:', Math.round(totalXP / totalUsers)]
          );
        }
        
        const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Сводка');
      }

      const fileName = `users_statistics_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      alert(`Экспорт завершен! Файл "${fileName}" скачан.`);
    } catch (error) {
      console.error('Ошибка экспорта:', error);
      alert('Ошибка при экспорте: ' + error.message);
    }
  };

  // Вспомогательные функции
  const getMostActiveUser = (users) => {
    if (users.length === 0) return '-';
    const mostActive = users.reduce((prev, current) => 
      (prev.total_games_played || 0) > (current.total_games_played || 0) ? prev : current
    );
    return `${mostActive.display_name || mostActive.username} (${mostActive.total_games_played || 0} игр)`;
  };

  const getTopLevelUser = (users) => {
    if (users.length === 0) return '-';
    const topLevel = users.reduce((prev, current) => 
      (prev.level || 1) > (current.level || 1) ? prev : current
    );
    return `${topLevel.display_name || topLevel.username} (уровень ${topLevel.level || 1})`;
  };

  const getTopXPUser = (users) => {
    if (users.length === 0) return '-';
    const topXP = users.reduce((prev, current) => 
      (prev.total_xp || 0) > (current.total_xp || 0) ? prev : current
    );
    return `${topXP.display_name || topXP.username} (${topXP.total_xp || 0} XP)`;
  };

  const formatDateTime = (dateString) => {
    if (!dateString || dateString === 'null' || dateString === '0000-00-00 00:00:00') {
      return 'Никогда';
    }
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      
      // Проверяем валидность даты
      if (isNaN(date.getTime())) {
        console.log('⚠️ Невалидная дата:', dateString);
        return dateString;
      }
      
      const diffTime = Math.abs(now - date);
      const diffSeconds = Math.floor(diffTime / 1000);
      const diffMinutes = Math.floor(diffTime / (1000 * 60));
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      // Форматируем точное время
      const formattedTime = date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Определяем относительное время
      let relativeText = '';
      
      if (diffSeconds < 60) {
        relativeText = ' (только что)';
      } else if (diffMinutes < 60) {
        relativeText = ` (${diffMinutes} ${getRussianWord(diffMinutes, ['минуту', 'минуты', 'минут'])} назад)`;
      } else if (diffHours < 24) {
        relativeText = ` (${diffHours} ${getRussianWord(diffHours, ['час', 'часа', 'часов'])} назад)`;
      } else if (diffDays === 1) {
        relativeText = ' (вчера)';
      } else if (diffDays === 2) {
        relativeText = ' (позавчера)';
      } else if (diffDays < 7) {
        relativeText = ` (${diffDays} ${getRussianWord(diffDays, ['день', 'дня', 'дней'])} назад)`;
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        relativeText = ` (${weeks} ${getRussianWord(weeks, ['неделю', 'недели', 'недель'])} назад)`;
      } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        relativeText = ` (${months} ${getRussianWord(months, ['месяц', 'месяца', 'месяцев'])} назад)`;
      } else {
        const years = Math.floor(diffDays / 365);
        relativeText = ` (${years} ${getRussianWord(years, ['год', 'года', 'лет'])} назад)`;
      }
      
      return formattedTime + relativeText;
      
    } catch (e) {
      console.log('❌ Ошибка форматирования даты:', e);
      return dateString;
    }
  };

  // Вспомогательная функция для склонения русских слов
  const getRussianWord = (number, words) => {
    const cases = [2, 0, 1, 1, 1, 2];
    return words[
      number % 100 > 4 && number % 100 < 20 
        ? 2 
        : cases[Math.min(number % 10, 5)]
    ];
  };

  // Функция для форматирования даты для Excel (только дата и время)
  const formatDateTimeForExcel = (dateString) => {
    if (!dateString || dateString === 'null' || dateString === '0000-00-00 00:00:00') {
      return '';
    }
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      
      return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      console.log(e);
      return dateString;
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
      alert('Ошибка: ' + (error.response ? error.response.data.error : error.message || 'Неизвестная ошибка'));
    }
  };

  // Добавим также статистику в карточки пользователей
  const renderUserStats = (user) => {
    if (!user.total_games_played && !user.total_xp) return null;
    
    return (
      <div className="user-stats">
        {user.level && (
          <div className="stat-item">
            <span className="stat-label">Уровень:</span>
            <span className="stat-value">{user.level}</span>
          </div>
        )}
        {user.total_games_played > 0 && (
          <div className="stat-item">
            <span className="stat-label">Игр:</span>
            <span className="stat-value">{user.total_games_played}</span>
          </div>
        )}
        {user.total_xp > 0 && (
          <div className="stat-item">
            <span className="stat-label">XP:</span>
            <span className="stat-value">{user.total_xp}</span>
          </div>
        )}
        {user.learned_words_count > 0 && (
          <div className="stat-item">
            <span className="stat-label">Слов:</span>
            <span className="stat-value">{user.learned_words_count}</span>
          </div>
        )}
      </div>
    );
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
                {getAvatarUrl(user.avatar) ? (
                  <img 
                    src={getAvatarUrl(user.avatar)} 
                    alt={user.username} 
                    className="avatar-image"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const placeholder = e.target.nextElementSibling;
                      if (placeholder) {
                        placeholder.style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                <div className="avatar-placeholder" style={getAvatarUrl(user.avatar) ? { display: 'none' } : {}}>
                  {user.username.charAt(0).toUpperCase()}
                </div>
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
                    <span className="detail-value">{formatDateTime(user.created_at)}</span>
                  </div>
                  <div className="user-detail">
                    <span className="detail-label">Последняя активность:</span>
                    <span className="detail-value">{formatDateTime(user.last_activity)}</span>
                  </div>
                </div>
                
                {/* Добавляем статистику если она есть */}
                {renderUserStats(user)}
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