import { useRef, useEffect, useState } from "react";
import "./App.css";

const DOT_RADIUS = 6;
const PADDING = 32;
const LINE_WIDTH = 4;
const BOX_SIZE = 48;
const PLAYER_COLOR = "#2196f3"; // Brighter blue
const COMPUTER_COLOR = "#e53935"; // Brighter red
const LINE_COLOR = "#333";
const DOT_COLOR = "#222";

// Types for the game state
interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  owner: null | "player" | "computer";
}

interface Box {
  row: number;
  col: number;
  owner: null | "player" | "computer";
}

function getInitialLines(size: number) {
  const lines: Line[] = [];
  // Horizontal lines
  for (let row = 0; row <= size; row++) {
    for (let col = 0; col < size; col++) {
      lines.push({
        x1: col,
        y1: row,
        x2: col + 1,
        y2: row,
        owner: null,
      });
    }
  }
  // Vertical lines
  for (let row = 0; row < size; row++) {
    for (let col = 0; col <= size; col++) {
      lines.push({
        x1: col,
        y1: row,
        x2: col,
        y2: row + 1,
        owner: null,
      });
    }
  }
  return lines;
}

function getInitialBoxes(size: number) {
  const boxes: Box[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      boxes.push({ row, col, owner: null });
    }
  }
  return boxes;
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lines, setLines] = useState<Line[]>(getInitialLines(10));
  const [boxes, setBoxes] = useState<Box[]>(getInitialBoxes(10));
  const [scores, setScores] = useState({ player: 0, computer: 0 });
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);
  const [currentTurn, setCurrentTurn] = useState<"player" | "computer">("player");
  // Track the last move
  const [lastMove, setLastMove] = useState<{ idx: number; owner: "player" | "computer"; completedCount: number } | null>(null);
  // Add grid size selection state
  const [gridSize, setGridSize] = useState<number>(10);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  // Winner state
  const [winner, setWinner] = useState<string | null>(null);

  // Reset game when grid size changes or when user starts a new game
  useEffect(() => {
    setLines(getInitialLines(gridSize));
    setBoxes(getInitialBoxes(gridSize));
    setScores({ player: 0, computer: 0 });
    setHighlightedLine(null);
    setCurrentTurn("player");
    setLastMove(null);
  }, [gridSize, gameStarted]);

  // Draw the board
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fill the whole board area with white background
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Draw background grid for better visibility
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = "#888";
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        ctx.fillRect(PADDING + col * BOX_SIZE, PADDING + row * BOX_SIZE, BOX_SIZE, BOX_SIZE);
      }
    }
    ctx.restore();

    // Draw boxes
    boxes.forEach((box) => {
      if (box.owner) {
        ctx.fillStyle = box.owner === "player" ? PLAYER_COLOR + "33" : COMPUTER_COLOR + "33";
        ctx.fillRect(
          PADDING + box.col * BOX_SIZE + LINE_WIDTH / 2,
          PADDING + box.row * BOX_SIZE + LINE_WIDTH / 2,
          BOX_SIZE - LINE_WIDTH,
          BOX_SIZE - LINE_WIDTH
        );
      }
    });

    // Draw lines
    lines.forEach((line, idx) => {
      ctx.beginPath();
      ctx.moveTo(PADDING + line.x1 * BOX_SIZE, PADDING + line.y1 * BOX_SIZE);
      ctx.lineTo(PADDING + line.x2 * BOX_SIZE, PADDING + line.y2 * BOX_SIZE);
      ctx.lineWidth = LINE_WIDTH;
      if (highlightedLine === idx) {
        ctx.strokeStyle = COMPUTER_COLOR;
        ctx.shadowColor = COMPUTER_COLOR;
        ctx.shadowBlur = 16;
      } else {
        ctx.strokeStyle = line.owner ? (line.owner === "player" ? PLAYER_COLOR : COMPUTER_COLOR) : LINE_COLOR;
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = line.owner || highlightedLine === idx ? 1 : 0.25;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    });

    // Draw dots
    for (let row = 0; row <= gridSize; row++) {
      for (let col = 0; col <= gridSize; col++) {
        ctx.beginPath();
        ctx.arc(PADDING + col * BOX_SIZE, PADDING + row * BOX_SIZE, DOT_RADIUS, 0, 2 * Math.PI);
        ctx.fillStyle = DOT_COLOR;
        ctx.fill();
      }
    }
  }, [lines, boxes, highlightedLine]);

  // Handle player click
  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (currentTurn !== "player") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - PADDING;
    const y = e.clientY - rect.top - PADDING;
    // Find the closest line
    let minDist = 9999;
    let closestIdx = -1;
    lines.forEach((line, idx) => {
      if (line.owner) return;
      const x1 = line.x1 * BOX_SIZE;
      const y1 = line.y1 * BOX_SIZE;
      const x2 = line.x2 * BOX_SIZE;
      const y2 = line.y2 * BOX_SIZE;
      // Distance from point to line segment
      const dx = x2 - x1;
      const dy = y2 - y1;
      const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
      const px = x1 + t * dx;
      const py = y1 + t * dy;
      const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = idx;
      }
    });
    if (closestIdx === -1 || minDist > 16) return; // Only allow if close enough
    claimLine(closestIdx, "player");
  }

  // Claim a line and check for completed boxes, updating all state in sequence
  function claimLine(idx: number, owner: "player" | "computer") {
    setLines((prevLines) => {
      if (prevLines[idx].owner) return prevLines;
      const newLines = prevLines.map((l, i) => (i === idx ? { ...l, owner } : l));
      // Check for completed boxes
      const newBoxes = boxes.map((box) => {
        if (box.owner) return box;
        const top = newLines.find((l) => l.x1 === box.col && l.y1 === box.row && l.x2 === box.col + 1 && l.y2 === box.row);
        const right = newLines.find((l) => l.x1 === box.col + 1 && l.y1 === box.row && l.x2 === box.col + 1 && l.y2 === box.row + 1);
        const bottom = newLines.find((l) => l.x1 === box.col && l.y1 === box.row + 1 && l.x2 === box.col + 1 && l.y2 === box.row + 1);
        const left = newLines.find((l) => l.x1 === box.col && l.y1 === box.row && l.x2 === box.col && l.y2 === box.row + 1);
        if (top?.owner && right?.owner && bottom?.owner && left?.owner && !box.owner) {
          return { ...box, owner };
        }
        return box;
      });
      setBoxes(newBoxes);
      // Only count boxes completed in this move (not cumulative)
      const completedCount = newBoxes.filter((b, i) => !boxes[i].owner && b.owner === owner).length;
      if (completedCount > 0) {
        setScores((prev) => ({ ...prev, [owner]: prev[owner] + completedCount }));
      }
      // Logging
      console.log(`[MOVE] ${owner.toUpperCase()} claims line #${idx}`, newLines[idx]);
      setLastMove({ idx, owner, completedCount });
      return newLines;
    });
  }

  // Turn switching logic: this is where the turn actually changes
  useEffect(() => {
    if (!lastMove) return;
    // Only switch turn if NO box was completed by the last move (in this move)
    // Use the completedCount from the last move, which is the only reliable way
    // We'll store completedCount in lastMove
    // So update claimLine to setLastMove({ idx, owner, completedCount })
    if (lastMove.completedCount === 0) {
      setCurrentTurn((prev) => (prev === "player" ? "computer" : "player"));
    }
    setLastMove(null);
  }, [lines, boxes]);

  // Log when currentTurn changes
  useEffect(() => {
    console.log(`[TURN] Now it's ${currentTurn}'s turn`);
  }, [currentTurn]);

  // Computer AI to make a move
  useEffect(() => {
    if (currentTurn !== "computer") return;
    // Prevent computer from making multiple moves in a row
    if (lastMove && lastMove.owner === "computer") return;

    // --- SMARTER AI LOGIC ---
    // 1. Find all available lines
    const availableLines = lines.map((line, idx) => ({ ...line, idx })).filter((line) => !line.owner);

    // 2. Find lines that would complete a box (i.e., the 4th side)
    function wouldCompleteABox(lineIdx: number) {
      return boxes.some((box) => {
        // Get the 4 lines for this box
        const boxLines = [
          lines.findIndex((l) => l.x1 === box.col && l.y1 === box.row && l.x2 === box.col + 1 && l.y2 === box.row), // top
          lines.findIndex((l) => l.x1 === box.col + 1 && l.y1 === box.row && l.x2 === box.col + 1 && l.y2 === box.row + 1), // right
          lines.findIndex((l) => l.x1 === box.col && l.y1 === box.row + 1 && l.x2 === box.col + 1 && l.y2 === box.row + 1), // bottom
          lines.findIndex((l) => l.x1 === box.col && l.y1 === box.row && l.x2 === box.col && l.y2 === box.row + 1), // left
        ];
        if (!boxLines.includes(lineIdx)) return false;
        // Count how many of the other 3 lines are already owned
        const otherLines = boxLines.filter((idx) => idx !== lineIdx);
        const ownedCount = otherLines.filter((idx) => lines[idx]?.owner).length;
        return ownedCount === 3 && !box.owner;
      });
    }

    // 3. Find lines that would give the player a box (avoid these if possible)
    function wouldGivePlayerABox(lineIdx: number) {
      return boxes.some((box) => {
        const boxLines = [
          lines.findIndex((l) => l.x1 === box.col && l.y1 === box.row && l.x2 === box.col + 1 && l.y2 === box.row), // top
          lines.findIndex((l) => l.x1 === box.col + 1 && l.y1 === box.row && l.x2 === box.col + 1 && l.y2 === box.row + 1), // right
          lines.findIndex((l) => l.x1 === box.col && l.y1 === box.row + 1 && l.x2 === box.col + 1 && l.y2 === box.row + 1), // bottom
          lines.findIndex((l) => l.x1 === box.col && l.y1 === box.row && l.x2 === box.col && l.y2 === box.row + 1), // left
        ];
        if (!boxLines.includes(lineIdx)) return false;
        const otherLines = boxLines.filter((idx) => idx !== lineIdx);
        const ownedCount = otherLines.filter((idx) => lines[idx]?.owner).length;
        return ownedCount === 2 && !box.owner;
      });
    }

    // 4. With some probability, try to complete a box if possible
    let candidateLines = availableLines;
    const boxCompletingLines = availableLines.filter((line) => wouldCompleteABox(line.idx));
    if (boxCompletingLines.length > 0 && Math.random() < 0.7) {
      // 70% chance to take a box
      candidateLines = boxCompletingLines;
    } else {
      // Otherwise, avoid giving the player a box if possible
      const safeLines = availableLines.filter((line) => !wouldGivePlayerABox(line.idx));
      if (safeLines.length > 0) {
        candidateLines = safeLines;
      }
    }

    // 5. Pick a random line from the candidates
    const choice = candidateLines[Math.floor(Math.random() * candidateLines.length)];
    if (choice) {
      setTimeout(() => claimLine(choice.idx, "computer"), 500);
    }
  }, [currentTurn, lines, lastMove, boxes]);

  // Check for game end and declare winner
  useEffect(() => {
    if (!gameStarted) return;
    const allBoxesFilled = boxes.every((box) => box.owner !== null);
    if (allBoxesFilled) {
      if (scores.player > scores.computer) {
        setWinner("Player wins!");
      } else if (scores.computer > scores.player) {
        setWinner("Computer wins!");
      } else {
        setWinner("It's a tie!");
      }
    } else {
      setWinner(null);
    }
  }, [boxes, scores, gameStarted]);

  return (
    <div className="App">
      <h1 style={{ color: "#eee", textAlign: "center", marginTop: 24, marginBottom: 8 }}>Dots and Boxes</h1>
      {!gameStarted && (
        <div style={{ margin: 24 }}>
          <label htmlFor="grid-size-select">Select grid size: </label>
          <select id="grid-size-select" value={gridSize} onChange={(e) => setGridSize(Number(e.target.value))}>
            {[5, 6, 7, 8, 9, 10, 12, 15].map((size) => (
              <option key={size} value={size}>
                {size} x {size}
              </option>
            ))}
          </select>
          <button style={{ marginLeft: 16 }} onClick={() => setGameStarted(true)}>
            Start Game
          </button>
        </div>
      )}
      {gameStarted && (
        <>
          <canvas ref={canvasRef} width={PADDING * 2 + BOX_SIZE * gridSize} height={PADDING * 2 + BOX_SIZE * gridSize} onClick={handleCanvasClick} />
          <div className="scores">
            <div>Player: {scores.player}</div>
            <div>Computer: {scores.computer}</div>
          </div>
          {winner && (
            <div
              style={{
                marginTop: 24,
                fontSize: 28,
                fontWeight: 700,
                color: winner.includes("Player") ? PLAYER_COLOR : winner.includes("Computer") ? COMPUTER_COLOR : "#888",
                textAlign: "center",
                background: "#fff",
                borderRadius: 8,
                padding: 16,
                boxShadow: "0 2px 8px #0002",
              }}
            >
              {winner}
            </div>
          )}
          <button style={{ marginTop: 16 }} onClick={() => setGameStarted(false)}>
            New Game
          </button>
        </>
      )}
    </div>
  );
}

export default App;
