import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================
// 8-PUZZLE PRO — React Version
// ============================================================

const GOAL_STATE = [1, 2, 3, 4, 5, 6, 7, 8, 0];
const DIRECTION_NAMES = { '-3': '↑', '+3': '↓', '-1': '←', '+1': '→' };

const COLORS = {
  bg: '#07090e',
  card: '#0f1420',
  panel: 'rgba(22, 29, 45, 0.9)',
  text: '#ffffff',
  muted: '#94a3b8',
  cyan: '#00f2fe',
  purple: '#7000ff',
  pink: '#ff2a6d',
  gold: '#ffb703',
  green: '#05ffa1',
  danger: '#ef4444',
  warning: '#f59e0b',
  border: 'rgba(255, 255, 255, 0.12)',
  cell: 62,
  gap: 5,
};

// ============================================================
// BFS SOLVER
// ============================================================
function getMovableIndices(emptyIdx) {
  const row = Math.floor(emptyIdx / 3);
  const col = emptyIdx % 3;
  const n = [];
  if (row > 0) n.push(emptyIdx - 3);
  if (row < 2) n.push(emptyIdx + 3);
  if (col > 0) n.push(emptyIdx - 1);
  if (col < 2) n.push(emptyIdx + 1);
  return n;
}

function bfs(startState, goalState) {
  const startKey = startState.join(',');
  const goalKey = goalState.join(',');
  if (startKey === goalKey) return { path: [startState], moves: 0 };

  const queue = [{ state: startState, path: [startState] }];
  const visited = new Set([startKey]);

  while (queue.length > 0) {
    const { state, path } = queue.shift();
    const emptyIdx = state.indexOf(0);
    for (const neighbor of getMovableIndices(emptyIdx)) {
      const newState = [...state];
      [newState[emptyIdx], newState[neighbor]] = [newState[neighbor], newState[emptyIdx]];
      const newKey = newState.join(',');
      if (visited.has(newKey)) continue;
      visited.add(newKey);
      const newPath = [...path, newState];
      if (newKey === goalKey) return { path: newPath, moves: newPath.length - 1 };
      queue.push({ state: newState, path: newPath });
    }
  }
  return null;
}

function computeOptimalPath(state) {
  const result = bfs(state, GOAL_STATE);
  return result ? result.moves : 0;
}

function getDirection(fromEmpty, toEmpty) {
  const diff = toEmpty - fromEmpty;
  return diff > 0 ? `+${diff}` : `${diff}`;
}

function oppositeDirection(dir) {
  const map = { '-3': '+3', '+3': '-3', '-1': '+1', '+1': '-1' };
  return map[dir] || dir;
}

function isSolvable(state) {
  const tiles = state.filter(x => x !== 0);
  let inv = 0;
  for (let i = 0; i < tiles.length; i++)
    for (let j = i + 1; j < tiles.length; j++)
      if (tiles[i] > tiles[j]) inv++;
  return inv % 2 === 0;
}

function arraysEqual(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(seconds) {
  if (seconds < 60) return seconds.toFixed(1) + 's';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ============================================================
// STYLES
// ============================================================
const styles = `
  :root {
    --bg: ${COLORS.bg};
    --card: ${COLORS.card};
    --panel: ${COLORS.panel};
    --text: ${COLORS.text};
    --muted: ${COLORS.muted};
    --cyan: ${COLORS.cyan};
    --purple: ${COLORS.purple};
    --pink: ${COLORS.pink};
    --gold: ${COLORS.gold};
    --green: ${COLORS.green};
    --danger: ${COLORS.danger};
    --warning: ${COLORS.warning};
    --border: ${COLORS.border};
    --cell: ${COLORS.cell}px;
    --gap: ${COLORS.gap}px;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; -webkit-user-select: none; }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
  }

  .frame {
    width: 100vw;
    max-width: 390px;
    height: 100vh;
    max-height: 700px;
    aspect-ratio: 9 / 16;
    background: radial-gradient(circle at 50% 10%, #151c2e 0%, #07090e 100%);
    border-radius: 24px;
    border: 1px solid var(--border);
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.8), 0 0 30px rgba(0, 242, 254, 0.1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
  }

  .header {
    text-align: center;
    padding: 14px 16px 6px;
    flex-shrink: 0;
  }
  .badge {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 2px;
    text-transform: uppercase;
    background: linear-gradient(90deg, var(--cyan), var(--purple));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .title {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.3px;
    margin-top: 2px;
  }
  .subtitle {
    font-size: 11px;
    color: var(--muted);
    margin-top: 2px;
  }

  .content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0 14px 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    scrollbar-width: none;
  }
  .content::-webkit-scrollbar { display: none; }

  .phase-bar {
    display: flex;
    gap: 6px;
    justify-content: center;
    padding: 4px 0;
    flex-shrink: 0;
  }
  .phase-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(255,255,255,0.15);
    transition: all 0.3s;
  }
  .phase-dot.active { background: var(--cyan); box-shadow: 0 0 8px var(--cyan); }
  .phase-dot.done { background: var(--green); }

  .board-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  .board-label {
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1.5px;
  }
  .board-label.cyan { color: var(--cyan); }
  .board-label.green { color: var(--green); }
  .board-label.pink { color: var(--pink); }
  .board {
    display: grid;
    grid-template-columns: repeat(3, var(--cell));
    grid-template-rows: repeat(3, var(--cell));
    gap: var(--gap);
  }
  .tile {
    width: var(--cell);
    height: var(--cell);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    font-weight: 800;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.08);
    transition: all 0.2s;
    cursor: default;
    position: relative;
  }
  .tile.filled {
    background: linear-gradient(145deg, rgba(0,242,254,0.2), rgba(112,0,255,0.3));
    border-color: rgba(0,242,254,0.25);
    color: #fff;
  }
  .tile.empty {
    background: transparent;
    border: 2px dashed rgba(255,255,255,0.12);
    color: transparent;
  }
  .tile.movable { cursor: pointer; }
  .tile.movable:hover, .tile.movable:active {
    transform: scale(1.04);
    box-shadow: 0 0 18px rgba(0,242,254,0.25);
  }
  .tile.correct {
    border-color: var(--green);
    box-shadow: 0 0 10px rgba(5,255,161,0.2);
  }
  .tile.wrong {
    border-color: rgba(239,68,68,0.3);
  }
  .tile.selected {
    box-shadow: 0 0 0 2px var(--gold), 0 0 15px var(--gold);
    z-index: 2;
  }
  .tile.hint-glow {
    animation: hintPulse 1.2s ease infinite;
  }
  @keyframes hintPulse {
    0%, 100% { box-shadow: 0 0 5px var(--gold); }
    50% { box-shadow: 0 0 20px var(--gold), 0 0 40px var(--gold); }
  }

  .board-hint {
    font-size: 10px;
    color: var(--muted);
    text-align: center;
  }

  .ctrl-row {
    display: flex;
    gap: 6px;
    justify-content: center;
    flex-wrap: wrap;
  }
  .btn {
    padding: 8px 16px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--text);
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .btn:hover { background: rgba(255,255,255,0.06); }
  .btn-primary {
    background: linear-gradient(135deg, var(--cyan), var(--purple));
    border-color: transparent;
    color: #fff;
    box-shadow: 0 4px 15px rgba(0,242,254,0.2);
  }
  .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
  .btn-success {
    background: rgba(5,255,161,0.12);
    border-color: var(--green);
    color: var(--green);
  }
  .btn-gold {
    background: rgba(255,183,3,0.12);
    border-color: var(--gold);
    color: var(--gold);
  }
  .btn-danger {
    background: rgba(239,68,68,0.1);
    border-color: var(--danger);
    color: var(--danger);
  }
  .btn:disabled { opacity: 0.3; cursor: not-allowed; }

  .validation-msg {
    font-size: 11px;
    color: var(--danger);
    font-weight: 700;
    text-align: center;
    padding: 4px 0;
  }

  .analytics-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 12px;
  }
  .panel-title {
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--muted);
    margin-bottom: 10px;
  }

  .compact-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .cstat {
    background: var(--panel);
    border-radius: 10px;
    padding: 8px;
    text-align: center;
    border: 1px solid var(--border);
  }
  .cstat-label {
    font-size: 8px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 700;
  }
  .cstat-val {
    font-size: 18px;
    font-weight: 800;
    margin-top: 2px;
  }

  .efficiency-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    padding: 4px 0;
  }
  .eff-ring {
    width: 70px;
    height: 70px;
    position: relative;
    flex-shrink: 0;
  }
  .eff-ring svg { transform: rotate(-90deg); }
  .eff-text {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
  }
  .eff-score { font-size: 18px; font-weight: 800; }
  .eff-label { font-size: 8px; color: var(--muted); text-transform: uppercase; }
  .eff-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .eff-detail {
    font-size: 11px;
    color: var(--muted);
  }
  .eff-detail span { color: var(--text); font-weight: 700; }

  .progress-wrap {
    width: 100%;
    height: 4px;
    background: rgba(255,255,255,0.06);
    border-radius: 2px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--cyan), var(--green));
    border-radius: 2px;
    transition: width 0.5s ease;
    width: 0%;
  }

  .move-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 100px;
    overflow-y: auto;
    scrollbar-width: none;
  }
  .move-list::-webkit-scrollbar { display: none; }
  .move-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px 8px;
    background: var(--panel);
    border-radius: 6px;
    font-size: 11px;
    border: 1px solid var(--border);
  }
  .move-item.undo { border-color: rgba(239,68,68,0.3); }
  .mi-num { color: var(--cyan); font-weight: 700; width: 22px; }
  .mi-tile { font-weight: 700; }
  .mi-dir { color: var(--muted); }
  .mi-time { color: var(--muted); font-size: 10px; }

  .overlay {
    position: absolute;
    inset: 0;
    background: rgba(7,9,14,0.95);
    backdrop-filter: blur(12px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    text-align: center;
    gap: 14px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.4s;
    z-index: 30;
  }
  .overlay.show { opacity: 1; pointer-events: auto; }
  .ov-trophy { font-size: 44px; }
  .ov-title {
    font-size: 24px;
    font-weight: 800;
    background: linear-gradient(135deg, var(--green), var(--cyan));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .ov-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    width: 100%;
  }
  .ov-stat {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 10px;
  }
  .ov-stat-label { font-size: 9px; color: var(--muted); text-transform: uppercase; font-weight: 700; }
  .ov-stat-val { font-size: 18px; font-weight: 800; margin-top: 2px; }
  .ov-rating {
    background: linear-gradient(90deg, var(--pink), var(--purple));
    padding: 8px 18px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.5px;
    box-shadow: 0 8px 20px rgba(255,42,109,0.25);
  }

  .footer {
    padding: 8px 16px 12px;
    text-align: center;
    font-size: 9px;
    color: var(--muted);
    letter-spacing: 1px;
    text-transform: uppercase;
    font-weight: 700;
    flex-shrink: 0;
  }

  .hidden { display: none !important; }
`;

// ============================================================
// COMPONENTS
// ============================================================

function Tile({ value, index, onClick, className = '' }) {
  return (
    <div
      className={`tile ${value === 0 ? 'empty' : 'filled'} ${className}`}
      onClick={onClick}
    >
      {value === 0 ? '' : value}
    </div>
  );
}

function Board({ state, onTileClick, selectedIndex, gameActive, showGuide, hintIndex }) {
  const emptyIdx = state.indexOf(0);
  const movable = gameActive ? getMovableIndices(emptyIdx) : [];

  return (
    <div className="board">
      {state.map((value, index) => {
        let cls = '';
        if (index === selectedIndex) cls += ' selected';
        if (gameActive && movable.includes(index)) cls += ' movable';
        if (gameActive && showGuide && value !== 0) {
          cls += value === GOAL_STATE[index] ? ' correct' : ' wrong';
        }
        if (index === hintIndex) cls += ' hint-glow';
        return (
          <Tile
            key={index}
            value={value}
            index={index}
            onClick={() => onTileClick && onTileClick(index)}
            className={cls.trim()}
          />
        );
      })}
    </div>
  );
}

function MoveItem({ move }) {
  return (
    <div className={`move-item ${move.isBacktrack ? 'undo' : ''}`}>
      <span className="mi-num">#{move.moveNumber}</span>
      <span className="mi-tile">{move.tileValue}</span>
      <span className="mi-dir">{move.directionName}</span>
      <span className="mi-time">{(move.thinkTime / 1000).toFixed(1)}s</span>
    </div>
  );
}

function EfficiencyRing({ score, optimal, yourMoves, backtracks, bestStreak }) {
  const circumference = 2 * Math.PI * 30;
  const offset = circumference - (score / 100) * circumference;
  const strokeColor = score >= 80 ? 'var(--green)' : score >= 50 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div className="efficiency-wrap">
      <div className="eff-ring">
        <svg width="70" height="70" viewBox="0 0 70 70">
          <circle cx="35" cy="35" r="30" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
          <circle
            cx="35" cy="35" r="30" fill="none"
            stroke={strokeColor} strokeWidth="5"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s' }}
          />
        </svg>
        <div className="eff-text">
          <div className="eff-score">{score}</div>
          <div className="eff-label">%</div>
        </div>
      </div>
      <div className="eff-details">
        <div className="eff-detail">Optimal: <span>{optimal}</span></div>
        <div className="eff-detail">Your moves: <span>{yourMoves}</span></div>
        <div className="eff-detail">Backtracks: <span style={{ color: 'var(--danger)' }}>{backtracks}</span></div>
        <div className="eff-detail">Best streak: <span style={{ color: 'var(--green)' }}>{bestStreak}</span></div>
      </div>
    </div>
  );
}

function GameOverOverlay({ show, moves, time, efficiency, backtracks, onPlayAgain }) {
  let rating = '⭐ KEEP PRACTICING';
  if (efficiency >= 90) rating = '🏆 GRANDMASTER';
  else if (efficiency >= 75) rating = '⭐⭐ EXPERT';
  else if (efficiency >= 60) rating = '⭐⭐ ADVANCED';
  else if (efficiency >= 40) rating = '⭐ INTERMEDIATE';

  return (
    <div className={`overlay ${show ? 'show' : ''}`}>
      <div className="ov-trophy">🏆</div>
      <div className="ov-title">SOLVED!</div>
      <div style={{ color: 'var(--muted)', fontSize: '12px' }}>Puzzle completed successfully</div>
      <div className="ov-stats">
        <div className="ov-stat">
          <div className="ov-stat-label">Moves</div>
          <div className="ov-stat-val">{moves}</div>
        </div>
        <div className="ov-stat">
          <div className="ov-stat-label">Time</div>
          <div className="ov-stat-val">{time}</div>
        </div>
        <div className="ov-stat">
          <div className="ov-stat-label">Efficiency</div>
          <div className="ov-stat-val">{efficiency}%</div>
        </div>
        <div className="ov-stat">
          <div className="ov-stat-label">Backtracks</div>
          <div className="ov-stat-val">{backtracks}</div>
        </div>
      </div>
      <div className="ov-rating">{rating}</div>
      <div className="ctrl-row" style={{ marginTop: '4px' }}>
        <button className="btn btn-primary" onClick={onPlayAgain} style={{ padding: '10px 24px' }}>
          🎮 Play Again
        </button>
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [phase, setPhase] = useState(1);
  const [initialState, setInitialState] = useState([...GOAL_STATE]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [validationMsg, setValidationMsg] = useState('');

  const [currentState, setCurrentState] = useState([...GOAL_STATE]);
  const [gameActive, setGameActive] = useState(false);
  const [gameStartTime, setGameStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [moveHistory, setMoveHistory] = useState([]);
  const [lastMoveTime, setLastMoveTime] = useState(0);
  const [totalMoves, setTotalMoves] = useState(0);
  const [backtrackCount, setBacktrackCount] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [optimalPathLength, setOptimalPathLength] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [hintIndex, setHintIndex] = useState(-1);
  const [gameOver, setGameOver] = useState(false);

  const timerRef = useRef(null);

  // Timer
  useEffect(() => {
    if (gameActive) {
      timerRef.current = setInterval(() => {
        setElapsed((Date.now() - gameStartTime) / 1000);
      }, 200);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [gameActive, gameStartTime]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (phase !== 2 || !gameActive) return;
      const emptyIdx = currentState.indexOf(0);
      const movable = getMovableIndices(emptyIdx);
      let target = -1;
      switch (e.key) {
        case 'ArrowUp': target = movable.find(i => i === emptyIdx + 3); break;
        case 'ArrowDown': target = movable.find(i => i === emptyIdx - 3); break;
        case 'ArrowLeft': target = movable.find(i => i === emptyIdx + 1); break;
        case 'ArrowRight': target = movable.find(i => i === emptyIdx - 1); break;
      }
      if (target !== undefined && target !== -1) {
        e.preventDefault();
        handleGameMove(target);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, gameActive, currentState]);

  // Setup handlers
  const handleSetupClick = useCallback((index) => {
    setSelectedIndex(prev => {
      if (prev === -1) return index;
      if (prev === index) return -1;
      setInitialState(state => {
        const newState = [...state];
        [newState[prev], newState[index]] = [newState[index], newState[prev]];
        return newState;
      });
      setValidationMsg('');
      return -1;
    });
  }, []);

  const shuffleSetup = useCallback(() => {
    setInitialState(shuffleArray([...GOAL_STATE]));
    setSelectedIndex(-1);
    setValidationMsg('');
  }, []);

  const resetSetup = useCallback(() => {
    setInitialState([...GOAL_STATE]);
    setSelectedIndex(-1);
    setValidationMsg('');
  }, []);

  const confirmSetup = useCallback(() => {
    if (arraysEqual(initialState, GOAL_STATE)) {
      setValidationMsg('Initial state cannot be the same as goal!');
      return;
    }
    if (!isSolvable(initialState)) {
      setValidationMsg('This puzzle is unsolvable! Try a different arrangement.');
      return;
    }
    setPhase(2);
    startPlaying();
  }, [initialState]);

  // Game handlers
  const startPlaying = useCallback(() => {
    const opt = computeOptimalPath(initialState);
    setCurrentState([...initialState]);
    setGameActive(true);
    setGameStartTime(Date.now());
    setElapsed(0);
    setLastMoveTime(Date.now());
    setTotalMoves(0);
    setBacktrackCount(0);
    setMoveHistory([]);
    setBestStreak(0);
    setCurrentStreak(0);
    setOptimalPathLength(opt);
    setShowGuide(false);
    setHintIndex(-1);
    setGameOver(false);
  }, [initialState]);

  const handleGameMove = useCallback((tileIndex) => {
    if (!gameActive) return;
    setCurrentState(prev => {
      const emptyIdx = prev.indexOf(0);
      const movable = getMovableIndices(emptyIdx);
      if (!movable.includes(tileIndex)) return prev;

      const now = Date.now();
      const tileValue = prev[tileIndex];
      const direction = getDirection(emptyIdx, tileIndex);

      const newState = [...prev];
      [newState[emptyIdx], newState[tileIndex]] = [newState[tileIndex], newState[emptyIdx]];

      setMoveHistory(history => {
        const isBacktrack = history.length > 0 &&
          history[history.length - 1].tileValue === tileValue &&
          history[history.length - 1].direction === oppositeDirection(direction);

        if (isBacktrack) {
          setBacktrackCount(c => c + 1);
          setCurrentStreak(0);
        } else {
          setCurrentStreak(c => {
            const nc = c + 1;
            setBestStreak(b => Math.max(b, nc));
            return nc;
          });
        }

        const newMove = {
          moveNumber: totalMoves + 1,
          tileValue,
          direction,
          directionName: DIRECTION_NAMES[direction] || direction,
          thinkTime: now - lastMoveTime,
          isBacktrack,
        };
        return [newMove, ...history];
      });

      setTotalMoves(c => c + 1);
      setLastMoveTime(now);

      if (arraysEqual(newState, GOAL_STATE)) {
        setGameActive(false);
        setGameOver(true);
      }

      return newState;
    });
  }, [gameActive, totalMoves, lastMoveTime]);

  const hintMove = useCallback(() => {
    if (!gameActive) return;
    const result = bfs(currentState, GOAL_STATE);
    if (result && result.path.length > 1) {
      const nextState = result.path[1];
      for (let i = 0; i < 9; i++) {
        if (currentState[i] !== 0 && nextState[i] === 0) {
          setHintIndex(i);
          setTimeout(() => setHintIndex(-1), 1500);
          break;
        }
      }
    }
  }, [gameActive, currentState]);

  const toggleGuide = useCallback(() => {
    setShowGuide(prev => !prev);
  }, []);

  const giveUp = useCallback(async () => {
    if (!gameActive) return;
    setGameActive(false);
    const result = bfs(currentState, GOAL_STATE);
    if (result) {
      for (let i = 0; i < result.path.length; i++) {
        setCurrentState([...result.path[i]]);
        await sleep(300);
      }
    }
  }, [gameActive, currentState]);

  const resetAll = useCallback(() => {
    setPhase(1);
    setInitialState([...GOAL_STATE]);
    setSelectedIndex(-1);
    setGameActive(false);
    setGameOver(false);
    setValidationMsg('');
    clearInterval(timerRef.current);
  }, []);

  // Derived values
  const efficiency = optimalPathLength > 0 && totalMoves > 0
    ? Math.round((optimalPathLength / totalMoves) * 100)
    : 100;

  const progress = currentState.length === 9
    ? Math.round((currentState.filter((v, i) => v === GOAL_STATE[i]).length / 9) * 100)
    : 0;

  const effColor = efficiency >= 80 ? 'var(--green)' : efficiency >= 50 ? 'var(--warning)' : 'var(--danger)';

  const titles = {
    1: ['Setup Puzzle', 'Tap two tiles to swap · Arrange your initial state'],
    2: ['Solve the Puzzle', 'Slide tiles to reach the goal state'],
  };

  return (
    <>
      <style>{styles}</style>
      <div className="frame">
        {/* HEADER */}
        <div className="header">
          <div className="badge">8-Puzzle Pro</div>
          <div className="title">{titles[phase][0]}</div>
          <div className="subtitle">{titles[phase][1]}</div>
        </div>

        {/* PHASE BAR */}
        <div className="phase-bar">
          <div className={`phase-dot ${phase === 1 ? 'active' : 'done'}`} />
          <div className={`phase-dot ${phase === 2 ? 'active' : ''}`} />
        </div>

        {/* CONTENT */}
        <div className="content">
          {/* SETUP: Initial State */}
          {phase === 1 && (
            <div className="board-card">
              <div className="board-label cyan">🎯 Initial State</div>
              <Board
                state={initialState}
                onTileClick={handleSetupClick}
                selectedIndex={selectedIndex}
              />
              <div className="board-hint">Tap two tiles to swap them</div>
              <div className="ctrl-row">
                <button className="btn" onClick={shuffleSetup}>🔀 Shuffle</button>
                <button className="btn btn-gold" onClick={resetSetup}>↩️ Reset</button>
                <button className="btn btn-primary" onClick={confirmSetup}>✓ Start Game</button>
              </div>
              {validationMsg && <div className="validation-msg">{validationMsg}</div>}
            </div>
          )}

          {/* GOAL STATE */}
          {phase === 1 && (
            <div className="board-card">
              <div className="board-label green">🏁 Goal State (Fixed)</div>
              <Board state={GOAL_STATE} />
              <div className="board-hint">Standard solved configuration</div>
            </div>
          )}

          {/* PLAY: Game Board */}
          {phase === 2 && (
            <div className="board-card">
              <div className="board-label pink">🎮 Playing</div>
              <Board
                state={currentState}
                onTileClick={handleGameMove}
                gameActive={gameActive}
                showGuide={showGuide}
                hintIndex={hintIndex}
              />
              <div className="board-hint">Tap tiles adjacent to empty space</div>
              <div className="ctrl-row">
                <button className="btn btn-success" onClick={hintMove}>💡 Hint</button>
                <button className="btn" onClick={toggleGuide}>👁️ Guide</button>
                <button className="btn btn-danger" onClick={giveUp}>🏳️</button>
              </div>
            </div>
          )}

          {/* PLAY: Progress */}
          {phase === 2 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--muted)', marginBottom: '4px' }}>
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="progress-wrap">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* PLAY: Live Stats */}
          {phase === 2 && (
            <div className="analytics-card">
              <div className="panel-title">📊 Live Stats</div>
              <div className="compact-stats">
                <div className="cstat">
                  <div className="cstat-label">Moves</div>
                  <div className="cstat-val" style={{ color: 'var(--cyan)' }}>{totalMoves}</div>
                </div>
                <div className="cstat">
                  <div className="cstat-label">Time</div>
                  <div className="cstat-val" style={{ color: 'var(--gold)' }}>{formatTime(elapsed)}</div>
                </div>
                <div className="cstat">
                  <div className="cstat-label">Efficiency</div>
                  <div className="cstat-val" style={{ color: effColor }}>{efficiency}%</div>
                </div>
              </div>
            </div>
          )}

          {/* PLAY: Efficiency Ring */}
          {phase === 2 && (
            <div className="analytics-card">
              <div className="panel-title">🎯 Performance</div>
              <EfficiencyRing
                score={efficiency}
                optimal={optimalPathLength}
                yourMoves={totalMoves}
                backtracks={backtrackCount}
                bestStreak={bestStreak}
              />
            </div>
          )}

          {/* PLAY: Move History */}
          {phase === 2 && (
            <div className="analytics-card">
              <div className="panel-title">📋 Moves</div>
              <div className="move-list">
                {moveHistory.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '11px', padding: '10px' }}>No moves yet</div>
                ) : (
                  moveHistory.slice(0, 15).map((move, i) => (
                    <MoveItem key={i} move={move} />
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="footer">
          {phase === 1 ? 'Step 1 of 2: Set Initial State' : 'Step 2 of 2: Playing'}
        </div>

        {/* GAME OVER OVERLAY */}
        <GameOverOverlay
          show={gameOver}
          moves={totalMoves}
          time={formatTime(elapsed)}
          efficiency={efficiency}
          backtracks={backtrackCount}
          onPlayAgain={resetAll}
        />
      </div>
    </>
  );
}
