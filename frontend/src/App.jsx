import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import Login from './components/Login';
import Register from './components/Register';
import WordSetList from './components/WordSetList';
import ChoiceGame from './components/ChoiceGame';
import TypingGame from './components/TypingGame';
import ListeningGame from './components/ListeningGame';
import UserProfile from './components/UserProfile';
import Footer from './components/Footer';
import { userAPI, authAPI } from './services/api';
import HelpPage from './components/HelpPage';
import TermsPage from './components/TermsPage';
import PrivacyPage from './components/PrivacyPage';
import ChoiceGamePage from './components/ChoiceGamePage';
import TypingGamePage from './components/TypingGamePage';
import ListeningGamePage from './components/ListeningGamePage';
import AchievementsPage from './components/AchievementsPage';
import AdminPanel from './components/AdminPanel';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
   const savedUser = sessionStorage.getItem('user');
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        console.log('✅ Пользователь восстановлен из сессии:', userData);
      } else {
        console.log('ℹ️ Пользователь не найден в сессии');
        setUser(null);
      }
    } catch (error) {
      console.error('❌ Ошибка при проверке сессии:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };
  const handleLogin = async (userData) => {
    try {
      console.log('🔄 Processing login for:', userData);
      
      if (userData.username === 'admin' && userData.role === 'admin') {
        console.log('🔑 Admin login detected');
        const adminUser = {
          id: 1,
          username: 'admin',
          role: 'admin',
          email: 'admin@system.com',
          display_name: 'Administrator'
        };
        setUser(adminUser);
        sessionStorage.setItem('user', JSON.stringify(adminUser));
        return adminUser;
      }

      const response = await userAPI.getUser(userData.id);
      if (response.data.success) {
        const fullUserData = response.data.user;
        console.log('✅ User login successful:', fullUserData);
        setUser(fullUserData);
        sessionStorage.setItem('user', JSON.stringify(fullUserData));
        return fullUserData;
      }
    } catch (error) {
      console.error('Error getting user data after login:', error);
      setUser(userData);
      sessionStorage.setItem('user', JSON.stringify(userData));
      return userData;
    }
  };

  const handleRegister = async (userData) => {
    try {
      setUser(userData);
      sessionStorage.setItem('user', JSON.stringify(userData));
      return userData;
    } catch (error) {
      console.error('Error during registration:', error);
      setUser(userData);
      sessionStorage.setItem('user', JSON.stringify(userData));
      return userData;
    }
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
    sessionStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const handleLogout = async () => {
    try {
 await authAPI.logout();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      setUser(null);
      sessionStorage.removeItem('user');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading">Загрузка...</div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/admin/*" 
            element={
              user && user.role === 'admin' ? (
                <AdminLayout>
                  <AdminPanel onLogout={handleLogout} />
                </AdminLayout>
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />

       
          <Route path="/*" element={
            <MainLayout user={user} onLogout={handleLogout}>
              <Routes>
                <Route path="/" element={<Hero user={user} />} />
                <Route 
                  path="/achievements" 
                  element={
                    user ? <AchievementsPage /> : <Navigate to="/login" replace />
                  } 
                />
                <Route path="/sets" element={<WordSetList />} />
                <Route 
                  path="/login" 
                  element={
                    !user ? (
                      <Login onLogin={handleLogin} />
                    ) : user.role === 'admin' ? (
                      <Navigate to="/admin" replace />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  } 
                />
                <Route 
                  path="/register" 
                  element={
                    !user ? (
                      <Register onRegister={handleRegister} />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  } 
                />
                <Route 
                  path="/profile" 
                  element={
                    user ? (
                      <UserProfile user={user} onUserUpdate={handleUserUpdate} />
                    ) : (
                      <Navigate to="/login" replace />
                    )
                  } 
                />
                <Route 
                  path="/games/choice" 
                  element={
                    user ? <ChoiceGamePage /> : <Navigate to="/login" replace />
                  } 
                />
                <Route 
                  path="/games/typing" 
                  element={
                    user ? <TypingGamePage /> : <Navigate to="/login" replace />
                  } 
                />
                <Route 
                  path="/games/listening" 
                  element={
                    user ? <ListeningGamePage /> : <Navigate to="/login" replace />
                  } 
                />
                <Route 
                  path="/game/choice/:setId" 
                  element={
                    user ? <ChoiceGame /> : <Navigate to="/login" replace />
                  } 
                />
                <Route 
                  path="/game/typing/:setId" 
                  element={
                    user ? <TypingGame /> : <Navigate to="/login" replace />
                  } 
                />
                <Route 
                  path="/game/listening/:setId" 
                  element={
                    user ? <ListeningGame /> : <Navigate to="/login" replace />
                  } 
                />
                <Route path="/help" element={<HelpPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </MainLayout>
          } />
        </Routes>
      </div>
    </Router>
  );
}

const MainLayout = ({ user, onLogout, children }) => {
  return (
    <div className="main-layout">
      <Header user={user} onLogout={onLogout} />
      <main className="main-content">
        {children}
      </main>
      <Footer />
    </div>
  );
};

const AdminLayout = ({ children }) => {
  return (
    <div className="admin-layout">
      <main className="main-content admin-layout">
        {children}
      </main>
    </div>
  );
};

export default App;