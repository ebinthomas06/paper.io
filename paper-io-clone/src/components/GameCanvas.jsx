import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const CELL_SIZE = 20;

export default function GameCanvas({ playerName, onGameOver }) {
  const canvasRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myScore, setMyScore] = useState(0); 
  
  useEffect(() => {
    // Note: If testing on mobile, replace 'localhost' with your laptop's IP address (e.g., '192.168.1.5')
    const newSocket = io('http://172.16.198.109:4000'); 
    setSocket(newSocket);
    newSocket.emit('joinGame', playerName);
    newSocket.on('gameOver', () => onGameOver());
    return () => newSocket.close();
  }, [playerName, onGameOver]);

  // Helper to send moves (Used by Keyboard AND Touch)
  const sendMove = (dx, dy) => {
    if (socket) socket.emit('changeDirection', { dx, dy });
  };

  useEffect(() => {
    if (!socket) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Fullscreen for mobile
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    socket.on('gameState', ({ players, grid }) => {
      const me = players.find(p => p.id === socket.id);
      if (me) setMyScore(me.score); 

      // 1. Background
      ctx.fillStyle = '#0f172a'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // --- NEW CAMERA LOGIC (ZOOM OUT ON MOBILE) ---
      const isMobile = window.innerWidth < 768; // Check if mobile
      const zoom = isMobile ? 0.6 : 1; // 0.6 means 60% zoom (sees more map)

      ctx.save();

      if (me) {
        // 1. Move origin to center of screen
        ctx.translate(canvas.width / 2, canvas.height / 2);
        
        // 2. Apply Zoom
        ctx.scale(zoom, zoom);
        
        // 3. Move world so player is at (0,0) relative to screen center
        // This centers the camera perfectly on the player
        ctx.translate(-me.x * CELL_SIZE - CELL_SIZE / 2, -me.y * CELL_SIZE - CELL_SIZE / 2);
      }

      // 2. Grid
      ctx.strokeStyle = '#1e293b'; 
      ctx.lineWidth = 1;
      ctx.beginPath();
      for(let i=0; i <= grid.length; i++) {
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, grid.length * CELL_SIZE);
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(grid.length * CELL_SIZE, i * CELL_SIZE);
      }
      ctx.stroke();

      // 3. Borders
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#00d4ff';
      ctx.strokeRect(0, 0, grid.length * CELL_SIZE, grid.length * CELL_SIZE);
      ctx.shadowBlur = 0; 

      // 4. Territory
      for (let x = 0; x < grid.length; x++) {
        for (let y = 0; y < grid.length; y++) {
          const cell = grid[x][y];
          if (cell) {
            ctx.fillStyle = cell.color;
            ctx.globalAlpha = cell.type === 'tail' ? 0.4 : 1.0; 
            ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            ctx.globalAlpha = 1.0;
          }
        }
      }

      // 5. Players
      players.forEach(p => {
        ctx.fillStyle = '#fff';
        if (p.invulnerable > 0 && Math.floor(Date.now() / 100) % 2 === 0) {
           ctx.fillStyle = 'rgba(255,255,255,0.3)';
        }
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 15;
        ctx.fillRect(p.x * CELL_SIZE, p.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Poppins';
        ctx.textAlign = 'center';
        ctx.fillText(p.name, p.x * CELL_SIZE + 10, p.y * CELL_SIZE - 8);
      });

      ctx.restore();
      setLeaderboard(players.sort((a,b) => b.score - a.score).slice(0, 5));
    });

    const handleKey = (e) => {
        if (e.key === 'ArrowUp') sendMove(0, -1);
        if (e.key === 'ArrowDown') sendMove(0, 1);
        if (e.key === 'ArrowLeft') sendMove(-1, 0);
        if (e.key === 'ArrowRight') sendMove(1, 0);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [socket]);

  // Prevent default touch behaviors (scrolling)
  const touchHandler = (e, dx, dy) => {
    e.preventDefault(); // Stop scroll
    sendMove(dx, dy);
  };

  return (
    <>
      <canvas ref={canvasRef} />
      
      <div className="my-score">
        SCORE: {myScore}
      </div>

      <div className="leaderboard">
        <h3>LEADERBOARD</h3>
        {leaderboard.map((p, i) => (
          <div key={i} className="leaderboard-item">
            <span className={`rank rank-${i + 1}`}>{i + 1}</span>
            <span className="name" style={{ color: p.color }}>{p.name}</span>
            <span className="score">{p.score}</span>
          </div>
        ))}
      </div>

      {/* --- MOBILE CONTROLS --- */}
      <div className="mobile-controls">
        <button className="dpad-btn up" onTouchStart={(e) => touchHandler(e, 0, -1)}>▲</button>
        <div className="dpad-row">
          <button className="dpad-btn left" onTouchStart={(e) => touchHandler(e, -1, 0)}>◀</button>
          <button className="dpad-btn down" onTouchStart={(e) => touchHandler(e, 0, 1)}>▼</button>
          <button className="dpad-btn right" onTouchStart={(e) => touchHandler(e, 1, 0)}>▶</button>
        </div>
      </div>
    </>
  );
}