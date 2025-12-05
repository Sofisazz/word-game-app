import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { wordSetsAPI } from '../services/api';
import './WordSetList.css';

const WordSetList = () => {
  const [sets, setSets] = useState([]);
  const [selectedSet, setSelectedSet] = useState(null);
  const [wordCount, setWordCount] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSets();
  }, []);

  const fetchSets = async () => {
    try {
      const response = await wordSetsAPI.getAll();
      if (response.data.success) {
        setSets(response.data.data);
      }
    } catch (err) {
      setError('Ошибка при загрузке наборов слов');
      console.error('Error fetching word sets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGameStart = (setId, gameType) => {
    setSelectedSet({ setId, gameType });
  };

  const handleCloseModal = () => {
    setSelectedSet(null);
    setWordCount(10);
  };

  const getMaxWords = (set) => {
    return Math.min(set.word_count, 50);
  };

  if (loading) return <div className="loading">Загрузка наборов слов...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="sets-container">
      <div className="sets-header">
        <h1>Выберите способ изучения</h1>
        <p>Разные игры — разный подход к запоминанию!</p>
      </div>
      
      <div className="sets-grid">
        {sets.map((set) => (
          <div key={set.id} className="set-card">
            <div className="set-content">
              <div className="set-header">
                <h3>{set.name}</h3>
                <div className="word-count-badge">{set.word_count} слов</div>
              </div>
              
              <p className="set-description">{set.description}</p>
              
              <div className="divider"></div>
              
              <div className="games-section">
                <div className="games-list">
                  <button 
                    onClick={() => handleGameStart(set.id, 'choice')}
                    className="game-link choice"
                  >
                    <div className="game-info">
                      <span className="game-name">Выбор перевода</span>
                      <span className="game-desc">Выбери правильный вариант</span>
                    </div>
                    <div className="difficulty easy">Начальный</div>
                  </button>
                  
                  <button 
                    onClick={() => handleGameStart(set.id, 'typing')}
                    className="game-link typing"
                  >
                    <div className="game-info">
                      <span className="game-name">Написание</span>
                      <span className="game-desc">Напечатай перевод</span>
                    </div>
                    <div className="difficulty medium">Средний</div>
                  </button>
                  
                  <button 
                    onClick={() => handleGameStart(set.id, 'listening')}
                    className="game-link listening"
                  >
                    <div className="game-info">
                      <span className="game-name">Аудирование</span>
                      <span className="game-desc">Слушай и выбирай</span>
                    </div>
                    <div className="difficulty hard">Продвинутый</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Модальное окно выбора количества слов */}
      {selectedSet && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Настройки игры</h3>
              <button onClick={handleCloseModal} className="close-button">×</button>
            </div>
            
            <div className="modal-body">
              <div className="word-count-selector">
                <label htmlFor="wordCount">Количество слов для изучения:</label>
                <div className="word-count-controls">
                  <input
                    type="range"
                    id="wordCount"
                    min="5"
                    max={getMaxWords(sets.find(s => s.id === selectedSet.setId))}
                    value={wordCount}
                    onChange={(e) => setWordCount(parseInt(e.target.value))}
                    className="word-count-slider"
                  />
                  <div className="word-count-display">
                    <span className="count">{wordCount}</span>
                    <span className="label">слов</span>
                  </div>
                </div>
                
                <div className="word-count-presets">
                  <button 
                    onClick={() => setWordCount(10)}
                    className={`preset-btn ${wordCount === 10 ? 'active' : ''}`}
                  >
                    10 слов
                  </button>
                  <button 
                    onClick={() => setWordCount(20)}
                    className={`preset-btn ${wordCount === 20 ? 'active' : ''}`}
                  >
                    20 слов
                  </button>
                  <button 
                    onClick={() => setWordCount(30)}
                    className={`preset-btn ${wordCount === 30 ? 'active' : ''}`}
                  >
                    30 слов
                  </button>
                </div>
              </div>
              
              <div className="game-info-preview">
                <p><strong>Тип игры:</strong> {
                  selectedSet.gameType === 'choice' ? 'Выбор перевода' :
                  selectedSet.gameType === 'typing' ? 'Написание' : 'Аудирование'
                }</p>
                <p><strong>Набор:</strong> {sets.find(s => s.id === selectedSet.setId)?.name}</p>
                <p><strong>Сложность:</strong> {
                  selectedSet.gameType === 'choice' ? 'Начальная' :
                  selectedSet.gameType === 'typing' ? 'Средняя' : 'Продвинутая'
                }</p>
              </div>
            </div>
            
            <div className="modal-footer">
              <Link 
                to={`/game/${selectedSet.gameType}/${selectedSet.setId}?words=${wordCount}`}
                className="btn btn-primary btn-large"
              >
                Начать игру ({wordCount} слов)
              </Link>
              <button onClick={handleCloseModal} className="btn btn-secondary">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {sets.length === 0 && (
        <div className="no-sets">
          <h3>Пока нет наборов слов</h3>
          <p>Наборы слов появятся здесь скоро!</p>
        </div>
      )}
    </div>
  );
};

export default WordSetList;