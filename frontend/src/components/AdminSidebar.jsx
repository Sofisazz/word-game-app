// components/admin/AdminSidebar.js
import React from 'react';

const AdminSidebar = ({ activeSection, setActiveSection, onLogout }) => {
  const menuItems = [
    { key: 'statistics', label: 'Статистика' },
    { key: 'word-sets', label: 'Наборы слов' },
    { key: 'users', label: 'Пользователи' }
  ];

  return (
    <div className="admin-sidebar">
      <div className="admin-sidebar-header">
        <h2>Панель управления</h2>
      </div>
      <nav className="admin-sidebar-nav">
        {menuItems.map(item => (
          <button
            key={item.key}
            className={`admin-nav-item ${activeSection === item.key ? 'active' : ''}`}
            onClick={() => setActiveSection(item.key)}
          >          
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="admin-sidebar-footer">
        <button 
          className="admin-logout-btn"
          onClick={onLogout}
        >
          <span className="nav-label">Выйти</span>
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar;