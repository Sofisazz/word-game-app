import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { wordSetsAPI, userAPI } from '../services/api';
import './Games.css'
const ChoiceGame = () => { 
  const { setId } = useParams();
  const navigate = useNavigate();
  const [words, setWords] = useState([]);
  const [gameWords, setGameWords] = useState([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [options, setOptions] = useState([]);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showWordModal, setShowWordModal] = useState(true);
  const [wordCount, setWordCount] = useState(10);
  const [maxWords, setMaxWords] = useState(10);
  const [totalTime, setTotalTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [wordResults, setWordResults] = useState([]);
  
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    fetchAllWords();
  }, [setId]);

  useEffect(() => {
    if (gameWords.length > 0 && !showWordModal && !isFinished) {
      generateOptions();
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
        startTimer();
      }
    }
  }, [gameWords, showWordModal, isFinished]);

  useEffect(() => {
    if (gameWords.length > 0 && !showWordModal && !isFinished) {
      generateOptions();
    }
  }, [currentWordIndex]);

  useEffect(() => {
  if (isFinished && wordResults.length === gameWords.length) {
    const timeSpent = currentTime;
    setTotalTime(timeSpent);
    stopTimer();
    saveGameResults(timeSpent);
  }
}, [isFinished, wordResults, gameWords.length]);

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
        setCurrentTime(elapsed);
      }
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const fetchAllWords = async () => {
    try {
      const response = await wordSetsAPI.getWords(setId);
      if (response.data.success) {
        const allWords = response.data.data;
        setWords(allWords);
        setMaxWords(Math.min(allWords.length, 50));
        setWordCount(Math.min(10, allWords.length));
      }
    } catch (err) {
      setError('Ошибка при загрузке слов');
      console.error('Error fetching words:', err);
    } finally {
      setLoading(false);
    }
  };

  const startGame = () => {
    const shuffledWords = [...words].sort(() => Math.random() - 0.5);
    const selectedWords = shuffledWords.slice(0, wordCount);
    setGameWords(selectedWords);
    setShowWordModal(false);
    setCurrentWordIndex(0);
    setScore(0);
    setIsFinished(false);
    setCorrectAnswers(0);
    setXpEarned(0);
    setTotalTime(0);
    setCurrentTime(0);
    setWordResults([]); 
    startTimeRef.current = null;
  };

  const generateOptions = () => {
    const currentWord = gameWords[currentWordIndex];
    const wrongOptions = words
      .filter(word => word.id !== currentWord.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(word => word.translation);
    
    const allOptions = [currentWord.translation, ...wrongOptions]
      .sort(() => Math.random() - 0.5);
    
    setOptions(allOptions);
  };

const handleAnswer = (selectedTranslation) => {
  const currentWord = gameWords[currentWordIndex];
  const isCorrect = selectedTranslation === currentWord.translation;
  
  setSelectedOption(selectedTranslation);

  if (isCorrect) {
    setScore(score + 1);
    setCorrectAnswers(correctAnswers + 1);
  }

  const wordResult = {
    word_id: currentWord.id,
    is_correct: isCorrect
  };
  
  setWordResults(prev => [...prev, wordResult]);

  setTimeout(() => {
    setSelectedOption(null);
    
    if (currentWordIndex < gameWords.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
    } else {
      setIsFinished(true);
    }
  }, 1000);
};

const saveGameResults = async () => {
  try {
    const userData = sessionStorage.getItem('user');
    const user = userData ? JSON.parse(userData) : null;
    
    if (!user) {
      console.error('No user found in sessionStorage');
      return;
    }
    if (wordResults.length !== gameWords.length) {
      console.error('Missing results!', {
        resultsCount: wordResults.length,
        wordsCount: gameWords.length
      });
    }

    const gameData = {
      user_id: user.id,
      game_type: 'choice',
      score: score,
      total_questions: gameWords.length,
      correct_answers: correctAnswers,
      words_learned: correctAnswers,
      time_spent: currentTime, 
      results: wordResults
    };

    console.log('Sending game data to server:', gameData);

    const response = await userAPI.saveGameResult(gameData);
    
    if (response.data && response.data.success) {
      setXpEarned(response.data.xp_earned || 0);
    }
  } catch (err) {
    console.error('Error saving game results:', err);
  }
};

  const getButtonClass = (option) => {
    if (selectedOption === null) return 'option-button';
    if (option === gameWords[currentWordIndex]?.translation) {
      return 'option-button correct';
    }
    if (option === selectedOption && option !== gameWords[currentWordIndex]?.translation) {
      return 'option-button incorrect';
    }
    return 'option-button';
  };

  const handleCloseModal = () => {
    setShowWordModal(false);
  };

  const playAgain = () => {
    setShowWordModal(true);
    setGameWords([]);
    setCurrentWordIndex(0);
    setScore(0);
    setIsFinished(false);
    setSelectedOption(null);
    setTotalTime(0);
    setCurrentTime(0);
    setWordResults([]); 
    stopTimer();
    startTimeRef.current = null;
  };

  const backToMain = () => {
    navigate('/');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  useEffect(() => {
    return () => {
      stopTimer();
    };
  }, []);

  if (loading) return <div className="loading">Загрузка игры...</div>;
  if (error) return <div className="error">{error}</div>;

  if (showWordModal) {
    return (
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
                  max={maxWords}
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
              <p><strong>Тип игры:</strong> Выбор перевода</p>
              <p><strong>Доступно слов:</strong> {words.length}</p>
              <p><strong>Сложность:</strong> Начальная</p>
            </div>
          </div>
          
          <div className="modal-footer">
            <button onClick={startGame} className="btn btn-primary btn-large">
              Начать игру ({wordCount} слов)
            </button>
            <button onClick={handleCloseModal} className="btn btn-secondary">
              Отмена
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!showWordModal && gameWords.length === 0 && !isFinished) {
    return (
      <div className="game-container">
        <div className="game-not-started">
          <h2>Игра не начата</h2>
          <p>Вы закрыли окно настроек игры.</p>
          <div style={{ marginTop: '2rem' }}>
            <button 
              onClick={() => setShowWordModal(true)}
              className="btn btn-primary"
            >
              Открыть настройки
            </button>
            <button 
              onClick={backToMain}
              className="btn btn-secondary"
              style={{ marginLeft: '1rem' }}
            >
              На главную
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="game-container">
        <div className="game-finished">
          <h2>Игра завершена!</h2>
          <p className="score">Ваш результат: {score} из {gameWords.length}</p>
          <p>Процент правильных ответов: {Math.round((score / gameWords.length) * 100)}%</p>
          <p className="time-spent">Общее время прохождения: {formatTime(totalTime)}</p>
          {xpEarned > 0 && (
            <div className="xp-earned">
              <span className="xp-badge">+{xpEarned} XP</span>
            </div>
          )}
          <div style={{ marginTop: '2rem' }}>
            <button 
              onClick={backToMain}
              className="btn btn-primary"
            >
              Вернуться к наборам
            </button>
            <button 
              onClick={playAgain}
              className="btn btn-secondary"
              style={{ marginLeft: '1rem' }}
            >
              Играть еще раз
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameWords.length === 0) {
    return (
      <div className="game-container">
        <div className="error">В этом наборе нет слов</div>
        <button 
          onClick={backToMain}
          className="btn btn-primary"
          style={{ marginTop: '1rem' }}
        >
          На главную
        </button>
      </div>
    );
  }

  const currentWord = gameWords[currentWordIndex];
  const progress = ((currentWordIndex + 1) / gameWords.length) * 100;

  return (
    <div className="game-container">
      <div className="game-header">
        <h1>Выберите правильный перевод</h1>
        <div className="game-info-row">
          <div className="game-settings-info">
            Изучаем: {gameWords.length} слов
          </div>
          <div className="game-timer">
            Время: {formatTime(currentTime)}
          </div>
        </div>
      </div>
      
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <div className="current-word">
        <h2>{currentWord.original_word}</h2>
        {currentWord.example_sentence && (
          <p style={{ color: '#666', fontStyle: 'italic', marginTop: '0.5rem' }}>
            {currentWord.example_sentence}
          </p>
        )}
      </div>

      <div className="options-grid">
        {options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleAnswer(option)}
            className={getButtonClass(option)}
            disabled={selectedOption !== null}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="progress">
        Слово {currentWordIndex + 1} из {gameWords.length}
      </div>
    </div>
  );
};

export default ChoiceGame;