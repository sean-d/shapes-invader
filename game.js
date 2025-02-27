import settingsManager from "./settings-manager.js";

// Canvas setup
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const nextPieceCanvas = document.getElementById("next-piece");
const nextPieceCtx = nextPieceCanvas.getContext("2d");
const menuOverlay = document.getElementById("menu-overlay");
const playButton = document.getElementById("play-button");
const optionsButton = document.getElementById("options-button");
const titleMusic = document.getElementById("title-music");
const gameMusic = document.getElementById("game-music");
const gameMusicOther = document.getElementById("game-music-other");

// Debug music elements
console.log("Title music element:", titleMusic);
console.log("Game music element:", gameMusic);

// Add music loading listeners
titleMusic.addEventListener("loadeddata", () => {
  console.log("Title music loaded successfully");
});

gameMusic.addEventListener("loadeddata", () => {
  console.log("Game music loaded successfully");
});

titleMusic.addEventListener("error", (e) => {
  console.error("Error loading title music:", e);
  console.error("Title music source:", titleMusic.querySelector("source").src);
});

gameMusic.addEventListener("error", (e) => {
  console.error("Error loading game music:", e);
  console.error("Game music source:", gameMusic.querySelector("source").src);
});

// Add play state listeners
titleMusic.addEventListener("play", () =>
  console.log("Title music started playing")
);
gameMusic.addEventListener("play", () =>
  console.log("Game music started playing")
);

titleMusic.addEventListener("pause", () => console.log("Title music paused"));
gameMusic.addEventListener("pause", () => console.log("Game music paused"));

// Audio state
let currentGameTrack = "traditional";
let previewTimeout = null;

// Game constants
const BLOCK_SIZE = 30;
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const COLORS = [
  null,
  "#FF0D72", // I
  "#0DC2FF", // J
  "#0DFF72", // L
  "#F538FF", // O
  "#FF8E0D", // S
  "#FFE138", // T
  "#3877FF", // Z
];

// Tetromino shapes
const PIECES = [
  [],
  [[1, 1, 1, 1]], // I
  [
    [2, 0, 0],
    [2, 2, 2],
  ], // J
  [
    [0, 0, 3],
    [3, 3, 3],
  ], // L
  [
    [4, 4],
    [4, 4],
  ], // O
  [
    [0, 5, 5],
    [5, 5, 0],
  ], // S
  [
    [0, 6, 0],
    [6, 6, 6],
  ], // T
  [
    [7, 7, 0],
    [0, 7, 7],
  ], // Z
];

// Game state
let board = null;
let piece = null;
let nextPiece = null;
let score = 0;
let lines = 0;
let level = 1;
let gameOver = false;
let isPaused = false;
let dropCounter = 0;
let lastTime = 0;
let gameStarted = false;

// Load settings
async function loadSettings() {
  return await settingsManager.loadSettings();
}

// Apply audio settings
async function applyAudioSettings() {
  const settings = await loadSettings();
  const musicVolume = settings.musicVolume / 100;

  // Apply volume to all music elements
  titleMusic.volume = musicVolume;
  gameMusic.volume = musicVolume;
  gameMusicOther.volume = musicVolume;

  console.log("Applied volume settings:", {
    musicVolume: settings.musicVolume,
    titleMusicVolume: titleMusic.volume,
    gameMusicVolume: gameMusic.volume,
    gameMusicOtherVolume: gameMusicOther.volume,
  });
}

// Create empty game board
function createBoard() {
  return Array(BOARD_HEIGHT)
    .fill()
    .map(() => Array(BOARD_WIDTH).fill(0));
}

// Create new piece
function createPiece() {
  const pieceType = Math.floor(Math.random() * 7) + 1;
  return {
    pos: { x: Math.floor(BOARD_WIDTH / 2) - 1, y: 0 },
    matrix: PIECES[pieceType],
    type: pieceType,
  };
}

// Draw a single block
function drawBlock(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
  ctx.strokeStyle = "#000";
  ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

// Draw the board
function drawBoard() {
  board.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        drawBlock(x, y, COLORS[value]);
      }
    });
  });
}

// Draw the current piece
function drawPiece() {
  if (!piece) return;
  piece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        drawBlock(x + piece.pos.x, y + piece.pos.y, COLORS[value]);
      }
    });
  });
}

// Check for collision
function checkCollision() {
  if (!piece) return false;
  for (let y = 0; y < piece.matrix.length; y++) {
    for (let x = 0; x < piece.matrix[y].length; x++) {
      if (
        piece.matrix[y][x] !== 0 &&
        (board[y + piece.pos.y] === undefined ||
          board[y + piece.pos.y][x + piece.pos.x] === undefined ||
          board[y + piece.pos.y][x + piece.pos.x] !== 0)
      ) {
        return true;
      }
    }
  }
  return false;
}

// Merge piece with board
function mergePiece() {
  piece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        board[y + piece.pos.y][x + piece.pos.x] = value;
      }
    });
  });
}

// Rotate piece
function rotatePiece(dir) {
  const pos = piece.pos.x;
  let offset = 1;
  const matrix = piece.matrix;

  // Get the actual dimensions
  const M = matrix.length; // height
  const N = matrix[0].length; // width

  // Create a new matrix with proper dimensions (swapped for rotation)
  const rotated = Array(N)
    .fill()
    .map(() => Array(M).fill(0));

  if (dir > 0) {
    // clockwise
    for (let y = 0; y < M; y++) {
      for (let x = 0; x < N; x++) {
        rotated[x][M - 1 - y] = matrix[y][x];
      }
    }
  } else {
    // counter-clockwise
    for (let y = 0; y < M; y++) {
      for (let x = 0; x < N; x++) {
        rotated[N - 1 - x][y] = matrix[y][x];
      }
    }
  }

  const oldMatrix = piece.matrix;
  piece.matrix = rotated;

  // Wall kick
  while (checkCollision()) {
    piece.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (Math.abs(offset) > piece.matrix[0].length) {
      piece.matrix = oldMatrix;
      piece.pos.x = pos;
      return;
    }
  }
}

// Clear completed lines
function clearLines() {
  let linesCleared = 0;
  outer: for (let y = board.length - 1; y >= 0; y--) {
    for (let x = 0; x < board[y].length; x++) {
      if (board[y][x] === 0) continue outer;
    }

    const row = board.splice(y, 1)[0].fill(0);
    board.unshift(row);
    linesCleared++;
    y++;
  }

  if (linesCleared > 0) {
    lines += linesCleared;
    score += linesCleared * 100 * level;
    document.getElementById("score").textContent = score;
    document.getElementById("lines").textContent = lines;
    if (score >= level * 1000) {
      level++;
      document.getElementById("level").textContent = level;
      // Update highest level if we've reached a new high
      updateHighestLevel(level);
    }
  }
}

// Update highest level reached
async function updateHighestLevel(newLevel) {
  try {
    console.log("Updating highest level to:", newLevel); // Debug log
    const settings = await loadSettings();
    console.log("Current settings:", settings); // Debug log

    if (newLevel > settings.highestLevel) {
      settings.highestLevel = newLevel;
      await settingsManager.saveSettings(settings);
      console.log("Saved new highest level:", newLevel); // Debug log

      // Update level select options
      updateLevelSelectOptions(settings.highestLevel);
    }
  } catch (error) {
    console.error("Error updating highest level:", error);
  }
}

// Update level select dropdown options
function updateLevelSelectOptions(maxLevel) {
  const levelSelect = document.getElementById("level-select");
  if (!levelSelect) {
    console.error("Level select element not found");
    return;
  }

  console.log("Updating level options to max level:", maxLevel); // Debug log
  levelSelect.innerHTML = ""; // Clear existing options

  // Always ensure at least level 1 is available
  maxLevel = Math.max(1, maxLevel);

  for (let i = 1; i <= maxLevel; i++) {
    const option = document.createElement("option");
    option.value = i.toString();
    option.textContent = i.toString();
    levelSelect.appendChild(option);
  }
}

// Move piece down
function dropPiece() {
  if (!piece) return;

  piece.pos.y++;
  if (checkCollision()) {
    piece.pos.y--;
    mergePiece();
    clearLines();

    // Check for game over
    if (piece.pos.y === 0) {
      gameOver = true;
      piece = null;
      nextPiece = null;
      dropCounter = 0;
      return;
    }

    piece = nextPiece;
    nextPiece = createPiece();
    drawNextPiece();
  }
  dropCounter = 0;
}

// Draw next piece preview
function drawNextPiece() {
  nextPieceCtx.fillStyle = "#000";
  nextPieceCtx.fillRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);

  if (!nextPiece) return;

  const offset = {
    x: (nextPieceCanvas.width / BLOCK_SIZE - nextPiece.matrix[0].length) / 2,
    y: (nextPieceCanvas.height / BLOCK_SIZE - nextPiece.matrix.length) / 2,
  };

  nextPiece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        nextPieceCtx.fillStyle = COLORS[value];
        nextPieceCtx.fillRect(
          (x + offset.x) * BLOCK_SIZE,
          (y + offset.y) * BLOCK_SIZE,
          BLOCK_SIZE,
          BLOCK_SIZE
        );
        nextPieceCtx.strokeStyle = "#000";
        nextPieceCtx.strokeRect(
          (x + offset.x) * BLOCK_SIZE,
          (y + offset.y) * BLOCK_SIZE,
          BLOCK_SIZE,
          BLOCK_SIZE
        );
      }
    });
  });
}

// Hard drop function
function hardDrop() {
  if (!piece) return;

  while (!checkCollision()) {
    piece.pos.y++;
  }
  piece.pos.y--;
  mergePiece();
  clearLines();

  // Check for game over
  if (piece.pos.y === 0) {
    gameOver = true;
    piece = null;
    nextPiece = null;
    dropCounter = 0;
    return;
  }

  piece = nextPiece;
  nextPiece = createPiece();
  drawNextPiece();
  dropCounter = 0;
}

// Reset game state
function resetGame() {
  board = createBoard();
  piece = null;
  nextPiece = null;
  score = 0;
  lines = 0;
  level = parseInt(document.getElementById("level-select").value) || 1;
  gameOver = false;
  isPaused = false;
  dropCounter = 0;
  lastTime = 0;

  // Update UI
  document.getElementById("score").textContent = "0";
  document.getElementById("lines").textContent = "0";
  document.getElementById("level").textContent = level;
}

// Function to get current game music element
async function getCurrentGameMusic() {
  const settings = await loadSettings();
  switch (settings.gameMusic) {
    case "classic1":
      return gameMusic;
    case "classic2":
      return gameMusicOther;
    default:
      return gameMusic;
  }
}

// Function to handle music transitions
function switchMusic(from, to) {
  if (from) {
    from.pause();
    from.currentTime = 0;
  }

  if (to) {
    // Apply current volume settings before playing
    applyAudioSettings().then(() => {
      to.play().catch((error) => {
        console.error(`Error playing audio:`, error);
      });
    });
  }
}

// Function to preview music track
function previewTrack(track) {
  // Clear any existing preview timeout
  if (previewTimeout) {
    clearTimeout(previewTimeout);
  }

  // Stop any currently playing preview
  gameMusic.pause();
  gameMusic.currentTime = 0;
  gameMusicOther.pause();
  gameMusicOther.currentTime = 0;

  const trackElement =
    track === "traditional"
      ? gameMusic
      : track === "other"
      ? gameMusicOther
      : null;

  if (trackElement) {
    trackElement
      .play()
      .catch((error) => console.error("Preview playback failed:", error));

    // Stop preview after 10 seconds
    previewTimeout = setTimeout(() => {
      trackElement.pause();
      trackElement.currentTime = 0;
    }, 10000);
  }
}

// Initialize game
async function init() {
  try {
    // Apply audio settings first
    await applyAudioSettings();

    // Load highest level and update level select
    const settings = await loadSettings();
    console.log("Loaded settings:", settings); // Debug log

    // Ensure highestLevel exists in settings
    if (typeof settings.highestLevel === "undefined") {
      settings.highestLevel = 1;
      await settingsManager.saveSettings(settings);
    }

    // Update level select with available levels
    updateLevelSelectOptions(settings.highestLevel);

    // Set the current level to 1 or the last selected level
    const levelSelect = document.getElementById("level-select");
    if (levelSelect && levelSelect.options.length > 0) {
      levelSelect.value = "1"; // Default to level 1
    }

    // Don't start the game immediately
    resetGame();

    // Start playing title music
    console.log("Starting title music");
    switchMusic(null, titleMusic);

    // Options button handler
    optionsButton.addEventListener("click", () => {
      console.log("Options button clicked");
      // Stop title music
      titleMusic.pause();
      titleMusic.currentTime = 0;

      // Navigate to options page
      window.location.href = "options.html";
    });

    // Play button click handler
    playButton.addEventListener("click", () => {
      console.log("Play button clicked");
      startGame();
    });

    // Event listeners for keyboard controls
    document.addEventListener("keydown", async (event) => {
      if (!gameStarted || gameOver) return;

      if (event.key === "p" || event.key === "P") {
        isPaused = !isPaused;
        if (!isPaused) {
          // Reset lastTime to prevent huge delta on unpause
          lastTime = performance.now();
          dropCounter = 0;
          // Resume game music if not in "none" mode
          const currentMusic = await getCurrentGameMusic();
          if (currentMusic) {
            currentMusic.play().catch((error) => {
              console.log("Audio playback failed:", error);
            });
          }
        }
        return;
      }

      // Don't process other keys if game is paused
      if (isPaused) return;

      switch (event.key) {
        case "ArrowLeft":
          piece.pos.x--;
          if (checkCollision()) piece.pos.x++;
          break;
        case "ArrowRight":
          piece.pos.x++;
          if (checkCollision()) piece.pos.x--;
          break;
        case "ArrowDown":
          piece.pos.y++;
          if (checkCollision()) {
            piece.pos.y--;
          }
          break;
        case "ArrowUp":
          hardDrop();
          break;
        case "z":
          rotatePiece(-1);
          break;
        case "x":
          rotatePiece(1);
          break;
      }
    });
  } catch (error) {
    console.error("Error during initialization:", error);
  }
}

// Start game
async function startGame() {
  console.log("Starting game, attempting to switch music");
  const gameTrackElement = await getCurrentGameMusic();
  console.log("Current game music state:", {
    element: gameTrackElement,
    src: gameTrackElement.querySelector("source").src,
    paused: gameTrackElement.paused,
    currentTime: gameTrackElement.currentTime,
    readyState: gameTrackElement.readyState,
  });

  resetGame();
  gameStarted = true;
  gameOver = false;
  piece = createPiece();
  nextPiece = createPiece();
  drawNextPiece();
  menuOverlay.style.display = "none";

  // Switch to game music
  switchMusic(titleMusic, gameTrackElement);

  lastTime = performance.now();
  update();
}

// Game loop
async function update(time = 0) {
  // Don't continue if game hasn't started
  if (!gameStarted) return;

  // Handle game over state first
  if (gameOver) {
    // Stop the game loop immediately
    gameStarted = false;

    // Stop the music
    const currentMusic = await getCurrentGameMusic();
    if (currentMusic) {
      currentMusic.pause();
      currentMusic.currentTime = 0;
    }

    // Draw the final board state
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawBoard();

    // Draw game over overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "48px Arial";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);

    // Return to menu after delay
    setTimeout(() => {
      menuOverlay.style.display = "flex";
      switchMusic(null, titleMusic);
      gameOver = false;
      isPaused = false;
    }, 2000);

    return;
  }

  // Handle pause state
  if (isPaused) {
    // Draw pause overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2);

    // Ensure music is paused
    const currentMusic = await getCurrentGameMusic();
    if (currentMusic) {
      currentMusic.pause();
    }

    requestAnimationFrame(update);
    return;
  }

  // Normal game update
  const deltaTime = time - lastTime;
  lastTime = time;

  dropCounter += deltaTime;
  if (dropCounter > 1000 - level * 50) {
    dropPiece();
  }

  // Clear canvas
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw game state
  drawBoard();
  if (piece) drawPiece();

  // Continue the game loop only if the game is still active
  if (gameStarted && !gameOver) {
    requestAnimationFrame(update);
  }
}

// Initialize the game (but don't start it)
init();
