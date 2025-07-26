import React from 'react';
import './App.css';
import NarrativeClient from './components/NarrativeClient';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Interactive Narrative Creator</h1>
        <NarrativeClient />
      </header>
    </div>
  );
}

export default App;