import React from 'react';
import NarrativeClient from './NarrativeClient';
import Navigation from './Navigation';
import './HomePage.css';

interface HomePageProps {
  currentUser: string;
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