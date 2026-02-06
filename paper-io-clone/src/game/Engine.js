export const GRID_SIZE = 60; 
export const CELL_SIZE = 20;

const COLORS = ['#FF0055', '#00D4FF', '#CCFF00', '#BD00FF', '#FF9900'];

export class GameEngine {
  constructor(playerName, setLeaderboard, onGameOver) {
    this.grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null));
    this.players = [];
    this.running = true;
    this.setLeaderboard = setLeaderboard;
    this.onGameOver = onGameOver;

    // Spawn Human
    this.spawnPlayer(playerName, true);
    
    // Spawn Bots
    for(let i=0; i<8; i++) this.spawnPlayer(`Bot ${i+1}`, false);
  }

  spawnPlayer(name, isHuman) {
    const x = Math.floor(Math.random() * (GRID_SIZE - 10)) + 5;
    const y = Math.floor(Math.random() * (GRID_SIZE - 10)) + 5;
    const id = Math.random().toString(36).substr(2, 9);
    const color = COLORS[this.players.length % COLORS.length];

    // Initial Safe Territory (3x3)
    for(let i=x-1; i<=x+1; i++) {
      for(let j=y-1; j<=y+1; j++) {
        if(this.grid[i] && this.grid[i][j] !== undefined) {
             this.grid[i][j] = { owner: id, color: color, type: 'land' };
        }
      }
    }

    this.players.push({
      id, name, isHuman, color,
      x, y,
      dx: 1, dy: 0,
      nextDx: 1, nextDy: 0,
      tail: [],
      score: 9,
      dead: false,
      invulnerable: isHuman ? 180 : 0 // ~3 Seconds (60 frames * 3)
    });
  }

  update() {
    if (!this.running) return;

    this.players.forEach(p => {
      if (p.dead) return;

      // Decrease invulnerability timer
      if (p.invulnerable > 0) p.invulnerable--;

      // Move
      p.dx = p.nextDx;
      p.dy = p.nextDy;
      p.x += p.dx;
      p.y += p.dy;

      // 1. Wall Death Check
      if (p.x < 0 || p.x >= GRID_SIZE || p.y < 0 || p.y >= GRID_SIZE) {
        this.killPlayer(p, 'WALL HIT');
        return;
      }

      const cell = this.grid[p.x][p.y];

      // 2. Trail Collision
      if (cell && cell.type === 'tail') {
         if (cell.owner !== p.id) {
           const enemy = this.players.find(e => e.id === cell.owner);
           if (enemy) this.killPlayer(enemy, 'KILLED BY ' + p.name);
         } else {
           // Hit own tail
           this.killPlayer(p, 'SELF HIT'); 
           return;
         }
      }

      // 3. Draw Trail / Capture
      const isOwnLand = cell && cell.owner === p.id && cell.type === 'land';
      
      if (!isOwnLand) {
        this.grid[p.x][p.y] = { owner: p.id, color: p.color, type: 'tail' };
        p.tail.push({ x: p.x, y: p.y });
      } else if (p.tail.length > 0) {
        this.fillTerritory(p);
      }

      if (!p.isHuman) this.updateBot(p);
    });

    this.updateLeaderboard();
  }

  updateBot(bot) {
    if (Math.random() < 0.1) {
      const dirs = [[0,1], [0,-1], [1,0], [-1,0]];
      const [ndx, ndy] = dirs[Math.floor(Math.random() * dirs.length)];
      if (ndx !== -bot.dx || ndy !== -bot.dy) {
        bot.nextDx = ndx; bot.nextDy = ndy;
      }
    }
  }

  fillTerritory(p) {
    p.tail.forEach(t => {
      if(this.grid[t.x] && this.grid[t.x][t.y]) {
        this.grid[t.x][t.y] = { owner: p.id, color: p.color, type: 'land' };
      }
    });
    p.tail = [];
    
    // Simple Box Fill for MVP
    let minX = GRID_SIZE, maxX = 0, minY = GRID_SIZE, maxY = 0;
    for(let x=0; x<GRID_SIZE; x++) {
      for(let y=0; y<GRID_SIZE; y++) {
        if(this.grid[x][y] && this.grid[x][y].owner === p.id) {
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        }
      }
    }
    
    let score = 0;
    for(let x=minX; x<=maxX; x++) {
      for(let y=minY; y<=maxY; y++) {
        if (!this.grid[x][y]) {
           this.grid[x][y] = { owner: p.id, color: p.color, type: 'land' };
        }
        if (this.grid[x][y] && this.grid[x][y].owner === p.id) score++;
      }
    }
    p.score = score;
  }

  killPlayer(p, reason) {
    if (p.invulnerable > 0) return; // God Mode active
    
    console.log(`${p.name} died. Reason: ${reason}`); // Debugging
    p.dead = true;
    
    // Clear Territory
    for(let x=0; x<GRID_SIZE; x++) {
      for(let y=0; y<GRID_SIZE; y++) {
        if (this.grid[x][y] && this.grid[x][y].owner === p.id) {
          this.grid[x][y] = null;
        }
      }
    }

    if (p.isHuman) {
      this.running = false;
      this.onGameOver();
    }
  }

  updateLeaderboard() {
    const sorted = this.players.filter(p => !p.dead).sort((a,b) => b.score - a.score).slice(0, 5);
    this.setLeaderboard(sorted);
  }
}