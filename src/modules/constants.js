export const COLORS = [
    { name: 'RED', hex: '#FF0000' },
    { name: 'BLUE', hex: '#0000FF' },
    { name: 'GREEN', hex: '#00FF00' },
    { name: 'YELLOW', hex: '#FFFF00' },
    { name: 'PURPLE', hex: '#800080' },
    { name: 'ORANGE', hex: '#FFA500' },
    { name: 'WHITE', hex: '#FFFFFF' },
    { name: 'BLACK', hex: '#000000' },
    { name: 'PINK', hex: '#FFC0CB' },
    { name: 'CYAN', hex: '#00FFFF' },
];

export const ENTITY_TYPES = {
    PUZZLE_TILE: 'puzzle-tile',
    OBSTACLE: 'obstacle',
    ITEM: 'item'
};

export const ITEMS = {
    SPEED_UP: { type: 'buff', name: 'SPEED UP', desc: 'Tăng tốc + Điểm x2', color: '#00ff00', icon: 'fa-bolt' },
    SHIELD: { type: 'buff', name: 'SHIELD', desc: 'Khiên bảo vệ 1 lần', color: '#00ffff', icon: 'fa-shield-alt' },
    HEAL: { type: 'buff', name: 'ENERGY', desc: 'Hồi phục năng lượng', color: '#ff00ff', icon: 'fa-heart' },
    GOD_MODE: { type: 'buff', name: 'GOD MODE', desc: 'Bất tử', color: '#ffd700', icon: 'fa-star' },

    SLOW_DOWN: { type: 'debuff', name: 'SLOW', desc: 'Giảm tốc độ xe', color: '#888888', icon: 'fa-snowflake' },
    // BLIND: { type: 'debuff', name: 'BLIND', desc: 'Mất tầm nhìn!', color: '#000000', icon: 'fa-eye-slash' },
    FLASH: { type: 'debuff', name: 'FLASH', desc: 'Chói mắt!', color: '#ffffff', icon: 'fa-sun' },
    NIGHT: { type: 'debuff', name: 'NIGHT', desc: 'Tắt đèn!', color: '#1a1a2e', icon: 'fa-moon' }
};

export const OBSTACLES = {
    BARRICADE: { name: 'Barricade', icon: 'fa-road', color: '#ffaa00' },
    CAR: { name: 'Car', icon: 'fa-car', color: '#ff4444' },
    CONSTRUCTION: { name: 'Construction', icon: 'fa-hard-hat', color: '#ffaa00' },
    CHICKEN: { name: 'Chicken', icon: 'fa-crow', color: '#ffffff' } // Easter Egg
};
