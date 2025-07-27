import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import LoginPage from './components/LoginPage';
import HomePage from './components/HomePage';
import AboutPage from './components/AboutPage';
import SettingsPage from './components/SettingsPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>('');

  const handleLogin = async (username: string, password: string) => {
    // 这里可以添加实际的登录验证逻辑
    // 目前作为演示，我们简单模拟登录过程
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        // 简单的演示验证：用户名和密码不为空即可登录
        if (username.trim() && password.trim()) {
          setCurrentUser(username);
          setIsLoggedIn(true);
          resolve();
        } else {
          reject(new Error('Invalid credentials'));
        }
      }, 1000); // 模拟网络请求延迟
    });
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser('');
  };

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* 登录路由 */}
          <Route 
            path="/login" 
            element={
              isLoggedIn ? (
                <Navigate to="/" replace />
              ) : (
                <LoginPage onLogin={handleLogin} />
              )
            } 
          />
          
          {/* 受保护的路由 */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute isAuthenticated={isLoggedIn}>
                <HomePage currentUser={currentUser} onLogout={handleLogout} />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/about" 
            element={
              <ProtectedRoute isAuthenticated={isLoggedIn}>
                <AboutPage currentUser={currentUser} onLogout={handleLogout} />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute isAuthenticated={isLoggedIn}>
                <SettingsPage currentUser={currentUser} onLogout={handleLogout} />
              </ProtectedRoute>
            } 
          />
          
          {/* 默认重定向 */}
          <Route 
            path="*" 
            element={
              isLoggedIn ? (
                <Navigate to="/" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;