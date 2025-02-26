// Canvas setup
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const nextPieceCanvas = document.getElementById("next-piece");
const nextPieceCtx = nextPieceCanvas.getContext("2d");

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
let board = createBoard();
let piece = null;
let nextPiece = null;
let score = 0;
let level = 1;
let gameOver = false;
let dropCounter = 0;
let lastTime = 0;

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
    score += linesCleared * 100 * level;
    document.getElementById("score").textContent = score;
    if (score >= level * 1000) {
      level++;
      document.getElementById("level").textContent = level;
    }
  }
}

// Move piece down
function dropPiece() {
  piece.pos.y++;
  if (checkCollision()) {
    piece.pos.y--;
    mergePiece();
    clearLines();
    if (piece.pos.y === 0) {
      // Game Over
      gameOver = true;
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

// Game loop
function update(time = 0) {
  if (gameOver) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "48px Arial";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
    return;
  }

  const deltaTime = time - lastTime;
  lastTime = time;

  dropCounter += deltaTime;
  if (dropCounter > 1000 - level * 50) {
    dropPiece();
  }

  // Clear canvas
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawBoard();
  drawPiece();

  requestAnimationFrame(update);
}

// Initialize game
function init() {
  piece = createPiece();
  nextPiece = createPiece();
  drawNextPiece();

  // Event listeners
  document.addEventListener("keydown", (event) => {
    if (gameOver) return;

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
      case "z":
        rotatePiece(-1);
        break;
      case "x":
        rotatePiece(1);
        break;
    }
  });
}

// Start game
init();
update();
