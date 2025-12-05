import { wrongWordsAPI } from "../../services/api";

// Функция для добавления неправильного слова (используется в других компонентах)
export const addWrongWord = async (wordId) => {
  try {
    const response = await wrongWordsAPI.addWrongWord(wordId);
    return response.data;
  } catch (error) {
    console.error('Ошибка добавления неправильного слова:', error);
    throw error;
  }
};

// Функция для проверки, есть ли слово в списке ошибок
export const checkIfWordIsWrong = async (wordId) => {
  try {
    const response = await wrongWordsAPI.checkWord(wordId);
    return response.data.exists;
  } catch (error) {
    console.error('Ошибка проверки слова:', error);
    return false;
  }
};

// Функция для получения статистики по неправильным словам
export const getWrongWordsStatistics = (wrongAnswers) => {
  const total = wrongAnswers.length;
  const totalMistakes = wrongAnswers.reduce((sum, word) => sum + (word.mistakes || 1), 0);
  return { total, totalMistakes };
};

// Функция для генерации вариантов ответов
export const generateOptions = (currentWord, allWords) => {
  const wrongOptions = allWords
    .filter(w => w.id !== currentWord.id)
    .map(w => w.translation)
    .slice(0, 3);
  
  return [currentWord.translation, ...wrongOptions].sort(() => Math.random() - 0.5);
};

// Функция для произношения слова
export const speakWord = (word) => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
  }
};