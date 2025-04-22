import { ColorZoneGame } from './modules/color-zone-game.js';

// Initialize the game
const game = new ColorZoneGame();
game.init();

// Add event listener for the leaderboard button
const viewLeaderboardButton = document.getElementById(
  'view-leaderboard-button',
);
viewLeaderboardButton.addEventListener('click', () => {
  game.showLeaderboard();
});
