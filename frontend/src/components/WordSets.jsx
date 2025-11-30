import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';

const WordSets = () => {
  const [wordSets, setWordSets] = useState([]);
  const [editingWord, setEditingWord] = useState(null);
  const [editedWord, setEditedWord] = useState({ 
    original_word: '', 
    translation: '', 
    example_sentence: '' 
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedSet, setExpandedSet] = useState(null);

  useEffect(() => {
    fetchWordSets();
  }, []);

  const fetchWordSets = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('📚 Загрузка наборов слов...');
      const response = await adminAPI.getAllWordSets();
      console.log('✅ Данные загружены:', response.data);
      
      if (response.data && response.data.success) {
        console.log('✅ Наборы слов загружены:', response.data.sets);
        setWordSets(response.data.sets || []);
      } else {
        throw new Error(response.data?.error || 'Неизвестная ошибка сервера');
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки наборов слов:', error);
      
      let errorMessage = 'Ошибка при загрузке наборов слов';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchWordsInSet = async (setId) => {
    try {
      console.log(`📖 Загрузка слов для набора ${setId}...`);
      const response = await adminAPI.getWordsInSet(setId);
      
      if (response.data.success) {
        setWordSets(prev => prev.map(set => 
          set.id === setId 
            ? { ...set, words: response.data.words }
            : set
        ));
      }
    } catch (error) {
      console.error(`❌ Ошибка загрузки слов для набора ${setId}:`, error);
    }
  };

  const toggleSetExpansion = async (setId) => {
    if (expandedSet === setId) {
      setExpandedSet(null);
    } else {
      setExpandedSet(setId);
      const set = wordSets.find(s => s.id === setId);
      if (!set.words) {
        await fetchWordsInSet(setId);
      }
    }
  };

  const startEditing = (word) => {
    setEditingWord(word.id);
    setEditedWord({ 
      original_word: word.original_word || word.word, 
      translation: word.translation,
      example_sentence: word.example_sentence || ''
    });
  };

  const saveEdit = async (setId, wordId) => {
    try {
      console.log(`💾 Сохранение слова ${wordId}...`);
      
      // Проверяем, что обязательные поля не пустые
      if (!editedWord.original_word.trim() || !editedWord.translation.trim()) {
        alert('Пожалуйста, заполните обязательные поля');
        return;
      }

      const response = await adminAPI.updateWord(wordId, editedWord);
      
      if (response.data.success) {
        setWordSets(prev => prev.map(set => 
          set.id === setId 
            ? {
                ...set,
                words: set.words.map(w => 
                  w.id === wordId 
                    ? { 
                        ...w, 
                        original_word: editedWord.original_word,
                        translation: editedWord.translation,
                        example_sentence: editedWord.example_sentence
                      }
                    : w
                )
              }
            : set
        ));
        setEditingWord(null);
        console.log('✅ Слово успешно обновлено');
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
      console.error('❌ Ошибка сохранения слова:', error);
      alert('Ошибка при сохранении слова: ' + (error.response?.data?.error || error.message));
    }
  };

  const cancelEdit = () => {
    setEditingWord(null);
  };

  const deleteWord = async (setId, wordId) => {
    if (!window.confirm('Вы уверены, что хотите удалить это слово?')) {
      return;
    }

    try {
      console.log(`🗑️ Удаление слова ${wordId}...`);
      const response = await adminAPI.deleteWord(wordId);
      
      if (response.data.success) {
        setWordSets(prev => prev.map(set => 
          set.id === setId 
            ? {
                ...set,
                words: set.words.filter(w => w.id !== wordId),
                word_count: set.word_count - 1
              }
            : set
        ));
        console.log('✅ Слово успешно удалено');
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
      console.error('❌ Ошибка удаления слова:', error);
      alert('Ошибка при удалении слова: ' + (error.response?.data?.error || error.message));
    }
  };

  const addNewWord = async (setId) => {
    const newWord = prompt('Введите новое слово и перевод через запятую (например: apple, яблоко):');
    if (!newWord) return;

    const [original_word, translation] = newWord.split(',').map(s => s.trim());
    if (!original_word || !translation) {
      alert('Пожалуйста, введите слово и перевод через запятую');
      return;
    }

    // Спрашиваем пример использования (опционально)
    const example_sentence = prompt('Введите пример использования (можно оставить пустым):') || '';

    try {
      console.log(`➕ Добавление нового слова в набор ${setId}...`);
      const response = await adminAPI.addWord({
        set_id: setId,
        original_word: original_word,
        translation: translation,
        example_sentence: example_sentence
      });

      if (response.data.success) {
        await fetchWordsInSet(setId);
        console.log('✅ Новое слово успешно добавлено');
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
      console.error('❌ Ошибка добавления слова:', error);
      alert('Ошибка при добавлении слова: ' + (error.response?.data?.error || error.message));
    }
  };

  const deleteSet = async (setId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот набор слов? Все слова в наборе также будут удалены.')) {
      return;
    }

    try {
      console.log(`🗑️ Удаление набора ${setId}...`);
      const response = await adminAPI.deleteWordSet(setId);
      
      if (response.data.success) {
        setWordSets(prev => prev.filter(set => set.id !== setId));
        console.log('✅ Набор успешно удален');
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
      console.error('❌ Ошибка удаления набора:', error);
      alert('Ошибка при удалении набора: ' + (error.response?.data?.error || error.message));
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading">Загрузка наборов слов...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">{error}</div>
        <div className="error-actions">
          <button onClick={fetchWordSets} className="btn-retry">
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="word-sets">
      <div className="admin-header">
        <h1>Управление наборами слов</h1>
      </div>

      {wordSets.length === 0 ? (
        <div className="no-data">Нет наборов слов</div>
      ) : (
        wordSets.map(set => (
          <div key={set.id} className="word-set">
            <div className="word-set-header" onClick={() => toggleSetExpansion(set.id)}>
              <div className="set-info">
                <h2>{set.name}</h2>
                <span className="word-count">{set.word_count || 0} слов</span>
                {set.description && (
                  <p className="set-description">{set.description}</p>
                )}
              </div>
              <div className="set-actions">
                <button 
                  className="btn-add-word"
                  onClick={(e) => {
                    e.stopPropagation();
                    addNewWord(set.id);
                  }}
                >
                  Добавить слово
                </button>
                <button 
                  className="btn-delete-set"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSet(set.id);
                  }}
                >
                  Удалить набор
                </button>
                <button 
                  className={`btn-expand ${expandedSet === set.id ? 'expanded' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSetExpansion(set.id);
                  }}
                >
                  {expandedSet === set.id ? '▼' : '►'}
                </button>
              </div>
            </div>

            {expandedSet === set.id && (
              <div className="words-list">
                {!set.words || set.words.length === 0 ? (
                  <div className="no-words">В этом наборе пока нет слов</div>
                ) : (
                  set.words.map(word => (
                    <div key={word.id} className="word-item">
                      {editingWord === word.id ? (
                        <div className="word-edit">
                          <input
                            type="text"
                            value={editedWord.original_word}
                            onChange={(e) => setEditedWord(prev => ({ ...prev, original_word: e.target.value }))}
                            placeholder="Слово на английском *"
                          />
                          <input
                            type="text"
                            value={editedWord.translation}
                            onChange={(e) => setEditedWord(prev => ({ ...prev, translation: e.target.value }))}
                            placeholder="Перевод *"
                          />
                          <input
                            type="text"
                            value={editedWord.example_sentence}
                            onChange={(e) => setEditedWord(prev => ({ ...prev, example_sentence: e.target.value }))}
                            placeholder="Пример использования (необязательно)"
                          />
                          <button 
                            className="btn-save"
                            onClick={() => saveEdit(set.id, word.id)}
                          >
                            Сохранить
                          </button>
                          <button 
                            className="btn-cancel"
                            onClick={cancelEdit}
                          >
                            Отмена
                          </button>
                        </div>
                      ) : (
                        <div className="word-display">
                          <div className="word-main">
                            <span className="word-original">{word.original_word || word.word}</span>
                            <span className="word-translation">{word.translation}</span>
                          </div>
                          {word.example_sentence && (
                            <div className="word-example">
                              <span className="example-label">Пример:</span>
                              <span className="example-text">{word.example_sentence}</span>
                            </div>
                          )}
                          <div className="word-actions">
                            <button 
                              className="btn-edit"
                              onClick={() => startEditing(word)}
                            >
                              Изменить
                            </button>
                            <button 
                              className="btn-delete"
                              onClick={() => deleteWord(set.id, word.id)}
                            >
                              Удалить
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default WordSets;