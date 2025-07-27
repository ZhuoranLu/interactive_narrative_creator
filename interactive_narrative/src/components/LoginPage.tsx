import React, { useState } from 'react';
import { authService, User } from '../services/authService';
import './LoginPage.css';

interface LoginPageProps {
  onLogin: (user: User) => void;
  onBack?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onBack }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const response = await authService.login({
        username: username.trim(),
        password: password
      });
      
      // Call parent's onLogin with user data
      onLogin(response.user);
    } catch (err) {
      console.error('Login error:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('登录失败，请检查用户名和密码');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Demo credentials helper
  const fillDemoCredentials = (userType: 'demo' | 'admin') => {
    if (userType === 'demo') {
      setUsername('demo_user');
      setPassword('demo123');
    } else {
      setUsername('admin');
      setPassword('admin123');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>登录</h2>
          <p>请输入您的用户名和密码</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">用户名</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              disabled={isLoading}
              autoComplete="username"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">密码</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              disabled={isLoading}
              autoComplete="current-password"
              required
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-actions">
            <button
              type="submit"
              className="login-button"
              disabled={isLoading}
            >
              {isLoading ? '登录中...' : '登录'}
            </button>
            
            {onBack && (
              <button
                type="button"
                className="back-button"
                onClick={onBack}
                disabled={isLoading}
              >
                返回
              </button>
            )}
          </div>
        </form>
        
        <div className="demo-credentials">
          <h4>测试账户</h4>
          <div className="demo-buttons">
            <button
              type="button"
              className="demo-button"
              onClick={() => fillDemoCredentials('demo')}
              disabled={isLoading}
            >
              填入Demo用户 (demo_user/demo123)
            </button>
            <button
              type="button"
              className="demo-button"
              onClick={() => fillDemoCredentials('admin')}
              disabled={isLoading}
            >
              填入管理员 (admin/admin123)
            </button>
          </div>
        </div>
        
        <div className="login-footer">
          <p>还没有账户？ <a href="#register">注册</a></p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 