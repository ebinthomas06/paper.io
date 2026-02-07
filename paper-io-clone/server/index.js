const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// --- CONSTANTS ---
const GRID_SIZE = 60; 
const COLORS = [
  '#FF0055', // Neon Red
  '#00D4FF', // Neon Blue
  '#CCFF00', // Neon Lime
  '#BD00FF', // Neon Purple
  '#FF9900', // Neon Orange
  '#00FF99', // Spring Green
  '#FFFF00', // Bright Yellow
  '#FF00CC', // Hot Pink
  '#00FFFF', // Cyan
  '#FF3333'  // Bright Cherry
];

// --- STATE ---
let players = {};
let grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null));

// --- LOGIC ---
function spawnPlayer(id, name) {
  const x = Math.floor(Math.random() * (GRID_SIZE - 10)) + 5;
  const y = Math.floor(Math.random() * (GRID_SIZE - 10)) + 5;

  // Smart Color Assignment: Pick a color not currently used
  const usedColors = new Set(Object.values(players).map(p => p.color));
  const availableColors = COLORS.filter(c => !usedColors.has(c));
  
  let color;
  if (availableColors.length > 0) {
    color = availableColors[Math.floor(Math.random() * availableColors.length)];
  } else {
    color = COLORS[Math.floor(Math.random() * COLORS.length)];
  }

  // Create 3x3 Starting Base
  for(let i=x-1; i<=x+1; i++) {
    for(let j=y-1; j<=y+1; j++) {
      grid[i][j] = { owner: id, color: color, type: 'land' };
    }
  }

  return {
    id, name, color,
    x, y,
    dx: 0, dy: 0, 
    nextDx: 0, nextDy: 0,
    tail: [],
    score: 9,
    dead: false,
    invulnerable: 60 // ~5 seconds of invulnerability
  };
}

// --- FLOOD FILL ALGO (With SQUASH Mechanic) ---
function fillTerritory(p) {
  // 1. Convert trail to temporary land
  p.tail.forEach(t => {
    if (grid[t.x] && grid[t.x][t.y]) {
      grid[t.x][t.y] = { owner: p.id, color: p.color, type: 'land' };
    }
  });
  p.tail = [];

  // 2. BFS to find "Safe" (Outside) cells
  const safe = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(false));
  const queue = [];

  // Start flood from map borders
  for (let i = 0; i < GRID_SIZE; i++) {
    queue.push({ x: i, y: 0 });
    queue.push({ x: i, y: GRID_SIZE - 1 });
    queue.push({ x: 0, y: i });
    queue.push({ x: GRID_SIZE - 1, y: i });
  }

  while (queue.length > 0) {
    const { x, y } = queue.shift();
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) continue;
    if (safe[x][y]) continue;

    // Stop flood at own land
    const cell = grid[x][y];
    if (cell && cell.owner === p.id && cell.type === 'land') continue;

    safe[x][y] = true;

    queue.push({ x: x + 1, y });
    queue.push({ x: x - 1, y });
    queue.push({ x, y: y + 1 });
    queue.push({ x, y: y - 1 });
  }

  // 3. Capture "Inside" cells & Check for Squashes
  let score = 0;
  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      if (!safe[x][y]) {
        // This cell is being captured!
        
        // --- SQUASH CHECK ---
        // If an enemy is standing here, they are trapped -> KILL THEM
        Object.values(players).forEach(enemy => {
          if (enemy.id !== p.id && !enemy.dead && enemy.x === x && enemy.y === y) {
             killPlayer(enemy, `SQUASHED by ${p.name}`);
          }
        });
        // --------------------

        grid[x][y] = { owner: p.id, color: p.color, type: 'land' };
      }
      if (grid[x][y] && grid[x][y].owner === p.id) score++;
    }
  }
  p.score = score;
}

function killPlayer(p, reason) {
  if (p.invulnerable > 0) return;
  
  console.log(`${p.name} died: ${reason}`);
  p.dead = true;
  
  // Clear their territory
  for(let x=0; x<GRID_SIZE; x++) {
    for(let y=0; y<GRID_SIZE; y++) {
      if (grid[x][y] && grid[x][y].owner === p.id) grid[x][y] = null;
    }
  }
  io.to(p.id).emit('gameOver', { reason });
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on('connection', (socket) => {
  socket.on('joinGame', (name) => {
    players[socket.id] = spawnPlayer(socket.id, name);
    socket.emit('init', { gridSize: GRID_SIZE });
  });

  socket.on('changeDirection', ({ dx, dy }) => {
    const p = players[socket.id];
    if (!p || p.dead) return;
    if (dx !== -p.dx || dy !== -p.dy) {
      p.nextDx = dx; p.nextDy = dy;
    }
  });

  socket.on('disconnect', () => {
    if(players[socket.id]) killPlayer(players[socket.id], 'Left');
    delete players[socket.id];
  });
});

// --- GAME LOOP ---
setInterval(() => {
  Object.values(players).forEach(p => {
    if (p.dead) return;
    if (p.invulnerable > 0) p.invulnerable--;

    // 1. Predict Next Spot
    const nextX = p.x + p.nextDx;
    const nextY = p.y + p.nextDy;

    // 2. Wall Collision -> Stop (Don't Die)
    if (nextX < 0 || nextX >= GRID_SIZE || nextY < 0 || nextY >= GRID_SIZE) {
      p.dx = 0; p.dy = 0; p.nextDx = 0; p.nextDy = 0;
      return; 
    }

    // 3. Self-Tail Collision
    const nextCell = grid[nextX][nextY];
    if (nextCell && nextCell.type === 'tail' && nextCell.owner === p.id) {
       // If currently stopped, ignore (allows reversing out of walls)
       if (p.dx === 0 && p.dy === 0) return; 
       
       killPlayer(p, 'Self Hit'); 
       return; 
    }

    // 4. Move
    p.dx = p.nextDx; p.dy = p.nextDy;
    p.x += p.dx; p.y += p.dy;

    const cell = grid[p.x][p.y];

    // 5. Enemy Tail Collision
    if (cell && cell.type === 'tail') {
      if (cell.owner !== p.id) {
        const enemy = Object.values(players).find(e => e.id === cell.owner);
        if (enemy) killPlayer(enemy, `Killed by ${p.name}`);
      } 
    }

    // 6. Draw Tail or Capture Land
    const isOwnLand = cell && cell.owner === p.id && cell.type === 'land';
    if (!isOwnLand) {
      if(p.dx !== 0 || p.dy !== 0) {
        grid[p.x][p.y] = { owner: p.id, color: p.color, type: 'tail' };
        p.tail.push({ x: p.x, y: p.y });
      }
    } else if (p.tail.length > 0) {
      fillTerritory(p);
    }
  });

  io.emit('gameState', { players: Object.values(players).filter(p=>!p.dead), grid });
}, 80); // 80ms = ~12.5 FPS (Balanced Speed)

// --- DEPLOYMENT: SERVE REACT BUILD ---
// This allows the Node server to host the Frontend (Single Service)
const buildPath = path.join(__dirname, '../build');
app.use(express.static(buildPath));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

server.listen(4000, () => console.log('SERVER RUNNING ON 4000'));