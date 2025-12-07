import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { wrongWordsAPI } from '../services/api';
import { getWrongWordsStatistics, generateOptions, speakWord  } from './utils/wrongWordsUtils';
import './PracticeWrongWords.css';

const PracticeWrongWords = () => {
  const navigate = useNavigate();
  const [wrongAnswers, setWrongAnswers] = useState([]);
  const [practiceWords, setPracticeWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [options, setOptions] = useState([]); // Для хранения вариантов ответов
  
  // Пагинация
  const [wordsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllWords, setShowAllWords] = useState(false);

  // Загрузка неправильных слов из БД
  useEffect(() => {
    fetchWrongAnswers();
  }, []);

  // Генерация вариантов при изменении слова или режима
  useEffect(() => {
    if (practiceWords.length > 0 && currentIndex < practiceWords.length) {
      const currentWord = practiceWords[currentIndex];
      if (currentWord) {
        const generatedOptions = generateOptions(currentWord, practiceWords);
        setOptions(generatedOptions);
      }
    }
  }, [currentIndex, practiceWords, mode]);

  const fetchWrongAnswers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Fetching wrong words from API...');
      
      const response = await wrongWordsAPI.getUserWrongWords();
      
      console.log('📥 API Response:', response);
      console.log('📊 Response data:', response.data);
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ Found ${response.data.length} wrong words`);
        
        if (response.data.length > 0) {
          console.log('📝 First few words:', response.data.slice(0, 3));
        }
        
        setWrongAnswers(response.data);
      } else {
        console.warn('⚠️ No wrong words array in response');
        console.log('Full response:', response);
        setWrongAnswers([]);
      }
    } catch (error) {
      console.error('❌ Error fetching wrong words:', error);
      console.error('❌ Error details:', error.response ? error.response.data : error.message);
      setError('Не удалось загрузить слова для повторения');
      setWrongAnswers([]);
    } finally {
      setLoading(false);
    }
  };

  // Статистика
  const getStatistics = () => {
    return getWrongWordsStatistics(wrongAnswers);
  };

  // Начать практику
  const startPractice = (selectedMode) => {
    setMode(selectedMode);
    setCurrentIndex(0);
    setScore(0);
    setIsFinished(false);
    setShowAnswer(false);
    setUserInput('');
    
    // Используем слова из wrongAnswers для практики
    const wordsForPractice = wrongAnswers.map(word => ({
      id: word.word_id || word.id,
      original_word: word.original_word,
      translation: word.translation,
      example_sentence: word.example_sentence,
      mistakes: word.mistakes || 1
    }));
    
    setPracticeWords(wordsForPractice);
  };

  // Обработка выбора ответа (для режимов choice и listening)
  const handleChoiceAnswer = async (selected) => {
    const currentWord = practiceWords[currentIndex];
    const isCorrect = selected === currentWord.translation;
    
    if (isCorrect) {
      setScore(score + 1);
    } else {
      setShowAnswer(true);
      // Увеличиваем счетчик ошибок в БД
      await incrementMistakes(currentWord.id);
    }
    
    setTimeout(() => {
      setShowAnswer(false);
      nextWord();
    }, 1500);
  };

  // Обработка ввода ответа (для режима typing)
  const handleTypingAnswer = async (e) => {
    e.preventDefault();
    const currentWord = practiceWords[currentIndex];
    const isCorrect = userInput.trim().toLowerCase() === currentWord.translation.toLowerCase();
    
    if (isCorrect) {
      setScore(score + 1);
      setUserInput('');
      setTimeout(() => nextWord(), 1000);
    } else {
      setShowAnswer(true);
      // Увеличиваем счетчик ошибок в БД
      await incrementMistakes(currentWord.id);
      setTimeout(() => {
        setShowAnswer(false);
        setUserInput('');
      }, 2000);
    }
  };

  // Увеличить счетчик ошибок
  const incrementMistakes = async (wordId) => {
    try {
      const wordToUpdate = wrongAnswers.find(w => (w.word_id || w.id) === wordId);
      if (!wordToUpdate) return;

      const response = await wrongWordsAPI.updateWrongWord(wordToUpdate.id || wordToUpdate.word_id, {
        action: 'increment'
      });
      
      // Обновляем локальное состояние
      if (response.data) {
        setWrongAnswers(prev => 
          prev.map(word => 
            (word.id || word.word_id) === wordId 
              ? { ...word, mistakes: response.data.mistakes } 
              : word
          )
        );
      }
    } catch (error) {
      console.error('Ошибка обновления счетчика ошибок:', error);
    }
  };


const markAsCorrect = async (wordId) => {
  try {
    // Находим запись в wrongAnswers
    // wordId - это id слова из таблицы words (word_id)
    // Нам нужно найти запись где word.word_id === wordId
    const wordToDelete = wrongAnswers.find(w => w.word_id === wordId);
    
    if (!wordToDelete) {
      console.error('Слово не найдено в wrongAnswers:', wordId);
      return;
    }

    const wrongAnswerId = wordToDelete.id; // Это id записи в таблице wrong_answers
    
    console.log('Удаление слова:', {
      wordId: wordId,
      wrongAnswerId: wrongAnswerId,
      wordData: wordToDelete
    });

    // Удаляем запись из wrong_answers по ее ID
    await wrongWordsAPI.deleteWrongWord(wrongAnswerId);
    
    // ОБНОВЛЕННАЯ ЛОГИКА ФИЛЬТРАЦИИ:
    // Удаляем запись по id записи wrong_answers, а не по word_id
    setWrongAnswers(prev => prev.filter(word => word.id !== wrongAnswerId));
    
    // Если мы в режиме практики, обновляем practiceWords
    if (mode) {
      // В practiceWords id - это word_id, поэтому фильтруем по word_id
      setPracticeWords(prev => prev.filter(word => word.id !== wordId));
      
      // Проверяем текущее слово
      const currentWord = practiceWords[currentIndex];
      if (currentWord && currentWord.id === wordId) {
        if (currentIndex < practiceWords.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          setIsFinished(true);
        }
      }
    }
    
    console.log('Слово успешно удалено из списка для повторения');
    
  } catch (error) {
    console.error('Ошибка удаления слова:', error);
    setError('Не удалось отметить слово как выученное');
  }
};

  // Переход к следующему слову
  const nextWord = () => {
    if (currentIndex < practiceWords.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsFinished(true);
    }
  };

  // Очистить все неправильные слова
  const clearAllWrongAnswers = async () => {
    if (window.confirm('Вы уверены, что хотите удалить все слова из списка для повторения? Это действие нельзя отменить.')) {
      try {
        await wrongWordsAPI.clearAllWrongWords();
        setWrongAnswers([]);
        setPracticeWords([]);
        if (mode) setMode(null);
      } catch (error) {
        console.error('Ошибка очистки слов:', error);
        setError('Не удалось очистить список слов');
      }
    }
  };

  // Пагинационные функции
  const handleLoadMore = () => {
    if (showAllWords) {
      setCurrentPage(prev => Math.min(prev + 1, totalPages));
    } else {
      setShowAllWords(true);
      setCurrentPage(1);
    }
  };

  const handleShowLess = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    } else {
      setShowAllWords(false);
    }
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Рассчитываем слова для текущей страницы
  const indexOfLastWord = currentPage * wordsPerPage;
  const indexOfFirstWord = indexOfLastWord - wordsPerPage;
  const currentWords = showAllWords 
    ? wrongAnswers.slice(indexOfFirstWord, indexOfLastWord)
    : wrongAnswers.slice(0, wordsPerPage);
  
  const totalPages = Math.ceil(wrongAnswers.length / wordsPerPage);

  const statistics = getStatistics();

  if (loading) {
    return (
      <div className="practice-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Загрузка слов для повторения...</p>
        </div>
      </div>
    );
  }

  if (error && wrongAnswers.length === 0) {
    return (
      <div className="practice-container">
        <div className="error-message">
          <h2>Ошибка</h2>
          <p>{error}</p>
          <button 
            onClick={fetchWrongAnswers}
            className="btn btn-primary"
          >
            Попробовать снова
          </button>
          <button 
            onClick={() => navigate('/')}
            className="btn btn-outline"
          >
            На главную
          </button>
        </div>
      </div>
    );
  }

  if (wrongAnswers.length === 0) {
    return (
      <div className="practice-container">
        <div className="no-practice-words">
          <h2>Отлично!</h2>
          <p>У вас нет слов для повторения</p>
          <p>Все слова изучены правильно!</p>
          <br></br>
          <button 
            onClick={() => navigate('/')}
            className="btn btn-primary"
          >
            Вернуться к играм
          </button>
        </div>
      </div>
    );
  }

  if (!mode) {
    return (
      <div className="practice-container">
        <div className="practice-header">
          <h1>Практика неправильных ответов</h1>
          {error && (
            <div className="alert alert-warning">
              {error}
              <button onClick={() => setError(null)} className="close-btn">&times;</button>
            </div>
          )}
          <div className="practice-stats">
            <div className="stat-item">
              <span className="stat-label">Слов для повторения:</span>
              <span className="stat-value">{statistics.total}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Всего ошибок:</span>
              <span className="stat-value">{statistics.totalMistakes}</span>
            </div>
          </div>
        </div>

        <div className="mode-selection">
          <h2>Выберите режим практики</h2>
          <div className="mode-buttons">
            <button 
              onClick={() => startPractice('choice')}
              className="mode-btn choice-btn"
            >
              <div className="mode-icon">✓</div>
              <div className="mode-info">
                <h3>Выбор перевода</h3>
                <p>Выберите правильный вариант</p>
              </div>
              <div className="difficulty easy">Начальный</div>
            </button>

            <button 
              onClick={() => startPractice('typing')}
              className="mode-btn typing-btn"
            >
              <div className="mode-icon">⌨️</div>
              <div className="mode-info">
                <h3>Написание</h3>
                <p>Напечатайте перевод</p>
              </div>
              <div className="difficulty medium">Средний</div>
            </button>

            <button 
              onClick={() => startPractice('listening')}
              className="mode-btn listening-btn"
            >
              <div className="mode-icon">🎧</div>
              <div className="mode-info">
                <h3>Аудирование</h3>
                <p>Слушайте и выбирайте</p>
              </div>
              <div className="difficulty hard">Сложный</div>
            </button>
          </div>

          <div className="words-preview">
            <div className="words-preview-header">
              <h3>Слова для повторения ({wrongAnswers.length}):</h3>
              <div className="words-preview-actions">
                <button 
                  onClick={clearAllWrongAnswers}
                  className="btn btn-danger clear-all-btn"
                >
                  Очистить все
                </button>
              </div>
            </div>
            
            <div className="words-list">
              {currentWords.map(word => (
                <div onClick={()=>alert('Выбери игру для обучения')} key={word.id || word.word_id} className="word-item">
                  <div className="word-content">
                    <span className="original">{word.original_word}</span>
                    <span className="translation">{word.translation}</span>
                    <span className="mistakes" title="Количество ошибок">
                      {word.mistakes || 1} {word.mistakes === 1 ? 'раз' : 'раза'}
                    </span>
                  </div>
                  <div className="word-actions">
                    <button 
  onClick={(e) =>{markAsCorrect(word.word_id);
  e.stopPropagation();}}  
  className="btn-mark-correct"
  title="Отметить как выученное"
>
  ✓
</button>
                  </div>
                </div>
              ))}
              
              <div className="pagination-controls">
                {!showAllWords && wrongAnswers.length > wordsPerPage && (
                  <button 
                    onClick={handleLoadMore}
                    className="btn btn-load-more"
                  >
                    Показать еще {Math.min(wordsPerPage, wrongAnswers.length - wordsPerPage)} слов
                    <span className="pagination-count">
                      (показано {wordsPerPage} из {wrongAnswers.length})
                    </span>
                  </button>
                )}
                
                {showAllWords && (
                  <>
                    <div className="pagination-info">
                      Страница {currentPage} из {totalPages}
                    </div>
                    
                    <div className="pagination-buttons">
                      {currentPage > 1 && (
                        <button 
                          onClick={() => handlePageChange(currentPage - 1)}
                          className="btn btn-pagination"
                        >
                          ← Назад
                        </button>
                      )}
                      
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`btn btn-pagination ${currentPage === pageNum ? 'active' : ''}`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      
                      {currentPage < totalPages && (
                        <button 
                          onClick={() => handlePageChange(currentPage + 1)}
                          className="btn btn-pagination"
                        >
                          Вперед →
                        </button>
                      )}
                    </div>
                    
                    <button 
                      onClick={handleShowLess}
                      className="btn btn-show-less"
                    >
                      Показать только первые {wordsPerPage} слов
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="practice-container">
        <div className="practice-finished">
          <h2>Практика завершена!</h2>
          <div className="results">
            <p className="score">Правильных ответов: {score} из {practiceWords.length}</p>
            <p className="percentage">
              Процент: {Math.round((score / practiceWords.length) * 100)}%
            </p>
            <div className="performance">
              {score === practiceWords.length ? (
                <span className="perfect">Идеально!</span>
              ) : score >= practiceWords.length * 0.8 ? (
                <span className="good">Отлично!</span>
              ) : score >= practiceWords.length * 0.5 ? (
                <span className="average">Хорошо!</span>
              ) : (
                <span className="poor">Попробуйте еще раз!</span>
              )}
            </div>
          </div>
          <div className="actions">
            <button onClick={() => setMode(null)} className="btn btn-primary">
              Выбрать другой режим
            </button>
            <button 
              onClick={() => startPractice(mode)}
              className="btn btn-secondary"
            >
              Повторить практику
            </button>
            <button 
              onClick={() => navigate('/')}
              className="btn btn-outline"
            >
              На главную
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentWord = practiceWords[currentIndex];
  const progress = ((currentIndex + 1) / practiceWords.length) * 100;

  return (
    <div className="practice-container">
      <div className="practice-game">
        <div className="game-header">
          <div className="progress-info">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="progress-text">
              Слово {currentIndex + 1} из {practiceWords.length}
              {currentWord.mistakes > 1 && (
                <span className="mistakes-count"> (ошибок: {currentWord.mistakes})</span>
              )}
            </span>
          </div>
        </div>

        <div className="word-area">
          {mode === 'listening' ? (
            <div className="listening-prompt">
              <button 
                onClick={() => speakWord(currentWord.original_word)}
                className="btn btn-speak"
              >
                Произнести слово
              </button>
              <p className="hint">Прослушайте слово и выберите перевод</p>
            </div>
          ) : (
            <>
              <h2 className="word">{currentWord.original_word}</h2>
              <div className="word-actions-header">
                <button 
                  onClick={() => speakWord(currentWord.original_word)}
                  className="btn-speak-header"
                  title="Произнести слово"
                >
                  🔊
                </button>
              </div>
              {currentWord.example_sentence && (
                <p className="example">
                  <strong>Пример:</strong> {currentWord.example_sentence}
                </p>
              )}
            </>
          )}
        </div>

        {showAnswer && (
          <div className="answer-feedback">
            <div className="correct-answer">
              <strong>Правильный ответ:</strong> {currentWord.translation}
            </div>
            {mode === 'typing' && userInput && (
              <div className="user-answer">
                <strong>Ваш ответ:</strong> {userInput}
              </div>
            )}
          </div>
        )}

        {/* Варианты ответов для режимов choice и listening */}
        {(mode === 'choice' || mode === 'listening') && (
          <div className="options-grid">
            {options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleChoiceAnswer(option)}
                className="option-btn"
                disabled={showAnswer}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {/* Поле ввода для режима typing */}
        {mode === 'typing' && (
          <form onSubmit={handleTypingAnswer} className="typing-form">
            <input
              type="text"
              maxLength={100}

              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Введите перевод на русском..."
              className="typing-input"
              disabled={showAnswer}
              autoFocus
            />
            <button 
              type="submit" 
              className="btn btn-check"
              disabled={!userInput.trim()}
            >
              Проверить
            </button>
          </form>
        )}

        <div className="game-controls">
          <button 
            onClick={() => setShowAnswer(true)}
            className="btn btn-show-answer"
            disabled={showAnswer}
          >
            Показать ответ
          </button>
         <button 
  onClick={() => markAsCorrect(currentWord.id)}  // currentWord.id = word_id
  className="btn btn-mark-learned"
>
  Я выучил это слово
</button>
          <button 
            onClick={() => setMode(null)}
            className="btn btn-exit"
          >
            Выйти из практики
          </button>
        </div>
      </div>
    </div>
  );
};

export default PracticeWrongWords;