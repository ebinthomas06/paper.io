import React, { useState } from 'react';
import GameCanvas from './components/GameCanvas';

function App() {
  const [gameState, setGameState] = useState('MENU'); // MENU, PLAYING, GAME_OVER
  const [name, setName] = useState('');

  const startGame = () => {
    if (name.trim()) setGameState('PLAYING');
  };

  return (
    <div className="App">
      {/* START MENU */}
      {gameState === 'MENU' && (
        <div className="overlay">
          <div className="menu-card">
            <h1>PAPER.IO</h1>
            <p className="subtitle">CONQUER THE GRID</p>
            <input 
              placeholder="ENTER YOUR NAME" 
              maxLength={12}
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && startGame()}
            />
            <button onClick={startGame}>JOIN BATTLE</button>
          </div>
        </div>
      )}

      {/* GAME CANVAS */}
      {gameState === 'PLAYING' && (
        <GameCanvas 
          playerName={name} 
          onGameOver={() => setGameState('GAME_OVER')} 
        />
      )}

      {/* GAME OVER SCREEN */}
      {gameState === 'GAME_OVER' && (
        <div className="overlay">
          <div className="menu-card" style={{ borderColor: '#ff0055' }}>
            <h1 style={{ background: '#ff0055', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: '0 0 30px rgba(255,0,85,0.4)' }}>
              WASTED
            </h1>
            <p className="subtitle">YOU HIT A TRAIL OR WALL</p>
            <button onClick={() => setGameState('MENU')} style={{ background: '#334155' }}>
              MAIN MENU
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;