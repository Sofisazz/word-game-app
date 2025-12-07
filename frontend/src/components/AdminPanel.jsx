import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminStatistics from './AdminStatistics';
import WordSets from './WordSets';
import UserManagement from './UserManagement';
import './AdminPanel.css';

const AdminPanel = ({ onLogout }) => {
  const [activeSection, setActiveSection] = useState('statistics');
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'statistics':
        return <AdminStatistics />;
      case 'word-sets':
        return <WordSets />;
      case 'users':
        return <UserManagement />;
      default:
        return <AdminStatistics />;
    }
  };

  return (
    <div className="admin-panel">
      <AdminSidebar 
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        onLogout={handleLogout}
      />
      <div className="admin-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default AdminPanel;