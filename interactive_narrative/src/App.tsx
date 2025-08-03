import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import TemplateEditorRefactored from './components/TemplateEditorRefactored';
import LoginPage from './components/LoginPage';
import HomePage from './components/HomePage';
import GameSandbox from './components/GameSandbox';
import { authService, User } from './services/authService';

// 受保护的路由组件
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      // 验证token
      authService.getCurrentUser()
        .then(() => {
          setIsAuthenticated(true);
        })
        .catch(() => {
          authService.logout();
          navigate('/');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [navigate]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>加载中...</p>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
};

// 主应用组件
const AppContent = () => {
  const [user, setUser] = useState<User | null>(authService.getStoredUser());
  const navigate = useNavigate();

  const handleLogin = (user: User) => {
    setUser(user);
    navigate('/home');
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    navigate('/');
  };

  return (
    <Routes>
      <Route 
        path="/" 
        element={
          user ? <Navigate to="/home" replace /> : <LoginPage onLogin={handleLogin} />
        } 
      />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <HomePage currentUser={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/game-sandbox"
        element={
          <ProtectedRoute>
            <div>
              <div style={{ 
                backgroundColor: '#f7fafc', 
                padding: '8px 16px', 
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontWeight: 'bold' }}>游戏沙盒</span>
                <button 
                  onClick={handleLogout}
                  style={{
                    padding: '4px 8px',
                    fontSize: '14px',
                    backgroundColor: '#e53e3e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  退出登录
                </button>
              </div>
              <GameSandbox />
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/template-editor"
        element={
          <ProtectedRoute>
            <div>
              <div style={{ 
                backgroundColor: '#f7fafc', 
                padding: '8px 16px', 
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontWeight: 'bold' }}>模板编辑器</span>
                <button 
                  onClick={handleLogout}
                  style={{
                    padding: '4px 8px',
                    fontSize: '14px',
                    backgroundColor: '#e53e3e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  退出登录
                </button>
              </div>
              <TemplateEditorRefactored />
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/about"
        element={
          <ProtectedRoute>
            <div>
              <div style={{ 
                backgroundColor: '#f7fafc', 
                padding: '8px 16px', 
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontWeight: 'bold' }}>关于</span>
                <button 
                  onClick={handleLogout}
                  style={{
                    padding: '4px 8px',
                    fontSize: '14px',
                    backgroundColor: '#e53e3e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  退出登录
                </button>
              </div>
              <div style={{ padding: '20px' }}>
                <h2>Interactive Narrative Creator</h2>
                <p>这是一个交互式叙事创作平台，帮助用户创建和体验沉浸式的故事体验。</p>
              </div>
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <div>
              <div style={{ 
                backgroundColor: '#f7fafc', 
                padding: '8px 16px', 
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontWeight: 'bold' }}>设置</span>
                <button 
                  onClick={handleLogout}
                  style={{
                    padding: '4px 8px',
                    fontSize: '14px',
                    backgroundColor: '#e53e3e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  退出登录
                </button>
              </div>
              <div style={{ padding: '20px' }}>
                <h2>用户设置</h2>
                <p>设置页面正在开发中...</p>
              </div>
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/editor"
        element={
          <ProtectedRoute>
            <div>
              <div style={{ 
                backgroundColor: '#f7fafc', 
                padding: '8px 16px', 
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontWeight: 'bold' }}>Interactive Narrative Creator</span>
                <button 
                  onClick={handleLogout}
                  style={{
                    padding: '4px 8px',
                    fontSize: '14px',
                    backgroundColor: '#e53e3e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  退出登录
                </button>
              </div>
              <TemplateEditorRefactored />
            </div>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;