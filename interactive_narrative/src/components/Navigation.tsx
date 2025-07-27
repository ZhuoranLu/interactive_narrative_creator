import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User } from '../services/authService';
import './Navigation.css';

interface NavigationProps {
  currentUser: User | null;
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
          <ul className="nav-list">
            <li>
              <Link 
                to="/" 
                className={`nav-link ${isActive('/') ? 'active' : ''}`}
              >
                首页
              </Link>
            </li>
            <li>
              <Link 
                to="/about" 
                className={`nav-link ${isActive('/about') ? 'active' : ''}`}
              >
                关于
              </Link>
            </li>
            <li>
              <Link 
                to="/settings" 
                className={`nav-link ${isActive('/settings') ? 'active' : ''}`}
              >
                设置
              </Link>
            </li>
          </ul>
        </nav>
        <div className="user-info">
          {currentUser && (
            <div className="user-details">
              <span className="username">
                {currentUser.full_name || currentUser.username}
                {currentUser.is_premium && <span className="premium-badge">🌟</span>}
              </span>
              <span className="token-balance">
                {currentUser.token_balance} tokens
              </span>
            </div>
          )}
          <button 
            onClick={onLogout}
            className="logout-button"
          >
            登出
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navigation; 