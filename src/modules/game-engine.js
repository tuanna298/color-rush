export class GameEngine {
    constructor(config = {}) {
        this.config = {
            speed: 5,
            maxSpeed: 25,
            laneWidth: 33.33, // Percentage
            ...config,
        };

        this.state = {
            isRunning: false,
            isPaused: false,
            score: 0,
            energy: 100,
            currentSpeed: this.config.speed,
            distance: 0,
            lastFrameTime: 0,
            activeEffects: {}, // Key: EffectName, Value: { type, remainingMs, icon, color }
            isInvincible: false
        };

        this.entities = []; // Will be managed by EntityManager
        this.systems = []; // Update loops (Spawner, Physics, etc.)
    }

    // Add a sub-system (Spawner, Environment, etc.)
    addSystem(system) {
        this.systems.push(system);
    }

    start() {
        if (this.state.isRunning) return;
        this.state.isRunning = true;
        this.state.lastFrameTime = performance.now();
        this.gameLoop = requestAnimationFrame((time) => this.loop(time));
    }

    stop() {
        this.state.isRunning = false;
        cancelAnimationFrame(this.gameLoop);
    }

    reset() {
        this.stop();
        this.state = {
            isRunning: false,
            isPaused: false,
            score: 0,
            energy: 100,
            currentSpeed: this.config.speed,
            distance: 0,
            lastFrameTime: 0,
            activeEffects: {},
            isInvincible: false
        };
        // Reset sub-systems if they have reset methods
        this.systems.forEach(system => {
            if (system.reset) system.reset();
        });
    }

    pause() {
        this.state.isPaused = true;
    }

    resume() {
        this.state.isPaused = false;
        this.state.lastFrameTime = performance.now();
        this.loop(performance.now());
    }

    loop(timestamp) {
        if (!this.state.isRunning) return;

        if (this.state.isPaused) {
            this.gameLoop = requestAnimationFrame((time) => this.loop(time));
            return;
        }

        const deltaTime = timestamp - this.state.lastFrameTime;
        this.state.lastFrameTime = timestamp;

        // Convert deltaTime to seconds for consistency if needed, 
        // but for now we might stick to frame-based or simple time-based steps
        // Let's use a speed factor based on 60fps target
        const timeScale = deltaTime / 16.67;

        this.update(timeScale);

        this.gameLoop = requestAnimationFrame((time) => this.loop(time));
    }

    update(timeScale) {
        // Basic progression
        this.state.distance += this.state.currentSpeed * timeScale;

        // Update Effects
        this.updateEffects(timeScale);

        // Update all registered systems
        this.systems.forEach(system => {
            system.update(this.state, timeScale, this);
        });
    }

    addEffect(key, durationMs, metadata = {}) {
        // metadata: { type: 'buff'|'debuff', icon: 'fa-star', color: '#fff' }
        this.state.activeEffects[key] = {
            remainingMs: durationMs,
            totalMs: durationMs,
            ...metadata
        };

        // Immediate logic triggers
        if (key === 'GOD_MODE' || key === 'SHIELD') {
            this.state.isInvincible = true;
        }
    }

    updateEffects(timeScale) {
        // timeScale is relative to 60fps (approx 16.67ms)
        const deltaMs = timeScale * 16.67;

        for (const [key, effect] of Object.entries(this.state.activeEffects)) {
            if (effect.remainingMs > 0) {
                effect.remainingMs -= deltaMs;

                if (effect.remainingMs <= 0) {
                    delete this.state.activeEffects[key];
                    // Trigger effect end if needed
                    if (key === 'GOD_MODE' || key === 'SHIELD') {
                        // Only remove invincibility if no other invincible effect is active
                        if (!this.state.activeEffects['GOD_MODE'] && !this.state.activeEffects['SHIELD']) {
                            this.state.isInvincible = false;
                        }
                    }
                    if (key === 'BLIND' || key === 'FLASH' || key === 'NIGHT') {
                        // UI cleanup handled by Game or loop check
                    }
                }
            }
        }
    }

    // --- API for Systems ---

    addScore(points) {
        this.state.score += points;
    }

    changeEnergy(amount) {
        this.state.energy = Math.min(100, Math.max(0, this.state.energy + amount));
        if (this.state.energy <= 0) {
            this.gameOver();
        }
    }

    setSpeed(speed) {
        this.state.currentSpeed = speed;
    }

    gameOver() {
        this.stop();
        if (this.onGameOver) this.onGameOver(this.state.score);
    }
}
