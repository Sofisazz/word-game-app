import { useState, useEffect } from 'react';
import { wrongWordsAPI } from '../services/api';

export const useWrongWordsCount = () => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchWrongWordsCount();
    
    // Обновляем счетчик каждые 30 секунд
    const interval = setInterval(fetchWrongWordsCount, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchWrongWordsCount = async () => {
    try {
      setLoading(true);
      const response = await wrongWordsAPI.getUserWrongWords();
      
      if (response.data && Array.isArray(response.data)) {
        setCount(response.data.length);
      } else {
        setCount(0);
      }
    } catch (error) {
      console.error('Ошибка получения количества слов:', error);
      setError('Не удалось загрузить количество слов');
      setCount(0);
    } finally {
      setLoading(false);
    }
  };

  const refreshCount = () => {
    fetchWrongWordsCount();
  };

  return { count, loading, error, refreshCount };
};