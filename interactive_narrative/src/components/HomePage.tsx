import React from 'react';
import NarrativeClient from './NarrativeClient';
import Navigation from './Navigation';
import { User } from '../services/authService';
import './HomePage.css';

interface HomePageProps {
  currentUser: User | null;
  onLogout: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ currentUser, onLogout }) => {
  return (
    <div className="home-page">
      <Navigation currentUser={currentUser} onLogout={onLogout} />
      <main className="home-content">
        <NarrativeClient />
      </main>
    </div>
  );
};

export default HomePage; 