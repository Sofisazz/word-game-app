import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { wordSetsAPI } from '../services/api';
import './GamePage.css';

const ListeningGamePage = () => {
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
    <div className="game-page">
      <div className="game-page-header">
        <div className="game-info">
        
          <div className="game-details">
            <h1>Аудирование</h1>
            <p>Слушайте произношение и выбирайте правильный вариант</p>
            <div className="game-difficulty hard">Уровень: Продвинутый</div>
          </div>
        </div>
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
              
              <div className="game-actions">
                <Link 
                  to={`/game/listening/${set.id}`} 
                  className="btn btn-primary btn-large"
                >
                  Начать игру
                </Link>
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

export default ListeningGamePage;