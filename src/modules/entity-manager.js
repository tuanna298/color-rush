import { Physics } from './physics.js';

export class EntityManager {
    constructor(gameEngine) {
        this.engine = gameEngine;
        this.entities = [];
        this.container = document.getElementById('road');
    }

    setContainer(element) {
        this.container = element;
    }

    sparkEntity(type, lane, config = {}) {
        const id = `entity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const element = document.createElement('div');

        element.id = id;
        element.className = `entity ${type}`;
        element.dataset.type = type;

        // Lane Configuration (0, 1, 2)
        // Full width lanes: 33.33% each.
        // Lane 0: Left 0%
        // Lane 1: Left 33.33%
        // Lane 2: Left 66.66%
        const laneWidth = 33.33;
        const laneLeft = lane * laneWidth;

        element.style.left = `${laneLeft}%`;
        element.style.width = `${laneWidth}%`;
        element.style.top = '-150px';

        // Config overrides
        Object.assign(element.style, config.style || {});
        if (config.className) element.classList.add(config.className);
        if (config.text) element.textContent = config.text;

        this.container.appendChild(element);

        const entity = {
            id,
            type,
            lane,
            element,
            y: -150,
            widthPercent: laneWidth,
            passed: false,
            onCollide: config.onCollide || null,
            data: config.data || {}
        };

        this.entities.push(entity);
        return entity;
    }

    update(gameState, timeScale, engine) {
        const roadHeight = this.container.offsetHeight || window.innerHeight;
        const removalIndices = [];

        this.entities.forEach((entity, index) => {
            // Move
            entity.y += gameState.currentSpeed * timeScale;
            entity.element.style.top = `${entity.y}px`;

            // Cleanup
            if (entity.y > roadHeight) {
                removalIndices.push(index);
                if (entity.element.parentNode) {
                    entity.element.parentNode.removeChild(entity.element);
                }
            }
        });

        for (let i = removalIndices.length - 1; i >= 0; i--) {
            this.entities.splice(removalIndices[i], 1);
        }
    }

    // Precise Collision Physics
    checkCollision(carElement) {
        const hitEntities = [];
        const carRect = Physics.getRect(carElement);

        // Tuning Hitbox: Car looks like a square/rect.
        // Screen is vertical. 
        // We want to be lenient.
        // Shrink Car Rect by 20%
        const carHitbox = {
            top: carRect.top + carRect.height * 0.2, // Ignore top 20% (hood)
            bottom: carRect.bottom - carRect.height * 0.1, // Ignore bottom 10%
            left: carRect.left + carRect.width * 0.25, // Middle 50% width
            right: carRect.right - carRect.width * 0.25,
            width: carRect.width * 0.5,
            height: carRect.height * 0.7
        };

        this.entities.forEach(entity => {
            if (entity.passed) return;

            const entityRect = Physics.getRect(entity.element);

            // Simple AABB Intersect manually since Physics.isColliding might take raw rects
            // or we adapt it.
            // Let's rely on manual check here for custom hitbox
            const crash = (
                carHitbox.left < entityRect.right &&
                carHitbox.right > entityRect.left &&
                carHitbox.top < entityRect.bottom &&
                carHitbox.bottom > entityRect.top
            );

            if (crash) {
                hitEntities.push(entity);
                entity.passed = true;
            }
        });

        return hitEntities;
    }

    clearAll() {
        this.entities.forEach(e => {
            if (e.element.parentNode) e.element.parentNode.removeChild(e.element);
        });
        this.entities = [];
    }
}
