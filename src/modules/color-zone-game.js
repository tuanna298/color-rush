import bgMusic1 from '../../assets/audios/bgMusic1.mp3';
import diffChangeAlertMusic from '../../assets/audios/diff-change-alert.mp3';
import wrongBuzzer from '../../assets/audios/wrong-buzzer.mp3';

// Game Class - Quản lý toàn bộ trò chơi
export class ColorZoneGame {
  constructor() {
    // Danh sách nhạc nền
    this.backgroundMusicList = [bgMusic1];

    // DOM Elements
    this.elements = {
      car: document.getElementById('car'),
      colorWord: document.getElementById('color-word'),
      scoreElement: document.getElementById('score'),
      gameOverScreen: document.getElementById('game-over'),
      finalScoreElement: document.getElementById('final-score'),
      restartButton: document.getElementById('restart-button'),
      linesContainer: document.getElementById('lines-container'),
      leftZone: document.getElementById('left-zone'),
      centerZone: document.getElementById('center-zone'),
      rightZone: document.getElementById('right-zone'),
      road: document.getElementById('road'),
    };

    // Game state
    this.state = {
      carX: 50, // Car position as percentage of road width
      score: 0,
      gameSpeed: 3,
      gameRunning: true,
      isDragging: false,
      carMovementSpeed: 3,
      isMovingLeft: false,
      isMovingRight: false,
      animationFrameId: null,
      carMovementFrameId: null,
      zoneAnimationInterval: null,
      ingameBackgroundMusic: null,
      diffChangeAlertMusic: null,
      difficultyLevel: 1, // Difficulty level (1-5)
      autoDrive: true,
    };

    // Constants
    this.colors = [
      { name: 'RED', hex: '#FF0000' },
      { name: 'BLUE', hex: '#0000FF' },
      { name: 'GREEN', hex: '#00FF00' },
      { name: 'YELLOW', hex: '#FFFF00' },
      { name: 'PURPLE', hex: '#800080' },
      { name: 'ORANGE', hex: '#FFA500' },
    ];

    this.zones = [
      { min: 0, max: 33 }, // Left zone (0-25% of road width)
      { min: 33, max: 66 }, // Center zone (25-60% of road width)
      { min: 66, max: 100 }, // Right zone (60-100% of road width)
    ];

    this.state.diffChangeAlertMusic = new Audio(diffChangeAlertMusic);
    this.state.diffChangeAlertMusic.volume = 0.5; // Set volume for difficulty change alert

    // Bind event handlers to maintain 'this' context
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleRestart = this.handleRestart.bind(this);
    this.animateRoadLines = this.animateRoadLines.bind(this);
    this.updateCarMovement = this.updateCarMovement.bind(this);
  }

  // Initialize the game
  init() {
    // Show player name modal
    const playerNameModal = document.getElementById('player-name-modal');
    const playerNameInput = document.getElementById('player-name-input');
    const startGameButton = document.getElementById('start-game-button');

    // Check if a username already exists in localStorage
    let playerName = localStorage.getItem('playerName');
    if (!playerName) {
      // Generate a random username
      playerName = `Player_${Math.floor(Math.random() * 1000)}`;
      localStorage.setItem('playerName', playerName);
    }

    // Pre-fill the input with the existing or generated username
    playerNameInput.value = playerName;

    playerNameModal.style.display = 'flex';

    startGameButton.addEventListener('click', () => {
      const newPlayerName = playerNameInput.value.trim() || playerName;
      localStorage.setItem('playerName', newPlayerName);
      playerNameModal.style.display = 'none';

      // Add event listeners
      this.setupEventListeners();

      // Start the game
      this.start();
    });
  }

  // Setup all event listeners
  setupEventListeners() {
    // Driving assist toggle
    const assistCheckbox = document.getElementById('assist-checkbox');
    if (assistCheckbox) {
      // Load saved state from localStorage, default to true if not set
      const savedAssistState = localStorage.getItem('autoDrive') !== 'false';
      this.state.autoDrive = savedAssistState;
      assistCheckbox.checked = savedAssistState;

      // Add event listener for toggle
      assistCheckbox.addEventListener('change', (e) => {
        this.state.autoDrive = e.target.checked;
        localStorage.setItem('autoDrive', this.state.autoDrive);
      });
    }

    // Keyboard controls
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);

    // Mobile button controls
    const leftTouchZone = document.getElementById('touch-controls-left');
    const rightTouchZone = document.getElementById('touch-controls-right');

    if (leftTouchZone && rightTouchZone) {
      const handleLeftStart = (e) => {
        e.preventDefault();
        if (this.state.autoDrive) {
          this.handleAutoDriveLeft();
        } else {
          this.state.isMovingLeft = true;
        }
        leftTouchZone.classList.add('active');
      };

      const handleLeftEnd = (e) => {
        e.preventDefault();
        if (!this.state.autoDrive) {
          this.state.isMovingLeft = false;
        }
        leftTouchZone.classList.remove('active');
      };

      const handleRightStart = (e) => {
        e.preventDefault();
        if (this.state.autoDrive) {
          this.handleAutoDriveRight();
        } else {
          this.state.isMovingRight = true;
        }
        rightTouchZone.classList.add('active');
      };

      const handleRightEnd = (e) => {
        e.preventDefault();
        if (!this.state.autoDrive) {
          this.state.isMovingRight = false;
        }
        rightTouchZone.classList.remove('active');
      };

      // Touch events
      leftTouchZone.addEventListener('touchstart', handleLeftStart);
      leftTouchZone.addEventListener('touchend', handleLeftEnd);

      rightTouchZone.addEventListener('touchstart', handleRightStart);
      rightTouchZone.addEventListener('touchend', handleRightEnd);

      // Mouse events for testing on desktop (if needed, but usually hidden)
      leftTouchZone.addEventListener('mousedown', handleLeftStart);
      leftTouchZone.addEventListener('mouseup', handleLeftEnd);
      rightTouchZone.addEventListener('mousedown', handleRightStart);
      rightTouchZone.addEventListener('mouseup', handleRightEnd);
    }

    // Restart button
    this.elements.restartButton.addEventListener('click', this.handleRestart);
  }

  handleAutoDriveLeft() {
    if (this.state.carX <= 60) {
      this.moveCarTo(20); // Giữa lane bên trái
    } else if (this.state.carX <= 80) {
      this.moveCarTo(50); // Giữa lane giữa
    } else {
      return; // Không di chuyển nếu đã ở lane bên trái
    }
  }

  handleAutoDriveRight() {
    if (this.state.carX <= 40) {
      this.moveCarTo(50); // Giữa lane giữa
    } else if (this.state.carX <= 60) {
      this.moveCarTo(80);
    } else {
      return; // Không di chuyển nếu đã ở lane bên phải
    }
  }

  // Handle keyboard key press
  handleKeyDown(e) {
    if (!this.state.gameRunning) return;

    if (this.state.autoDrive) {
      switch (e.key) {
        case 'ArrowLeft':
          this.handleAutoDriveLeft();
          break;
        case 'ArrowRight':
          this.handleAutoDriveRight();
          break;
      }
    } else {
      switch (e.key) {
        case 'ArrowLeft':
          this.state.isMovingLeft = true;
          break;
        case 'ArrowRight':
          this.state.isMovingRight = true;
          break;
      }
    }
  }

  // Handle keyboard key release
  handleKeyUp(e) {
    switch (e.key) {
      case 'ArrowLeft':
        this.state.isMovingLeft = false;
        break;
      case 'ArrowRight':
        this.state.isMovingRight = false;
        break;
    }
  }

  // Handle restart button click
  handleRestart() {
    this.start();
  }

  // Move car to specific position
  moveCarTo(positionPercent) {
    // Get car and road dimensions
    const carWidth = this.elements.car.offsetWidth;
    const roadWidth = this.elements.road.offsetWidth;
    const carWidthPercent = (carWidth / roadWidth) * 100;

    // Calculate constrained position
    this.state.carX = Math.max(
      carWidthPercent / 2,
      Math.min(100 - carWidthPercent / 2, positionPercent),
    );

    // Position the car (centering at cursor)
    const actualPosition = this.state.carX - carWidthPercent / 2;
    this.elements.car.style.left = `${actualPosition}%`;
  }

  // Create road lines
  createRoadLines() {
    const linesContainer = this.elements.linesContainer;

    // Clear existing lines
    while (linesContainer.firstChild) {
      linesContainer.removeChild(linesContainer.firstChild);
    }

    // Create new lines
    for (let i = 0; i < 10; i++) {
      const line = document.createElement('div');
      line.className = 'line';
      line.style.top = `${i * 15}%`;
      linesContainer.appendChild(line);
    }
  }

  // Animate road lines
  animateRoadLines() {
    if (!this.state.gameRunning) return;

    const lines = this.elements.linesContainer.querySelectorAll('.line');
    lines.forEach((line) => {
      const currentTop = parseFloat(line.style.top);
      if (currentTop >= 100) {
        line.style.top = '-5%';
      } else {
        line.style.top = `${currentTop + this.state.gameSpeed * 0.5}%`;
      }
    });

    this.state.animationFrameId = requestAnimationFrame(this.animateRoadLines);
  }

  // Update car movement based on keyboard input
  updateCarMovement() {
    if (!this.state.gameRunning) return;

    if (this.state.isMovingLeft) {
      this.moveCarTo(this.state.carX - this.state.carMovementSpeed * 0.5);
    }

    if (this.state.isMovingRight) {
      this.moveCarTo(this.state.carX + this.state.carMovementSpeed * 0.5);
    }

    this.state.carMovementFrameId = requestAnimationFrame(
      this.updateCarMovement,
    );
  }

  // Generate new color challenge
  // Generate new color challenge with increasing difficulty
  generateColorChallenge() {
    const { colorWord, leftZone, centerZone, rightZone } = this.elements;

    // Define difficulty levels based on score
    const difficultyLevel = Math.min(5, Math.floor(this.state.score / 50) + 1);
    this.state.difficultyLevel = difficultyLevel;

    // Phát âm thanh mỗi khi điểm số là bội số của 100
    if (this.state.score > 0 && this.state.score % 100 === 0) {
      this.state.diffChangeAlertMusic.play().catch((error) => {
        console.error('Error playing difficulty change sound:', error);
      });
    }

    // Extended color palette (thêm nhiều màu hơn khi độ khó tăng)
    const extendedColors = [
      { name: 'RED', hex: '#FF0000' },
      { name: 'BLUE', hex: '#0000FF' },
      { name: 'GREEN', hex: '#00FF00' },
      { name: 'YELLOW', hex: '#FFFF00' },
      { name: 'PURPLE', hex: '#800080' },
      { name: 'ORANGE', hex: '#FFA500' },
      { name: 'WHITE', hex: '#FFFFFF' },
      { name: 'BLACK', hex: '#000000' },
      { name: 'PINK', hex: '#FFC0CB' },
      { name: 'BROWN', hex: '#A52A2A' },
      { name: 'GRAY', hex: '#808080' },
      { name: 'CYAN', hex: '#00FFFF' },
    ];

    // Số lượng màu sẽ tăng dần theo difficulty level
    const colorsToUse = extendedColors.slice(
      0,
      Math.min(6 + difficultyLevel, extendedColors.length),
    );

    // Các màu tương tự nhau để gây nhầm lẫn
    const similarColors = {
      RED: ['PINK', 'ORANGE', 'PURPLE'],
      BLUE: ['CYAN', 'PURPLE'],
      GREEN: ['CYAN', 'YELLOW'],
      YELLOW: ['ORANGE', 'WHITE'],
      PURPLE: ['BLUE', 'PINK'],
      ORANGE: ['YELLOW', 'RED'],
      WHITE: ['GRAY', 'YELLOW'],
      BLACK: ['GRAY', 'PURPLE'],
      PINK: ['RED', 'PURPLE'],
      BROWN: ['RED', 'ORANGE'],
      GRAY: ['WHITE', 'BLACK'],
      CYAN: ['BLUE', 'GREEN'],
    };

    // Chọn màu đúng (correctColor) cho từ màu
    const correctColorIndex = Math.floor(Math.random() * colorsToUse.length);
    const correctColor = colorsToUse[correctColorIndex];

    // Chọn màu hiển thị cho từ màu (chủ đích gây nhầm lẫn)
    let displayColorIndex;

    if (difficultyLevel >= 2 && Math.random() < 0.7) {
      // Ở mức độ khó >= 2, có 70% khả năng chọn màu tương tự để gây nhầm lẫn
      // Lấy danh sách các màu tương tự với màu đúng
      const similarToCorrect = similarColors[correctColor.name] || [];

      // Lọc ra các màu tương tự có trong colorsToUse
      const availableSimilarColors = colorsToUse.filter(
        (color) =>
          similarToCorrect.includes(color.name) &&
          color.name !== correctColor.name,
      );

      if (availableSimilarColors.length > 0) {
        // Chọn ngẫu nhiên một màu tương tự
        const randomSimilar =
          availableSimilarColors[
          Math.floor(Math.random() * availableSimilarColors.length)
          ];
        displayColorIndex = colorsToUse.findIndex(
          (c) => c.name === randomSimilar.name,
        );
      } else {
        // Nếu không có màu tương tự, chọn một màu ngẫu nhiên khác
        do {
          displayColorIndex = Math.floor(Math.random() * colorsToUse.length);
        } while (displayColorIndex === correctColorIndex);
      }
    } else {
      // Ở mức độ khó thấp, chỉ đơn giản chọn một màu khác ngẫu nhiên
      do {
        displayColorIndex = Math.floor(Math.random() * colorsToUse.length);
      } while (displayColorIndex === correctColorIndex && difficultyLevel > 1);
    }

    // Ở mức độ khó 1, đôi khi hiển thị đúng màu (giúp người chơi làm quen)
    if (difficultyLevel === 1 && Math.random() < 0.3) {
      displayColorIndex = correctColorIndex;
    }

    const displayColor = colorsToUse[displayColorIndex];

    // Set color word and its display color
    colorWord.textContent = correctColor.name;
    colorWord.style.color = displayColor.hex;

    // Randomize color zone positions
    const positions = [0, 1, 2].sort(() => Math.random() - 0.5);
    const correctPosition = positions[0];

    // Tạo các màu cho 3 zone với chiến lược gây nhầm lẫn
    const zoneColors = [null, null, null];

    // Đặt màu đúng vào vị trí đúng
    zoneColors[correctPosition] = correctColor;

    // Mảng để theo dõi các màu đã sử dụng
    const usedColors = [correctColor.name];

    // Chọn màu cho 2 zone còn lại
    for (let i = 0; i < 3; i++) {
      if (i !== correctPosition) {
        let zoneColor;

        // Chiến lược gây nhầm lẫn dựa vào mức độ khó
        if (difficultyLevel >= 3 && Math.random() < 0.6) {
          // Ở mức độ khó cao, chọn màu tương tự với correctColor hoặc displayColor
          const targetColor = Math.random() < 0.5 ? correctColor : displayColor;
          const similarToTarget = similarColors[targetColor.name] || [];

          // Lọc ra các màu tương tự chưa sử dụng
          const availableSimilar = colorsToUse.filter(
            (color) =>
              similarToTarget.includes(color.name) &&
              !usedColors.includes(color.name),
          );

          if (availableSimilar.length > 0) {
            zoneColor =
              availableSimilar[
              Math.floor(Math.random() * availableSimilar.length)
              ];
          }
        }

        // Nếu không chọn được màu tương tự, chọn một màu ngẫu nhiên khác
        if (!zoneColor) {
          let attempts = 0;
          do {
            const randomIndex = Math.floor(Math.random() * colorsToUse.length);
            zoneColor = colorsToUse[randomIndex];
            attempts++;

            // Tránh vòng lặp vô hạn
            if (attempts > 20) {
              break;
            }
          } while (usedColors.includes(zoneColor.name));
        }

        zoneColors[i] = zoneColor;
        usedColors.push(zoneColor.name);
      }
    }

    // Đặt màu cho các zone
    leftZone.style.backgroundColor = zoneColors[0].hex;
    centerZone.style.backgroundColor = zoneColors[1].hex;
    rightZone.style.backgroundColor = zoneColors[2].hex;

    // Hiệu ứng đặc biệt cho mức độ khó cao
    if (difficultyLevel >= 4 && Math.random() < 0.3) {
      // Đôi khi đảo ngược từ màu (viết ngược, viết hoa, viết thường)
      if (Math.random() < 0.5) {
        colorWord.textContent = correctColor.name.split('').reverse().join('');
      } else {
        colorWord.textContent =
          Math.random() < 0.5
            ? correctColor.name.toLowerCase()
            : correctColor.name;
      }
    }

    // Ở mức độ khó rất cao (level 5), đôi khi làm cho chữ nhấp nháy
    if (difficultyLevel === 5 && Math.random() < 0.2) {
      this.startColorWordBlinking(displayColor.hex);
    } else {
      this.stopColorWordBlinking();
    }

    return correctPosition;
  }

  // Hàm phụ trợ để tạo hiệu ứng chữ nhấp nháy
  startColorWordBlinking(baseColor) {
    this.stopColorWordBlinking(); // Dừng hiệu ứng cũ nếu có

    const { colorWord } = this.elements;
    this.blinkInterval = setInterval(() => {
      // Chuyển đổi giữa màu gốc và một màu ngẫu nhiên khác
      if (colorWord.style.color === baseColor) {
        const randomColor =
          this.colors[Math.floor(Math.random() * this.colors.length)].hex;
        colorWord.style.color = randomColor;
      } else {
        colorWord.style.color = baseColor;
      }
    }, 200);
  }

  stopColorWordBlinking() {
    if (this.blinkInterval) {
      clearInterval(this.blinkInterval);
      this.blinkInterval = null;
    }
  }

  // Create and animate color zones
  createColorZone() {
    if (!this.state.gameRunning) return;

    // Generate new challenge
    const correctLane = this.generateColorChallenge();

    // Position zones at top (off-screen)
    const { leftZone, centerZone, rightZone } = this.elements;
    leftZone.style.top = '-150px';
    centerZone.style.top = '-150px';
    rightZone.style.top = '-150px';

    // Animate zones
    this.animateColorZone(correctLane);
  }

  // Animate color zones moving down
  animateColorZone(correctLane) {
    if (!this.state.gameRunning) return;

    const { leftZone, centerZone, rightZone } = this.elements;
    let position = parseFloat(leftZone.style.top) || -150;

    // Clear any existing animation
    if (this.state.zoneAnimationInterval) {
      clearInterval(this.state.zoneAnimationInterval);
    }

    // Create new animation interval
    this.state.zoneAnimationInterval = setInterval(() => {
      position += this.state.gameSpeed;

      // Move zones
      leftZone.style.top = `${position}px`;
      centerZone.style.top = `${position}px`;
      rightZone.style.top = `${position}px`;

      // Check for collision
      if (position >= window.innerHeight - 150) {
        clearInterval(this.state.zoneAnimationInterval);
        this.state.zoneAnimationInterval = null;

        // Determine which zone the car is in
        let carZone = null;
        const buffer = 5; // Buffer percentage to expand zone boundaries
        for (let i = 0; i < this.zones.length; i++) {
          const zoneMin = this.zones[i].min - buffer;
          const zoneMax = this.zones[i].max + buffer;
          if (this.state.carX >= zoneMin && this.state.carX <= zoneMax) {
            carZone = i;
            break;
          }
        }

        // Check if car is in correct lane
        if (carZone === correctLane) {
          // Correct lane - increase score and speed
          this.state.score += 10;
          this.elements.scoreElement.textContent = `SCORE: ${this.state.score}`;

          // Visual Feedback: Score Pulse
          this.elements.scoreElement.classList.remove('pulse');
          void this.elements.scoreElement.offsetWidth; // Trigger reflow
          this.elements.scoreElement.classList.add('pulse');

          this.state.gameSpeed += 0.3; // Increase speed
          this.createColorZone();
        } else {
          // Wrong lane - game over
          this.gameOver();
        }
      }
    }, 16);
  }

  // Game over handler
  gameOver() {
    this.state.gameRunning = false;

    // Cancel animations
    if (this.state.animationFrameId)
      cancelAnimationFrame(this.state.animationFrameId);
    if (this.state.carMovementFrameId)
      cancelAnimationFrame(this.state.carMovementFrameId);
    if (this.state.zoneAnimationInterval)
      clearInterval(this.state.zoneAnimationInterval);

    if (this.state.ingameBackgroundMusic) {
      this.state.ingameBackgroundMusic.pause();
      this.state.ingameBackgroundMusic.currentTime = 0; // Reset to the beginning
    }

    // Play wrong answer sound
    const wrongAnswerSound = new Audio(wrongBuzzer);
    wrongAnswerSound.currentTime = 1; // Đặt thời gian bắt đầu
    wrongAnswerSound.play().catch((error) => {
      console.error('Error playing wrong answer sound:', error);
    });

    // Visual Feedback: Screen Shake
    const gameContainer = document.getElementById('game-container');
    gameContainer.classList.add('shake-effect');
    setTimeout(() => gameContainer.classList.remove('shake-effect'), 500);

    // Show game over screen
    this.elements.finalScoreElement.textContent = `SCORE: ${this.state.score}`;
    this.elements.gameOverScreen.style.display = 'flex';

    // Save high score to local storage
    const playerName = localStorage.getItem('playerName') || 'Unknown';
    const highScore = localStorage.getItem('highScore') || 0;
    if (this.state.score > highScore) {
      localStorage.setItem('highScore', this.state.score);
    }

    // Update highest score display
    const highestScoreDisplay = document.getElementById(
      'highest-score-display',
    );
    highestScoreDisplay.textContent = `BEST: ${Math.max(
      this.state.score,
      localStorage.getItem('highScore') || 0,
    )}`;

    // Get device information
    const deviceInfo = navigator.userAgent;

    // Send score to Google Spreadsheet
    fetch(
      'https://script.google.com/macros/s/AKfycbzuzBZdnR5EXZ4QjXsGMN-APeZ83Ve5GQDsqz5YpoigQPUTeQ9WlKyRVObAz6FR-C-DPg/exec',
      {
        redirect: 'follow',
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          name: playerName,
          score: this.state.score,
          device: deviceInfo,
        }),
      },
    );
  }

  showLeaderboard() {
    const leaderboardModal = document.getElementById('leaderboard-modal');
    const leaderboardList = document.getElementById('leaderboard-list');
    const leaderboardLoading = document.getElementById('leaderboard-loading');
    const closeLeaderboardButton = document.getElementById(
      'close-leaderboard-button',
    );

    // Clear existing leaderboard entries and show loading
    leaderboardList.innerHTML = '';
    leaderboardLoading.style.display = 'block';

    // Show the modal immediately
    leaderboardModal.style.display = 'flex';

    // Fetch leaderboard data from Google Spreadsheet
    fetch(
      'https://script.google.com/macros/s/AKfycbzR_wTa38mgZVPzQ6V0CEWyw4UaBt0Z7_SKHLM1c8PlJ-O-7lOYlb-B4SmpLKRtDNT24A/exec'
    )
      .then((response) => response.json())
      .then((data) => {
        console.log('Raw Leaderboard data:', data);

        // Filter to keep only the highest score for each player
        const highestScores = data.reduce((acc, entry) => {
          if (!acc[entry.name] || acc[entry.name].score < entry.score) {
            acc[entry.name] = entry;
          }
          return acc;
        }, {});

        // Convert the object back to an array and sort by score in descending order
        const sortedData = Object.values(highestScores)
          .sort((a, b) => b.score - a.score)
          .slice(0, 10); // Limit to top 10

        // Populate leaderboard with rank, name, and score
        sortedData.forEach((entry, index) => {
          if (entry.name && entry.score) {
            const listItem = document.createElement('li');
            listItem.textContent = `#${index + 1} ${entry.name}: ${entry.score}`;
            leaderboardList.appendChild(listItem);
          }
        });

        // Hide loading after data is populated
        leaderboardLoading.style.display = 'none';
      })
      .catch((error) => {
        console.error('Error fetching leaderboard:', error);
        leaderboardLoading.textContent = 'Failed to load leaderboard.';
      });

    // Close leaderboard modal on button click
    closeLeaderboardButton.addEventListener('click', () => {
      leaderboardModal.style.display = 'none';
    });
  }

  // Start/restart game
  start() {
    // Reset game state
    this.state.score = 0;
    this.state.gameSpeed = 3;
    this.state.gameRunning = true;
    this.state.carX = 50;

    // Update score display
    this.elements.scoreElement.textContent = 'SCORE: 0';
    this.elements.gameOverScreen.style.display = 'none';
    this.moveCarTo(this.state.carX);

    // Display highest score
    const highestScore = localStorage.getItem('highScore') || 0;
    const highestScoreDisplay = document.getElementById(
      'highest-score-display',
    );
    highestScoreDisplay.textContent = `Điểm cao nhất: ${highestScore}`;

    // Cancel any existing animations
    if (this.state.animationFrameId) {
      cancelAnimationFrame(this.state.animationFrameId);
    }

    if (this.state.carMovementFrameId) {
      cancelAnimationFrame(this.state.carMovementFrameId);
    }

    if (this.state.zoneAnimationInterval) {
      clearInterval(this.state.zoneAnimationInterval);
    }

    // Initialize game elements
    this.createRoadLines();

    // Start animations
    this.animateRoadLines();
    this.updateCarMovement();
    this.createColorZone();

    // Phát nhạc nền ngẫu nhiên
    const randomMusic =
      this.backgroundMusicList[
      Math.floor(Math.random() * this.backgroundMusicList.length)
      ];
    this.state.ingameBackgroundMusic = new Audio(randomMusic);
    this.state.ingameBackgroundMusic.volume = 0.5; // Điều chỉnh âm lượng
    this.state.ingameBackgroundMusic.loop = true; // Lặp lại nhạc
    this.state.ingameBackgroundMusic.play().catch((error) => {
      console.error('Error playing background music:', error);
    });
  }

  // Clean up resources (call when game is no longer needed)
  destroy() {
    // Cancel animations
    if (this.state.animationFrameId) {
      cancelAnimationFrame(this.state.animationFrameId);
    }

    if (this.state.carMovementFrameId) {
      cancelAnimationFrame(this.state.carMovementFrameId);
    }

    if (this.state.zoneAnimationInterval) {
      clearInterval(this.state.zoneAnimationInterval);
    }

    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);

    const leftButton = document.getElementById('left-button');
    const rightButton = document.getElementById('right-button');

    if (leftButton && rightButton) {
      leftButton.removeEventListener(
        'mousedown',
        () => (this.state.isMovingLeft = true),
      );
      leftButton.removeEventListener(
        'mouseup',
        () => (this.state.isMovingLeft = false),
      );
      rightButton.removeEventListener(
        'mousedown',
        () => (this.state.isMovingRight = true),
      );
      rightButton.removeEventListener(
        'mouseup',
        () => (this.state.isMovingRight = false),
      );

      leftButton.removeEventListener(
        'touchstart',
        () => (this.state.isMovingLeft = true),
      );
      leftButton.removeEventListener(
        'touchend',
        () => (this.state.isMovingLeft = false),
      );
      rightButton.removeEventListener(
        'touchstart',
        () => (this.state.isMovingRight = true),
      );
      rightButton.removeEventListener(
        'touchend',
        () => (this.state.isMovingRight = false),
      );
    }
  }
}
