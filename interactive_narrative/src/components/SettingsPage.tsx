import React, { useState } from 'react';
import Navigation from './Navigation';
import './SettingsPage.css';

interface SettingsPageProps {
  currentUser: string;
  onLogout: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ currentUser, onLogout }) => {
  const [settings, setSettings] = useState({
    notifications: true,
    autoSave: true,
    theme: 'dark',
    language: 'zh-CN'
  });

  const handleSettingChange = (key: string, value: boolean | string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSettings = () => {
    // 这里可以添加保存设置的逻辑
    alert('设置已保存！');
  };

  return (
    <div className="settings-page">
      <Navigation currentUser={currentUser} onLogout={onLogout} />
      
      <main className="settings-content">
        <div className="settings-card">
          <h2>用户设置</h2>
          
          <div className="settings-section">
            <h3>通知设置</h3>
            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                />
                <span className="setting-text">启用通知</span>
              </label>
            </div>
          </div>

          <div className="settings-section">
            <h3>编辑器设置</h3>
            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={settings.autoSave}
                  onChange={(e) => handleSettingChange('autoSave', e.target.checked)}
                />
                <span className="setting-text">自动保存</span>
              </label>
            </div>
          </div>

          <div className="settings-section">
            <h3>外观设置</h3>
            <div className="setting-item">
              <label className="setting-label">
                <span className="setting-text">主题</span>
                <select
                  value={settings.theme}
                  onChange={(e) => handleSettingChange('theme', e.target.value)}
                  className="setting-select"
                >
                  <option value="dark">深色</option>
                  <option value="light">浅色</option>
                  <option value="auto">自动</option>
                </select>
              </label>
            </div>
          </div>

          <div className="settings-section">
            <h3>语言设置</h3>
            <div className="setting-item">
              <label className="setting-label">
                <span className="setting-text">语言</span>
                <select
                  value={settings.language}
                  onChange={(e) => handleSettingChange('language', e.target.value)}
                  className="setting-select"
                >
                  <option value="zh-CN">中文</option>
                  <option value="en-US">English</option>
                  <option value="ja-JP">日本語</option>
                </select>
              </label>
            </div>
          </div>

          <div className="settings-actions">
            <button onClick={handleSaveSettings} className="save-button">
              保存设置
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage; 