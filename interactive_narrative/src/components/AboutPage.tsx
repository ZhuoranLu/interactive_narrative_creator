import React from 'react';
import Navigation from './Navigation';
import './AboutPage.css';

interface AboutPageProps {
  currentUser: string;
  onLogout: () => void;
}

const AboutPage: React.FC<AboutPageProps> = ({ currentUser, onLogout }) => {
  return (
    <div className="about-page">
      <Navigation currentUser={currentUser} onLogout={onLogout} />
      
      <main className="about-content">
        <div className="about-card">
          <h2>Interactive Narrative Creator</h2>
          <p>
            这是一个交互式叙事创作工具，帮助用户创建和管理复杂的交互式故事。
          </p>
          <div className="features">
            <h3>主要功能：</h3>
            <ul>
              <li>🎯 交互式故事创作</li>
              <li>📖 多分支叙事管理</li>
              <li>👥 用户认证系统</li>
              <li>🎨 现代化界面设计</li>
              <li>📱 响应式布局</li>
            </ul>
          </div>
          <div className="tech-stack">
            <h3>技术栈：</h3>
            <div className="tech-badges">
              <span className="tech-badge">React</span>
              <span className="tech-badge">TypeScript</span>
              <span className="tech-badge">React Router</span>
              <span className="tech-badge">CSS3</span>
              <span className="tech-badge">Vite</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AboutPage; 