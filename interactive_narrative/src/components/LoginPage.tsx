import React, { useState } from 'react';
import './LoginPage.css';

interface LoginPageProps {
  onLogin: (username: string, password: string) => void;
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
      await onLogin(username, password);
    } catch (err) {
      setError('登录失败，请检查用户名和密码');
    } finally {
      setIsLoading(false);
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
        
        <div className="login-footer">
          <p>还没有账户？ <a href="#register">注册</a></p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 