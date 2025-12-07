import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import './WordSets.css'
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddWordModal, setShowAddWordModal] = useState(false);
  const [currentSetId, setCurrentSetId] = useState(null);
  const [newWord, setNewWord] = useState({ 
    original_word: '', 
    translation: '', 
    example_sentence: '' 
  });
  const [newSet, setNewSet] = useState({ 
    name: '', 
    description: '' 
  });

  const createNewSet = async () => {
    try {
      if (!newSet.name.trim()) {
        alert('Пожалуйста, введите название набора');
        return;
      }
      const response = await adminAPI.createWordSet({
        name: newSet.name,
        description: newSet.description || null
      });

      if (response.data.success) {
        await fetchWordSets();
        setShowCreateModal(false);
        setNewSet({ name: '', description: '' });
        alert('Набор слов успешно создан!');
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
      alert('Ошибка при создании набора: ' + (error.response?.data?.error || error.message));
    }
  };

  useEffect(() => {
    fetchWordSets();
  }, []);

  const fetchWordSets = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await adminAPI.getAllWordSets();
      
      if (response.data && response.data.success) {
        setWordSets(response.data.sets || []);
      } else {
        throw new Error(response.data?.error || 'Неизвестная ошибка сервера');
      }
    } catch (error) {
      
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
      console.log(`Загрузка слов для набора ${setId}...`);
      const response = await adminAPI.getWordsInSet(setId);
      
      if (response.data.success) {
        setWordSets(prev => prev.map(set => 
          set.id === setId 
            ? { ...set, words: response.data.words }
            : set
        ));
      }
    } catch (error) {
      console.error(`Ошибка загрузки слов для набора ${setId}:`, error);
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
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
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
      const response = await adminAPI.deleteWord(wordId);
      
      if (response.data.success) {
        setWordSets(prev => prev.map(set => 
          set.id === setId 
            ? {
                ...set,
                words: set.words?.filter(w => w.id !== wordId),
                word_count: (set.word_count || 1) - 1 
              }
            : set
        ));
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
      alert('Ошибка при удалении слова: ' + (error.response?.data?.error || error.message));
    }
  };

  const openAddWordModal = (setId) => {
    setCurrentSetId(setId);
    setNewWord({ original_word: '', translation: '', example_sentence: '' });
    setShowAddWordModal(true);
  };

  const addNewWord = async () => {
    if (!newWord.original_word.trim() || !newWord.translation.trim()) {
      alert('Пожалуйста, заполните обязательные поля: слово и перевод');
      return;
    }

    try {
      console.log(`➕ Добавление нового слова в набор ${currentSetId}...`);
      const response = await adminAPI.addWord({
        set_id: currentSetId,
        original_word: newWord.original_word.trim(),
        translation: newWord.translation.trim(),
        example_sentence: newWord.example_sentence.trim() || null
      });

      if (response.data.success) {
        const newWordObj = {
          id: response.data.word_id, 
          word_set_id: currentSetId,
          original_word: newWord.original_word.trim(),
          translation: newWord.translation.trim(),
          example_sentence: newWord.example_sentence.trim() || ''
        };


        setWordSets(prev => prev.map(set => {
          if (set.id === currentSetId) {

            const currentWords = set.words || [];
            return { 
              ...set, 
              word_count: (set.word_count || 0) + 1,
              words: [...currentWords, newWordObj] 
            };
          }
          return set;
        }));
        

        setShowAddWordModal(false);
        setNewWord({ original_word: '', translation: '', example_sentence: '' });
        
        alert('Слово успешно добавлено!');
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
      alert('Ошибка при добавлении слова: ' + (error.response?.data?.error || error.message));
    }
  };

  const deleteSet = async (setId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот набор слов? Все слова в наборе также будут удалены.')) {
      return;
    }

    try {
      const response = await adminAPI.deleteWordSet(setId);
      
      if (response.data.success) {
        setWordSets(prev => prev.filter(set => set.id !== setId));
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
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
        <button 
          className="btn-create-set"
          onClick={() => setShowCreateModal(true)}
        >
          + Создать новый набор
        </button>
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
                    openAddWordModal(set.id);
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

      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Создать новый набор слов</h2>
              <button 
                className="btn-close-modal"
                onClick={() => {
                  setShowCreateModal(false);
                  setNewSet({ name: '', description: '' });
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="setName">Название набора <span className='label-required'>*</span></label>
                <input
                  id="setName"
                  type="text"
                  value={newSet.name}
                  onChange={(e) => setNewSet(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Например: 'Базовые глаголы'"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="setDescription">Описание (необязательно)</label>
                <textarea 
                  className='textarea-description'
                  id="setDescription"
                  value={newSet.description}
                  onChange={(e) => setNewSet(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Краткое описание набора..."
                  rows="3"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-cancel"
                onClick={() => {
                  setShowCreateModal(false);
                  setNewSet({ name: '', description: '' });
                }}
              >
                Отмена
              </button>
              <button 
                className="btn-create"
                onClick={createNewSet}
                disabled={!newSet.name.trim()}
              >
                Создать набор
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddWordModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Добавить новое слово</h2>
              <button 
                className="btn-close-modal"
                onClick={() => {
                  setShowAddWordModal(false);
                  setNewWord({ original_word: '', translation: '', example_sentence: '' });
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="wordOriginal">Слово (на английском) <span className='label-required'>*</span></label>
                <input
                  id="wordOriginal"
                  type="text"
                  value={newWord.original_word}
                  onChange={(e) => setNewWord(prev => ({ ...prev, original_word: e.target.value }))}
                  placeholder="Например: apple"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="wordTranslation">Перевод <span className='label-required'>*</span></label>
                <input
                  id="wordTranslation"
                  type="text"
                  value={newWord.translation}
                  onChange={(e) => setNewWord(prev => ({ ...prev, translation: e.target.value }))}
                  placeholder="Например: яблоко"
                />
              </div>
              <div className="form-group">
                <label htmlFor="wordExample">Пример использования (необязательно)</label>
                <textarea
                 className='textarea-description'
                  id="wordExample"
                  value={newWord.example_sentence}
                  onChange={(e) => setNewWord(prev => ({ ...prev, example_sentence: e.target.value }))}
                  placeholder="Например: I eat an apple every day."
                  rows="3"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-cancel"
                onClick={() => {
                  setShowAddWordModal(false);
                  setNewWord({ original_word: '', translation: '', example_sentence: '' });
                }}
              >
                Отмена
              </button>
              <button 
                className="btn-create"
                onClick={addNewWord}
                disabled={!newWord.original_word.trim() || !newWord.translation.trim()}
              >
                Добавить слово
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WordSets;