const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// --- CONSTANTS ---
const GRID_SIZE = 60; 
const COLORS = [
  '#FF0055', '#00D4FF', '#CCFF00', '#BD00FF', '#FF9900',
  '#00FF99', '#FFFF00', '#FF00CC', '#00FFFF', '#FF3333' 
];

// --- STATE ---
let players = {};
let grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null));

// --- LOGIC ---
function spawnPlayer(id, name) {
  const x = Math.floor(Math.random() * (GRID_SIZE - 10)) + 5;
  const y = Math.floor(Math.random() * (GRID_SIZE - 10)) + 5;

  const usedColors = new Set(Object.values(players).map(p => p.color));
  const availableColors = COLORS.filter(c => !usedColors.has(c));
  const color = availableColors.length > 0 
    ? availableColors[Math.floor(Math.random() * availableColors.length)]
    : COLORS[Math.floor(Math.random() * COLORS.length)];

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
    invulnerable: 60
  };
}

// --- FLOOD FILL ALGO (Updated with SQUASH Mechanic) ---
function fillTerritory(p) {
  // 1. Convert trail to land
  p.tail.forEach(t => {
    if (grid[t.x] && grid[t.x][t.y]) {
      grid[t.x][t.y] = { owner: p.id, color: p.color, type: 'land' };
    }
  });
  p.tail = [];

  // 2. Flood Fill to find outside
  const safe = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(false));
  const queue = [];

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

    const cell = grid[x][y];
    if (cell && cell.owner === p.id && cell.type === 'land') continue;

    safe[x][y] = true;

    queue.push({ x: x + 1, y });
    queue.push({ x: x - 1, y });
    queue.push({ x, y: y + 1 });
    queue.push({ x, y: y - 1 });
  }

  // 3. Capture & CHECK FOR KILLS (The Squash Rule)
  let score = 0;
  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      if (!safe[x][y]) {
        // This cell is being captured!
        
        // --- NEW RULE: SQUASH CHECK ---
        // Check if any OTHER player is standing on this cell right now
        Object.values(players).forEach(enemy => {
          if (enemy.id !== p.id && !enemy.dead && enemy.x === x && enemy.y === y) {
             killPlayer(enemy, `SQUASHED by ${p.name}`);
          }
        });
        // ------------------------------

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
  
  for(let x=0; x<GRID_SIZE; x++) {
    for(let y=0; y<GRID_SIZE; y++) {
      if (grid[x][y] && grid[x][y].owner === p.id) grid[x][y] = null;
    }
  }
  io.to(p.id).emit('gameOver', { reason });
}

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

    const nextX = p.x + p.nextDx;
    const nextY = p.y + p.nextDy;

    // Wall Stop
    if (nextX < 0 || nextX >= GRID_SIZE || nextY < 0 || nextY >= GRID_SIZE) {
      p.dx = 0; p.dy = 0; p.nextDx = 0; p.nextDy = 0;
      return; 
    }

    // Self Hit Check
    const nextCell = grid[nextX][nextY];
    if (nextCell && nextCell.type === 'tail' && nextCell.owner === p.id) {
       if (p.dx === 0 && p.dy === 0) return; 
       killPlayer(p, 'Self Hit'); 
       return; 
    }

    // Move
    p.dx = p.nextDx; p.dy = p.nextDy;
    p.x += p.dx; p.y += p.dy;

    const cell = grid[p.x][p.y];

    // Enemy Tail Hit
    if (cell && cell.type === 'tail') {
      if (cell.owner !== p.id) {
        const enemy = Object.values(players).find(e => e.id === cell.owner);
        if (enemy) killPlayer(enemy, `Killed by ${p.name}`);
      } 
    }

    // Draw / Capture
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
}, 80); 

server.listen(4000, () => console.log('SERVER RUNNING ON 4000'));