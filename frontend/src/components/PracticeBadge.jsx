import React, { useEffect, useState } from 'react';
import { wrongWordsAPI } from '../services/api';

const PracticeBadge = () => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWrongWordsCount();
    
    const interval = setInterval(fetchWrongWordsCount, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchWrongWordsCount = async () => {
    try {
      const response = await wrongWordsAPI.getWrongWordsCount();
      
      if (response.data && response.data.success) {
        setCount(response.data.count);
      } else {
        setCount(0);
      }
    } catch (error) {
      console.error('Ошибка получения количества слов:', error);
      setCount(0);
    } finally {
      setLoading(false);
    }
  };

  if (loading || count === 0) {
    return null;
  }

  return (
    <div className="practice-badge">
      {count > 99 ? '99+' : count}
    </div>
  );
};

export default PracticeBadge;