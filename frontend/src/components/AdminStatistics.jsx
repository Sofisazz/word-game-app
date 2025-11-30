// components/admin/AdminStatistics.js
import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';

const AdminStatistics = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalWords: 0,
    totalSets: 0,
    totalGames: 0
  });
  const [popularGames, setPopularGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('📊 Запрос статистики...');
      const response = await adminAPI.getStatistics();
      console.log('✅ Статистика загружена:', response.data);
      
      if (response.data.success) {
        setStats({
          totalUsers: response.data.statistics?.totalUsers || 0,
          totalWords: response.data.statistics?.totalWords || 0,
          totalSets: response.data.statistics?.totalSets || 0,
          totalGames: response.data.statistics?.totalSessions || 0
        });
        setPopularGames(response.data.popularGames || []);
      } else {
        setError('Не удалось загрузить статистику');
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки статистики:', error);
      setError(error.response?.data?.error || 'Ошибка при загрузке статистики');
    } finally {
      setLoading(false);
    }
  };

  const safeToLocaleString = (value) => {
    return (value || 0).toLocaleString();
  };

  const getGameTypeText = (gameType) => {
    const gameTypes = {
      'choice': 'Выбор перевода',
      'typing': 'Написание слов',
      'listening': 'Аудирование'
    };
    return gameTypes[gameType] || gameType;
  };

  // Функция для расчета высоты столбцов графика
  const calculateBarHeight = (value, maxValue) => {
    if (maxValue === 0) return 0;
    return (value / maxValue) * 100;
  };

  // Находим максимальное значение для масштабирования графика
  const maxGameCount = popularGames.length > 0 
    ? Math.max(...popularGames.map(game => game.count || 0))
    : 0;

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading">Загрузка статистики...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">{error}</div>
        <button onClick={fetchStatistics} className="btn-retry">
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <div className="admin-statistics">
      <div className="admin-header">
        <h1>Статистика системы</h1>

      </div>
      
      {/* Основные метрики */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-value">{safeToLocaleString(stats.totalUsers)}</div>
          <div className="stat-label">Всего пользователей</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-value">{safeToLocaleString(stats.totalWords)}</div>
          <div className="stat-label">Слов в системе</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-value">{safeToLocaleString(stats.totalSets)}</div>
          <div className="stat-label">Наборов слов</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🎮</div>
          <div className="stat-value">{safeToLocaleString(stats.totalGames)}</div>
          <div className="stat-label">Всего игр сыграно</div>
        </div>
      </div>

      {/* График и статистика игр */}
      <div className="stats-details">
        {/* График популярности игр */}
        <div className="detail-section chart-section">
          <h3>Популярность игр</h3>
          {popularGames.length > 0 ? (
            <div className="games-chart">
              <div className="chart-bars">
                {popularGames.map((game, index) => (
                  <div key={index} className="chart-bar-container">
                    <div className="chart-bar-wrapper">
                     <div 
                        className="chart-bar"
                        style={{
                          height: `${calculateBarHeight(game.count || 0, maxGameCount)}%`,
                          background: `linear-gradient(to top, #6366f1, ${interpolateColor(
                            game.count || 0,
                            0, // или minVal, но лучше 0 для визуальной плавности
                            maxGameCount,
                            '#6366f1',
                            '#ef4444'
                          )})`
                        }}
                        title={`${getGameTypeText(game.game_type)}: ${game.count} раз`}
                      >
                        <span className="bar-value">{game.count || 0}</span>
                      </div>
                    </div>
                    <div className="chart-label">
                      {getGameTypeText(game.game_type)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="chart-legend">
                <div className="legend-item">
                  <div className="legend-color" style={{backgroundColor: '#6366f1'}}></div>
                  <span>Низкая активность</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{backgroundColor: '#ef4444'}}></div>
                  <span>Высокая активность</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="no-data">
            
              <p>Пока нет данных об играх</p>
              <small>Как пользователи начнут играть, здесь появится статистика</small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


// Интерполирует между двумя цветами в формате #RRGGBB на основе значения
const interpolateColor = (value, minVal, maxVal, colorMin, colorMax) => {
  if (maxVal === minVal) return colorMin;

  // Нормализуем значение от 0 до 1
  const ratio = (value - minVal) / (maxVal - minVal);

  // Парсим HEX в RGB
  const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  };

  const rgbMin = hexToRgb(colorMin);
  const rgbMax = hexToRgb(colorMax);

  // Интерполируем
  const r = Math.round(rgbMin.r + ratio * (rgbMax.r - rgbMin.r));
  const g = Math.round(rgbMin.g + ratio * (rgbMax.g - rgbMin.g));
  const b = Math.round(rgbMin.b + ratio * (rgbMax.b - rgbMin.b));

  // Возвращаем в HEX
  return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
};

export default AdminStatistics;