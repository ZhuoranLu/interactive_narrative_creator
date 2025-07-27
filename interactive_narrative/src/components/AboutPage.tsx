import React from 'react';
import Navigation from './Navigation';
import { User } from '../services/authService';
import './AboutPage.css';

interface AboutPageProps {
  currentUser: User | null;
  onLogout: () => void;
}

const AboutPage: React.FC<AboutPageProps> = ({ currentUser, onLogout }) => {
  return (
    <div className="about-page">
      <Navigation currentUser={currentUser} onLogout={onLogout} />
      <main className="about-content">
        <div className="container">
          <h1>关于交互式叙事创作工具</h1>
          
          <section className="intro-section">
            <h2>项目简介</h2>
            <p>
              交互式叙事创作工具是一个创新的平台，帮助作家、游戏开发者和创意工作者
              创造引人入胜的交互式故事体验。通过我们的直观界面，您可以构建复杂的
              叙事分支，让读者在故事中做出选择，影响情节的发展。
            </p>
          </section>

          <section className="features-section">
            <h2>核心功能</h2>
            <div className="features-grid">
              <div className="feature-card">
                <h3>🌿 分支叙事</h3>
                <p>创建多分支故事线，让每个选择都产生意义</p>
              </div>
              <div className="feature-card">
                <h3>🎨 可视化编辑</h3>
                <p>直观的图形界面，轻松管理复杂的故事结构</p>
              </div>
              <div className="feature-card">
                <h3>🤖 AI 辅助</h3>
                <p>智能写作助手，帮助生成创意内容和故事片段</p>
              </div>
              <div className="feature-card">
                <h3>📊 数据分析</h3>
                <p>追踪读者行为，优化故事体验</p>
              </div>
            </div>
          </section>

          <section className="tech-section">
            <h2>技术栈</h2>
            <ul className="tech-list">
              <li><strong>前端：</strong>React + TypeScript</li>
              <li><strong>后端：</strong>FastAPI + Python</li>
              <li><strong>数据库：</strong>PostgreSQL</li>
              <li><strong>AI集成：</strong>OpenAI GPT模型</li>
            </ul>
          </section>

          <section className="contact-section">
            <h2>联系我们</h2>
            <p>如果您有任何问题或建议，请随时与我们联系：</p>
            <ul className="contact-list">
              <li>📧 邮箱：info@narrative-creator.com</li>
              <li>🐙 GitHub：github.com/narrative-creator</li>
              <li>💬 Discord：discord.gg/narrative-creator</li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
};

export default AboutPage; 