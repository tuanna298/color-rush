import bgMusic1 from '../../assets/audios/bgMusic1.mp3';
import diffChangeAlertMusic from '../../assets/audios/diff-change-alert.mp3';
import wrongBuzzer from '../../assets/audios/wrong-buzzer.mp3';
import { GameEngine } from './game-engine.js';
import { EntityManager } from './entity-manager.js';
import { Spawner } from './spawner.js';
import { Environment } from './environment.js';

export class ColorZoneGame {
  constructor() {
    this.backgroundMusicList = [bgMusic1];

    // DOM Elements
    this.elements = {
      car: document.getElementById('car'),
      scoreElement: document.getElementById('score'),
      highScoreElement: document.getElementById('highest-score-display'),
      energyFill: document.getElementById('energy-bar-fill'),
      gameOverScreen: document.getElementById('game-over'),
      finalScoreElement: document.getElementById('final-score'),
      restartButton: document.getElementById('restart-button'),
      linesContainer: document.getElementById('lines-container'),
      road: document.getElementById('road'),
      hudStats: document.getElementById('hud-stats'),
    };

    // Initialize Sub-Systems
    this.engine = new GameEngine({
      speed: 8, // Increased base speed a bit
      maxSpeed: 30
    });
    this.em = new EntityManager(this.engine);
    this.spawner = new Spawner(this.engine, this.em);
    this.env = new Environment(this.engine);

    // Register systems
    this.engine.addSystem(this.em);
    this.engine.addSystem(this.spawner);
    this.engine.addSystem(this.env);

    this.engine.addSystem({
      update: (state, timeScale) => this.animateRoadLines(state.currentSpeed)
    });

    this.engine.onGameOver = (score) => this.handleGameOver(score);

    // Initial State
    this.currentLane = 1; // 0: Left, 1: Center, 2: Right
    this.targetLane = 1;
    this.isChangingLane = false;

    // Bindings
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleRestart = this.handleRestart.bind(this);
    this.loop = this.loop.bind(this);
  }

  init() {
    const playerNameModal = document.getElementById('player-name-modal');
    const playerNameInput = document.getElementById('player-name-input');
    const startGameButton = document.getElementById('start-game-button');

    let playerName = localStorage.getItem('playerName');
    if (!playerName) {
      playerName = `Player_${Math.floor(Math.random() * 1000)}`;
      localStorage.setItem('playerName', playerName);
    }
    playerNameInput.value = playerName;
    playerNameModal.style.display = 'flex';

    startGameButton.addEventListener('click', () => {
      const newPlayerName = playerNameInput.value.trim() || playerName;
      localStorage.setItem('playerName', newPlayerName);
      playerNameModal.style.display = 'none';
      this.setupEventListeners();
      this.start();
    });
  }

  setupEventListeners() {
    const assistCheckbox = document.getElementById('assist-checkbox');
    if (assistCheckbox) {
      // Disable assist for V2 or repurpose it? For now, let's just keep it but it might not do much with discrete lanes.
      // Actually, let's hide it or ignore it for the discrete lane version which is simpler.
    }

    document.addEventListener('keydown', this.handleKeyDown);
    // KeyUp is less relevant for discrete taps but we keep it for consistency
    document.addEventListener('keyup', this.handleKeyUp);
    this.elements.restartButton.addEventListener('click', this.handleRestart);

    // Touch Controls
    const leftZone = document.getElementById('touch-controls-left');
    const rightZone = document.getElementById('touch-controls-right');

    const handleInput = (direction) => (e) => {
      e.preventDefault();
      if (direction === 'left') this.moveCar(-1);
      if (direction === 'right') this.moveCar(1);
    };

    if (leftZone && rightZone) {
      leftZone.addEventListener('touchstart', handleInput('left'), { passive: false });
      rightZone.addEventListener('touchstart', handleInput('right'), { passive: false });

      // Mouse fallback
      leftZone.addEventListener('mousedown', handleInput('left'));
      rightZone.addEventListener('mousedown', handleInput('right'));
    }
  }

  start() {
    this.em.clearAll();
    // Reset Engine State completely
    this.engine.reset();

    this.engine.state.score = 0;
    this.engine.state.energy = 100;
    this.engine.state.distance = 0;
    this.engine.state.currentSpeed = 7;
    // Clear effects UI
    const effectsContainer = document.getElementById('active-effects-container');
    if (effectsContainer) effectsContainer.innerHTML = '';

    this.elements.scoreElement.textContent = 'SCORE: 0';
    this.updateEnergyFoo(100);
    this.elements.gameOverScreen.style.display = 'none';
    this.createRoadLines();
    this.playMusic();

    // Reset Car
    this.currentLane = 1;
    this.targetLane = 1;
    this.updateCarPosition();

    this.engine.start();
    this.visualLoopId = requestAnimationFrame(this.loop);
  }

  loop() {
    if (!this.engine.state.isRunning) return;

    this.elements.scoreElement.textContent = `SCORE: ${Math.floor(this.engine.state.score)}`;
    this.updateEnergyFoo(this.engine.state.energy);

    // Update Active Effects UI
    this.updateActiveEffectsUI();

    // Handle Visual Side Effects of State
    if (this.engine.state.activeEffects['BLIND']) document.body.classList.add('blind-mode');
    else document.body.classList.remove('blind-mode');

    if (this.engine.state.activeEffects['NIGHT']) document.body.classList.add('night-mode');
    else document.body.classList.remove('night-mode');

    if (this.engine.state.activeEffects['FLASH']) document.body.classList.add('flash-mode');
    else document.body.classList.remove('flash-mode');


    // Check Collision using Physics AABB
    const hits = this.em.checkCollision(this.elements.car);
    hits.forEach(entity => {
      if (entity.onCollide) {
        entity.onCollide(entity, this.engine.state);

        // Visual Feedback for Items (Pop-up text)
        if (entity.type === 'item') {
          this.showItemFeedback(entity.data.item);
        }
      }
    });

    this.visualLoopId = requestAnimationFrame(this.loop);
  }

  moveCar(direction) {
    // Direction: -1 (Left), 1 (Right)
    const newLane = this.currentLane + direction;

    // Constrain to 0-2
    if (newLane >= 0 && newLane <= 2) {
      this.currentLane = newLane;
      this.updateCarPosition(direction);
    }
  }

  updateCarPosition(moveInfo = 0) {
    // 3 Lanes:
    // Lane 0: Center at 16.66%
    // Lane 1: Center at 50%
    // Lane 2: Center at 83.33%
    const centerPercentages = [16.66, 50, 83.33];
    const targetX = centerPercentages[this.currentLane];

    this.elements.car.style.left = `calc(${targetX}% - 25px)`; // -25px is half of car width (50px)

    // Tilt Logic
    // If moving left (-1), tilt left (negative deg)
    // If moving right (1), tilt right (positive deg)
    if (moveInfo !== 0) {
      const tiltDeg = moveInfo * 15;
      this.elements.car.style.transform = `rotate(${tiltDeg}deg)`;

      // Reset tilt after short delay (animation duration)
      clearTimeout(this.tiltTimeout);
      this.tiltTimeout = setTimeout(() => {
        if (this.elements.car) this.elements.car.style.transform = `rotate(0deg)`;
      }, 200);
    } else {
      this.elements.car.style.transform = `rotate(0deg)`;
    }
  }

  updateActiveEffectsUI() {
    let container = document.getElementById('active-effects-container');
    if (!container) return; // Should be added to HTML

    // Simple diffing or just rebuild (rebuild is fine for small num effects)
    container.innerHTML = '';

    const effects = this.engine.state.activeEffects;
    Object.entries(effects).forEach(([name, data]) => {
      const el = document.createElement('div');
      el.className = 'effect-icon';
      el.style.borderColor = data.color;
      el.innerHTML = `<i class="fas ${data.icon}" style="color: ${data.color}"></i>`;

      // Helper text for duration? Or progress ring
      const percent = (data.remainingMs / data.totalMs) * 100;
      el.style.background = `conic-gradient(${data.color} ${percent}%, transparent ${percent}%)`; // Simple progress bg

      container.appendChild(el);
    });
  }

  showItemFeedback(item) {
    const feedback = document.createElement('div');
    feedback.className = 'item-feedback';
    feedback.innerHTML = `
      <div style="font-size: 28px"><i class="fas ${item.icon}"></i> ${item.name}</div>
      <div style="font-size: 16px; margin-top: 5px; color: #fff;">${item.desc || ''}</div>
    `;
    feedback.style.color = item.color;
    feedback.style.textAlign = 'center';

    // Add to HUD
    this.elements.hudStats.appendChild(feedback);

    // Remove after animation
    setTimeout(() => {
      if (feedback.parentNode) feedback.parentNode.removeChild(feedback);
    }, 2000);
  }

  handleKeyDown(e) {
    if (!this.engine.state.isRunning) return;
    if (e.key === 'ArrowLeft') this.moveCar(-1);
    if (e.key === 'ArrowRight') this.moveCar(1);
    // Restart on space if game over?
    if (this.elements.gameOverScreen.style.display !== 'none' && e.key === ' ') {
      this.handleRestart();
    }
  }

  handleKeyUp(e) {
    // No op for discrete movement
  }

  animateRoadLines(speed) {
    const lines = this.elements.linesContainer.querySelectorAll('.line');
    lines.forEach(line => {
      let top = parseFloat(line.style.top);
      top += speed * 0.15;
      if (top > 100) top = -15;
      line.style.top = `${top}%`;
    });
  }

  createRoadLines() {
    this.elements.linesContainer.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const line = document.createElement('div');
      line.className = 'line';
      line.style.top = `${i * 20}%`;
      this.elements.linesContainer.appendChild(line);
    }
  }

  updateEnergyFoo(energy) {
    if (this.elements.energyFill) {
      this.elements.energyFill.style.width = `${energy}%`;
      if (energy < 30) this.elements.energyFill.style.background = 'linear-gradient(90deg, #ff0000, #ff4444)';
      else this.elements.energyFill.style.background = 'linear-gradient(90deg, #ff00ff, #00f3ff)';
    }
  }

  handleGameOver(score) {
    if (this.bgMusic) this.bgMusic.pause();
    const wrongAnswerSound = new Audio(wrongBuzzer);
    wrongAnswerSound.play().catch(e => console.log(e));

    const currentHigh = parseFloat(localStorage.getItem('highScore')) || 0;
    if (score > currentHigh) {
      localStorage.setItem('highScore', score);
    }

    this.elements.finalScoreElement.textContent = `SCORE: ${score}`;
    this.elements.gameOverScreen.style.display = 'flex';
    this.elements.highScoreElement.textContent = `BEST: ${score}`;

    // Submit score to leaderboard
    const playerName = localStorage.getItem('playerName') || 'Unknown';
    this.submitScore(playerName, score);
  }

  handleRestart() {
    this.start();
  }

  showLeaderboard() {
    const leaderboardModal = document.getElementById('leaderboard-modal');
    const leaderboardList = document.getElementById('leaderboard-list');
    const leaderboardLoading = document.getElementById('leaderboard-loading');
    const closeLeaderboardButton = document.getElementById('close-leaderboard-button');

    leaderboardList.innerHTML = '';
    leaderboardLoading.style.display = 'block';
    leaderboardModal.style.display = 'flex';

    fetch('https://script.google.com/macros/s/AKfycbzR_wTa38mgZVPzQ6V0CEWyw4UaBt0Z7_SKHLM1c8PlJ-O-7lOYlb-B4SmpLKRtDNT24A/exec')
      .then((response) => response.json())
      .then((data) => {
        const highestScores = data.reduce((acc, entry) => {
          if (!acc[entry.name] || acc[entry.name].score < entry.score) {
            acc[entry.name] = entry;
          }
          return acc;
        }, {});

        const sortedData = Object.values(highestScores)
          .sort((a, b) => b.score - a.score)
          .slice(0, 10);

        sortedData.forEach((entry, index) => {
          if (entry.name && entry.score) {
            const listItem = document.createElement('li');
            listItem.textContent = `#${index + 1} ${entry.name}: ${entry.score}`;
            leaderboardList.appendChild(listItem);
          }
        });

        leaderboardLoading.style.display = 'none';
      })
      .catch((error) => {
        console.error('Error fetching leaderboard:', error);
        leaderboardLoading.textContent = 'Failed to load leaderboard.';
      });

    closeLeaderboardButton.onclick = () => {
      leaderboardModal.style.display = 'none';
    };
  }

  submitScore(name, score) {
    const url = 'https://script.google.com/macros/s/AKfycbzR_wTa38mgZVPzQ6V0CEWyw4UaBt0Z7_SKHLM1c8PlJ-O-7lOYlb-B4SmpLKRtDNT24A/exec';

    // Using POST with CORS no-cors or standard text/plain to avoid preflight issues 
    // depending on how the apps script is set up. 
    // Usually a simple POST with URL encoded data works best for these.
    fetch(url, {
      method: 'POST',
      mode: 'no-cors', // Often needed for Google Apps Script simple triggers
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, score })
    }).then(() => {
      console.log('Score submitted');
    }).catch(err => {
      console.error('Failed to submit score:', err);
    });
  }

  playMusic() {
    if (this.bgMusic) {
      this.bgMusic.currentTime = 0;
      this.bgMusic.play();
      return;
    }
    const randomMusic = this.backgroundMusicList[Math.floor(Math.random() * this.backgroundMusicList.length)];
    this.bgMusic = new Audio(randomMusic);
    this.bgMusic.volume = 0.5;
    this.bgMusic.loop = true;
    this.bgMusic.play().catch(e => console.log(e));
  }
}
