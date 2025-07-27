import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navigation.css';

interface NavigationProps {
  currentUser: string;
  onLogout: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentUser, onLogout }) => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className="main-header">
      <div className="header-content">
        <div className="logo">
          <Link to="/" className="logo-link">
            <h1>Interactive Narrative Creator</h1>
          </Link>
        </div>
        <nav className="main-navigation">
          <Link 
            to="/" 
            className={`nav-link ${isActive('/') ? 'active' : ''}`}
          >
            首页
          </Link>
          <Link 
            to="/about" 
            className={`nav-link ${isActive('/about') ? 'active' : ''}`}
          >
            关于
          </Link>
          <Link 
            to="/settings" 
            className={`nav-link ${isActive('/settings') ? 'active' : ''}`}
          >
            设置
          </Link>
        </nav>
        <div className="user-info">
          <span className="user-name">欢迎, {currentUser}</span>
          <button onClick={onLogout} className="logout-button">
            退出登录
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navigation; 