import React, { useState, useRef } from 'react';
import { userAPI } from '../services/api';

const EditProfileModal = ({ user, defaultAvatar, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    display_name: user.display_name || user.username,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewAvatar, setPreviewAvatar] = useState(
    user.avatar ? `http://localhost${user.avatar}` : defaultAvatar
  );
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewAvatar(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let avatarUrl = user.avatar; 
      if (selectedFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('avatar', selectedFile);
        uploadFormData.append('user_id', user.id);

        console.log('Загружаем аватар...');
        const uploadResponse = await userAPI.uploadAvatar(uploadFormData);
        console.log('Ответ загрузки аватара:', uploadResponse.data);
        
        if (uploadResponse.data.success) {
          avatarUrl = uploadResponse.data.avatar_url; // '/backend/uploads/avatars/avatar_1_123456.jpg'
          console.log('Новый URL аватара:', avatarUrl);
        } else {
          throw new Error(uploadResponse.data.error || 'Ошибка загрузки фото');
        }
      }

      const updateResponse = await userAPI.updateProfile({
        user_id: user.id,
        display_name: formData.display_name,
        avatar: avatarUrl
      });

      console.log('Ответ обновления профиля:', updateResponse.data);

      if (updateResponse.data.success) {
  
        const updatedUser = {
          ...user,
          display_name: formData.display_name || user.username,
          avatar: avatarUrl // Важно: используем avatarUrl, а не user.avatar
        };

        console.log('Обновленный пользователь:', updatedUser);

        localStorage.setItem('user', JSON.stringify(updatedUser));
        console.log('Пользователь сохранен в localStorage:', updatedUser);

        onUpdate(updatedUser);
        
        setTimeout(() => {
          alert('Профиль успешно обновлён!');
        }, 100);
        
        onClose();
      } else {
        throw new Error(updateResponse.data.error || 'Ошибка обновления профиля');
      }
    } catch (err) {
      console.error('Ошибка сохранения профиля:', err);
      setError(err.response?.data?.error || err.message || 'Ошибка сохранения профиля');
    } finally {
      setLoading(false);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Редактировать профиль</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <form onSubmit={handleSubmit} className="edit-profile-form">
          {/* Аватар */}
          <div className="avatar-section">
            <label>Аватар</label>
            <div className="avatar-preview" onClick={triggerFileInput} style={{ cursor: 'pointer' }}>
              <img 
                src={previewAvatar} 
                alt="Avatar preview" 
                className="avatar-image large"
                onError={(e) => {
                  console.error('Ошибка загрузки превью:', previewAvatar);
                  e.target.src = defaultAvatar;
                }}
                onLoad={() => console.log('✅ Превью загружено:', previewAvatar)}
              />
            </div>
            
            <div className="avatar-controls">
              <div className="avatar-upload">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarChange}
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="file-input"
                  style={{ display: 'none' }}
                />
                <button 
                  type="button" 
                  onClick={triggerFileInput}
                  className="btn btn-secondary"
                >
                  Выбрать фото
                </button>
              </div>
              
              {selectedFile && (
                <div className="selected-file-info">
                  <small>Выбран файл: {selectedFile.name}</small>
                </div>
              )}
            </div>
            
            <div className="upload-info">
              <small>Максимальный размер: 2MB. Форматы: JPG, PNG, GIF, WebP</small>
            </div>
          </div>

          {/* Имя для отображения */}
          <div className="form-group">
            <label htmlFor="display_name">Имя для отображения</label>
            <input
              type="text"
              id="display_name"
              name="display_name"
              value={formData.display_name}
              onChange={handleInputChange}
              placeholder="Введите ваше имя"
              maxLength="50"
            />
          </div>

          {/* Email (только для просмотра) */}
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="disabled-input"
            />
            <small>Email нельзя изменить</small>
          </div>

          {error && (
            <div className="error-message" style={{
              backgroundColor: '#f8d7da',
              color: '#721c24',
              padding: '10px',
              borderRadius: '4px',
              margin: '10px 0'
            }}>
              <strong>Ошибка:</strong> {error}
            </div>
          )}

          <div className="modal-actions">
            <button 
              type="button" 
              onClick={onClose}
              className="btn btn-secondary"
              style={{ marginRight: '10px' }}
            >
              Отмена
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="btn btn-primary"
              style={{
                backgroundColor: loading ? '#ccc' : '#007bff',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;