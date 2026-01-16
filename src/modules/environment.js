export class Environment {
    constructor(gameEngine) {
        this.engine = gameEngine;
        this.container = document.getElementById('game-container');
        this.road = document.getElementById('road');

        this.themes = [
            { name: 'CITY', bg: 'radial-gradient(circle at center, #1a1a2e 0%, #000000 100%)', road: 'linear-gradient(180deg, #222 0%, #111 100%)' },
            { name: 'DESERT', bg: 'radial-gradient(circle at center, #2e1a1a 0%, #000000 100%)', road: 'linear-gradient(180deg, #332211 0%, #110000 100%)' },
            { name: 'SPACE', bg: 'radial-gradient(circle at center, #000022 0%, #000000 100%)', road: 'linear-gradient(180deg, #111122 0%, #000011 100%)' }
        ];

        this.currentThemeIndex = 0;
    }

    reset() {
        this.currentThemeIndex = 0;
        this.applyTheme(this.themes[0]);
    }

    update(state, timeScale) {
        // Change environment every 2000 distance units
        const themeIndex = Math.floor(state.distance / 2000) % this.themes.length;

        if (themeIndex !== this.currentThemeIndex) {
            this.currentThemeIndex = themeIndex;
            this.applyTheme(this.themes[themeIndex]);
        }
    }

    applyTheme(theme) {
        this.container.style.background = theme?.bg || '';
        this.road.style.background = theme?.road || '';
    }
}
