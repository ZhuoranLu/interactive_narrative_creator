import React, { useState, useEffect } from 'react';
import Navigation from './Navigation';
import { User, authService } from '../services/authService';
import './SettingsPage.css';

interface SettingsPageProps {
  currentUser: User | null;
  onLogout: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ currentUser, onLogout }) => {
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Load token balance on component mount
  useEffect(() => {
    const loadTokenBalance = async () => {
      if (!currentUser) return;
      
      try {
        setIsLoading(true);
        const response = await authService.getTokenBalance();
        setTokenBalance(response.token_balance);
      } catch (err) {
        console.error('Failed to load token balance:', err);
        setError('无法加载Token余额');
      } finally {
        setIsLoading(false);
      }
    };

    loadTokenBalance();
  }, [currentUser]);

  if (!currentUser) {
    return null;
  }

  return (
    <div className="settings-page">
      <Navigation currentUser={currentUser} onLogout={onLogout} />
      <main className="settings-content">
        <div className="container">
          <h1>用户设置</h1>
          
          <section className="user-profile-section">
            <h2>个人资料</h2>
            <div className="profile-info">
              <div className="info-row">
                <label>用户名:</label>
                <span>{currentUser.username}</span>
              </div>
              <div className="info-row">
                <label>邮箱:</label>
                <span>{currentUser.email}</span>
              </div>
              <div className="info-row">
                <label>全名:</label>
                <span>{currentUser.full_name || '未设置'}</span>
              </div>
              <div className="info-row">
                <label>账户状态:</label>
                <span className={`status ${currentUser.is_active ? 'active' : 'inactive'}`}>
                  {currentUser.is_active ? '活跃' : '未激活'}
                </span>
              </div>
              <div className="info-row">
                <label>邮箱验证:</label>
                <span className={`status ${currentUser.is_verified ? 'verified' : 'unverified'}`}>
                  {currentUser.is_verified ? '已验证' : '未验证'}
                </span>
              </div>
              <div className="info-row">
                <label>会员类型:</label>
                <span className={`membership ${currentUser.is_premium ? 'premium' : 'standard'}`}>
                  {currentUser.is_premium ? '🌟 Premium' : '🔓 Standard'}
                </span>
              </div>
              <div className="info-row">
                <label>注册时间:</label>
                <span>{new Date(currentUser.created_at).toLocaleDateString('zh-CN')}</span>
              </div>
            </div>
          </section>

          <section className="token-section">
            <h2>Token管理</h2>
            <div className="token-info">
              <div className="token-balance">
                <h3>当前余额</h3>
                {isLoading ? (
                  <div className="loading">加载中...</div>
                ) : error ? (
                  <div className="error">{error}</div>
                ) : (
                  <div className="balance-display">
                    {tokenBalance !== null ? tokenBalance : currentUser.token_balance} tokens
                  </div>
                )}
              </div>
              <div className="token-actions">
                <button className="btn-primary" disabled>
                  购买Token (即将推出)
                </button>
                <button className="btn-secondary" disabled>
                  使用记录 (即将推出)
                </button>
              </div>
            </div>
          </section>

          <section className="account-section">
            <h2>账户操作</h2>
            <div className="account-actions">
              <button className="btn-secondary" disabled>
                修改密码
              </button>
              <button className="btn-secondary" disabled>
                更新资料
              </button>
              <button className="btn-danger" onClick={onLogout}>
                退出登录
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage; 