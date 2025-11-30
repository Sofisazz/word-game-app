import React, { useState, useRef } from 'react';
import { userAPI } from '../services/api';

const EditProfileModal = ({ user, defaultAvatar, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    display_name: user.display_name || user.username,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewAvatar, setPreviewAvatar] = useState(user.avatar || defaultAvatar);
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
      // Создаем preview
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
      let avatarUrl = user.avatar; // сохраняем текущий аватар

      // Если выбран новый файл, загружаем его
      if (selectedFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('avatar', selectedFile);
        uploadFormData.append('user_id', user.id);

        const uploadResponse = await userAPI.uploadAvatar(uploadFormData);
        if (uploadResponse.data.success) {
          avatarUrl = uploadResponse.data.avatar_url;
        } else {
          throw new Error('Ошибка загрузки фото');
        }
      }

      // Обновляем профиль с новыми данными
      const updateResponse = await userAPI.updateProfile({
        user_id: user.id,
        display_name: formData.display_name,
        avatar: avatarUrl
      });

      if (updateResponse.data.success) {
        onUpdate(updateResponse.data.user);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка сохранения профиля');
      console.error('Save error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>✏️ Редактировать профиль</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <form onSubmit={handleSubmit} className="edit-profile-form">
          {/* Аватар */}
          <div className="avatar-section">
            <label>Аватар</label>
            <div className="avatar-preview">
              <img 
                src={previewAvatar} 
                alt="Avatar preview" 
                className="avatar-image large"
                onError={(e) => {
                  e.target.src = defaultAvatar;
                }}
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
                />
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-secondary"
                >
                  📁 Выбрать фото
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

          {error && <div className="error">{error}</div>}

          <div className="modal-actions">
            <button 
              type="button" 
              onClick={onClose}
              className="btn btn-secondary"
            >
              Отмена
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? '💾 Сохранение...' : '💾 Сохранить изменения'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;