import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { wordSetsAPI } from '../services/api';
import './WordSetList.css';

const WordSetList = () => {
  const [sets, setSets] = useState([]);
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
                  <Link 
                    to={`/game/choice/${set.id}?words=10`}
                    className="game-link choice"
                  >
                    <div className="game-info">
                      <span className="game-name">Выбор перевода</span>
                      <span className="game-desc">Выбери правильный вариант</span>
                    </div>
                    <div className="difficulty easy">Начальный</div>
                  </Link>
                  
                  <Link 
                    to={`/game/typing/${set.id}?words=10`}
                    className="game-link typing"
                  >
                    <div className="game-info">
                      <span className="game-name">Написание</span>
                      <span className="game-desc">Напечатай перевод</span>
                    </div>
                    <div className="difficulty medium">Средний</div>
                  </Link>
                  
                  <Link 
                    to={`/game/listening/${set.id}?words=10`}
                    className="game-link listening"
                  >
                    <div className="game-info">
                      <span className="game-name">Аудирование</span>
                      <span className="game-desc">Слушай и выбирай</span>
                    </div>
                    <div className="difficulty hard">Продвинутый</div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

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