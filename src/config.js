export const SPAWN_TARGETS_COUNT = 6;
export const GAME_DURATION_SECONDS = 30;
export const GAME_COUNTDOWN_SECONDS = 3;

export const PLANETS = [
  { id: 'mercury', name: 'Mercury', color: '0.55 0.50 0.45', radius: 0.18, hasRing: false, points: 1 },
  { id: 'venus', name: 'Venus', color: '0.85 0.65 0.35', radius: 0.22, hasRing: false, points: 1 },
  { id: 'earth', name: 'Earth', color: '0.18 0.45 0.9', radius: 0.26, hasRing: false, points: 2 },
  { id: 'mars', name: 'Mars', color: '0.85 0.35 0.32', radius: 0.20, hasRing: false, points: 1 },
  { id: 'jupiter', name: 'Jupiter', color: '0.95 0.8 0.65', radius: 0.70, hasRing: false, points: 4 },
  { id: 'saturn', name: 'Saturn', color: '0.95 0.9 0.75', radius: 0.60, hasRing: true, ringColor: '0.85 0.7 0.5', ringScale: 2.2, points: 4 },
  { id: 'uranus', name: 'Uranus', color: '0.4 0.85 0.9', radius: 0.38, hasRing: true, ringColor: '0.7 0.8 0.9', ringScale: 1.6, points: 3 },
  { id: 'neptune', name: 'Neptune', color: '0.15 0.4 0.95', radius: 0.36, hasRing: false, points: 3 },
  { id: 'pluto', name: 'Pluto', color: '0.65 0.45 0.35', radius: 0.16, hasRing: false, points: 1 }
];

export const CLIENT_EVENTS = {
  MOUSEUP_TARGET: 'mouseup .target',
  START_GAME: 'click .start-game',
  STOP_GAME: 'click .stop-game',
  SUBMIT_SCORE: 'click .submit-score',
  CLOSE_POPUP: 'click .close-popup',
};

export const SERVER_EVENTS = {
  INSERT_SCORES: 'scores.insert',
};
