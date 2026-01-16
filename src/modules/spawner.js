import { COLORS, ENTITY_TYPES, ITEMS, OBSTACLES } from './constants.js';

export class Spawner {
    constructor(gameEngine, entityManager) {
        this.engine = gameEngine;
        this.em = entityManager;
        this.nextSpawnDistance = 500; // Start spawning after some distance
        this.difficultyLevel = 1;
        this.waveCount = 0;

        // UI Elements to update
        this.ui = {
            question: document.getElementById('question'),
            colorWord: document.getElementById('color-word')
        };
    }

    reset() {
        this.nextSpawnDistance = 500;
        this.difficultyLevel = 1;
        this.waveCount = 0;
        this.setInstruction("Màu gì đây?");
        this.ui.colorWord.textContent = "Đỏ";
        this.ui.colorWord.style.color = "#ff0000"; // Default Red
    }

    update(state, timeScale) {
        // Basic spawning logic based on distance
        // If we have covered enough distance since last spawn, spawn something
        if (state.distance >= this.nextSpawnDistance) {
            this.spawnWave();

            // Calculate next spawn distance
            // Ramp up spawn rate as well
            const spawnGap = Math.max(300, 600 - (state.currentSpeed * 10));
            this.nextSpawnDistance = state.distance + spawnGap + (Math.random() * 200);

            this.waveCount++;
            this.adjustDifficulty(state.score);
        }
    }

    adjustDifficulty(score) {
        this.difficultyLevel = Math.floor(score / 300) + 1; // Increase every 300 points (harder)

        // Also increase global speed slightly via engine if desired, 
        // but Engine usually handles constant speed. 
        // Let's rely on Spawner to just make content harder.
        // However, GameEngine speed needs to go up.
        if (this.waveCount % 5 === 0) {
            this.engine.setSpeed(Math.min(this.engine.config.maxSpeed, this.engine.state.currentSpeed + 0.5));
        }
    }

    spawnWave() {
        // Decision Tree:
        // 70% Puzzle
        // 20% Obstacle
        // 10% Item
        const rand = Math.random();

        if (rand < 0.7) {
            this.spawnPuzzle();
        } else if (rand < 0.9) {
            this.spawnObstacle();
        } else {
            this.spawnItem();
        }
    }

    spawnPuzzle() {
        // 1. Generate Challenge
        const colorsToUse = COLORS.slice(0, Math.min(COLORS.length, 3 + this.difficultyLevel));

        // Pick Correct Color
        const correctColor = colorsToUse[Math.floor(Math.random() * colorsToUse.length)];
        // Pick Ink Color (could be same or different)
        const inkColor = colorsToUse[Math.floor(Math.random() * colorsToUse.length)];

        let type = 'MATCH_TEXT'; // Match the meaning of the word
        let text = correctColor.name;
        let visualColor = inkColor.hex; // The visual ink color
        let instruction = `CHỌN MÀU: ${correctColor.name}`;

        if (this.difficultyLevel >= 2) {
            // Stroop Effect
            if (Math.random() < 0.7) {
                const confusingInk = colorsToUse.find(c => c.name !== correctColor.name) || inkColor;
                visualColor = confusingInk.hex;
            }

            if (this.difficultyLevel >= 3) {
                const rand = Math.random();
                if (rand < 0.25) {
                    type = 'MATCH_INK';
                    instruction = "CHỌN MÀU MỰC (INK)";
                    // Text is misleading, Ink is Target
                    const misleading = colorsToUse.find(c => c.name !== correctColor.name) || colorsToUse[0];
                    text = misleading.name;
                    visualColor = correctColor.hex;
                } else if (rand < 0.45) {
                    type = 'NEGATION';
                    instruction = `KHÔNG CHẠM: ${correctColor.name}`;
                }
            }
        }

        this.setInstruction(instruction);
        this.ui.colorWord.textContent = text;
        this.ui.colorWord.style.color = visualColor;

        // Spawn 3 Lanes
        const safeLane = Math.floor(Math.random() * 3);

        for (let i = 0; i < 3; i++) {
            let tileColor;
            let isCorrect = false;

            if (type === 'NEGATION') {
                // If Negation, correctColor is WRONG.
                // We pick 1 Lane to be the Forbidden one (correctColor)
                const forbiddenLane = Math.floor(Math.random() * 3); // Randomly pick 1 forbidden lane
                if (i === forbiddenLane) {
                    tileColor = correctColor;
                    isCorrect = false;
                } else {
                    // Safe colors
                    const safeColors = colorsToUse.filter(c => c.name !== correctColor.name);
                    tileColor = safeColors[Math.floor(Math.random() * safeColors.length)];
                    isCorrect = true;
                }
            } else {
                if (i === safeLane) {
                    tileColor = correctColor;
                    isCorrect = true;
                } else {
                    const wrongColors = colorsToUse.filter(c => c.name !== correctColor.name);
                    tileColor = wrongColors[Math.floor(Math.random() * wrongColors.length)];
                    isCorrect = false;
                }
            }

            this.em.sparkEntity(ENTITY_TYPES.PUZZLE_TILE, i, {
                className: 'color-zone',
                style: {
                    backgroundColor: tileColor.hex,
                    boxShadow: `0 0 20px ${tileColor.hex}`,
                    opacity: 0.8
                },
                data: {
                    isCorrect: isCorrect,
                    colorName: tileColor.name,
                    instruction: instruction
                },
                onCollide: (entity, state) => {
                    if (entity.data.isCorrect) {
                        this.engine.addScore(100);
                        // Success sound could go here
                    } else {
                        this.engine.changeEnergy(-15);
                        const gameContainer = document.getElementById('game-container');
                        if (gameContainer) {
                            gameContainer.classList.add('shake-mid');
                            setTimeout(() => gameContainer.classList.remove('shake-mid'), 300);
                        }
                    }
                }
            });
        }
    }

    spawnObstacle() {
        this.setInstruction("NÉ CHƯỚNG NGẠI VẬT!");
        this.ui.colorWord.textContent = "";

        // Spawn 1 or 2 obstacles
        const lanes = [0, 1, 2].sort(() => Math.random() - 0.5);
        const count = Math.random() < 0.6 ? 1 : 2;

        for (let i = 0; i < count; i++) {
            const lane = lanes[i];
            const typeKeys = Object.keys(OBSTACLES);
            const obsType = OBSTACLES[typeKeys[Math.floor(Math.random() * typeKeys.length)]];

            this.em.sparkEntity(ENTITY_TYPES.OBSTACLE, lane, {
                className: 'obstacle',
                text: '',
                style: {
                    backgroundColor: 'transparent',
                    border: 'none',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                },
                height: 80,
                data: { obstacle: obsType },
                onCollide: () => {
                    if (this.engine.state.isInvincible) return;

                    this.engine.changeEnergy(-20);
                    this.engine.setSpeed(Math.max(2, this.engine.state.currentSpeed * 0.5));

                    const gameContainer = document.getElementById('game-container');
                    if (gameContainer) {
                        gameContainer.classList.add('shake-effect');
                        setTimeout(() => gameContainer.classList.remove('shake-effect'), 500);
                    }
                }
            });

            // Set Icon
            const el = this.em.entities[this.em.entities.length - 1].element;
            el.innerHTML = `<i class="fas ${obsType.icon}" style="font-size: 50px; color: ${obsType.color}; filter: drop-shadow(0 0 10px ${obsType.color});"></i>`;
        }
    }

    spawnItem() {
        this.setInstruction("ITEM!");
        this.ui.colorWord.textContent = "";

        const lane = Math.floor(Math.random() * 3);
        const itemKeys = Object.keys(ITEMS);
        const itemType = ITEMS[itemKeys[Math.floor(Math.random() * itemKeys.length)]];

        this.em.sparkEntity(ENTITY_TYPES.ITEM, lane, {
            className: 'item',
            style: {
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: '50%',
                width: '60px',
                height: '60px',
                marginLeft: 'calc(10% - 30px)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: `0 0 15px ${itemType.color}`
            },
            height: 60,
            data: { item: itemType },
            onCollide: () => {
                if (itemType.type === 'buff') {
                    this.engine.addScore(50);

                    if (itemType.name === 'ENERGY') {
                        this.engine.changeEnergy(30);
                    } else if (itemType.name === 'SPEED UP') {
                        this.engine.setSpeed(this.engine.state.currentSpeed + 5);
                    } else if (itemType.name === 'SHIELD') {
                        this.engine.addEffect('SHIELD', 5000, { type: 'buff', icon: itemType.icon, color: itemType.color });
                    } else if (itemType.name === 'GOD MODE') {
                        this.engine.addEffect('GOD_MODE', 8000, { type: 'buff', icon: itemType.icon, color: itemType.color });
                    }

                } else {
                    this.engine.changeEnergy(-5);
                    if (itemType.name === 'SLOW') {
                        this.engine.setSpeed(Math.max(3, this.engine.state.currentSpeed - 5));
                        this.engine.addEffect('SLOW', 3000, { type: 'debuff', icon: itemType.icon, color: itemType.color });
                    } else if (itemType.name === 'BLIND') {
                        this.engine.addEffect('BLIND', 3000, { type: 'debuff', icon: itemType.icon, color: itemType.color });
                    } else if (itemType.name === 'FLASH') {
                        this.engine.addEffect('FLASH', 500, { type: 'debuff', icon: itemType.icon, color: itemType.color });
                    } else if (itemType.name === 'NIGHT') {
                        this.engine.addEffect('NIGHT', 5000, { type: 'debuff', icon: itemType.icon, color: itemType.color });
                    }
                }
            }
        });

        const el = this.em.entities[this.em.entities.length - 1].element;
        el.innerHTML = `<i class="fas ${itemType.icon}" style="font-size: 30px; color: ${itemType.color};"></i>`;
    }

    setInstruction(text) {
        if (this.ui.question) this.ui.question.textContent = text;
    }
}
