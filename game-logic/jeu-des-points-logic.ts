// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════
export const GRID_SIZE = 15;
export const PLAYER_1 = 0;
export const PLAYER_2 = 1;

export const DIRS_8 = [
  [-1,-1],[-1,0],[-1,1],
  [0,-1],        [0,1],
  [1,-1], [1,0], [1,1]
];

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════
export interface LineData {
  id: string;
  r1: number; c1: number;
  r2: number; c2: number;
  player: number;
}

export interface MoveResult {
  newBoard: (number | null)[][];
  newCapturedBy: (number | null)[][];
  newLines: LineData[];
  pointsCaptured: number;
  isFull: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// PURE LOGIC — LOGIQUE DE CAPTURE (inchangée)
// ══════════════════════════════════════════════════════════════════════════════
export function processMove(
  board: (number | null)[][],
  capturedBy: (number | null)[][],
  currentPlayer: number,
  r: number,
  c: number
): MoveResult {
  const newBoard = board.map(row => [...row]);
  newBoard[r][c] = currentPlayer;
  const newCapturedBy = capturedBy.map(row => [...row]);
  let pointsCapturedInTurn = 0;
  const newLines: LineData[] = [];

  // ── LOGIQUE DE CAPTURE (inchangée) ──────────────────────────────────────
  const isWall = (row: number, col: number) =>
    newBoard[row][col] === currentPlayer || newCapturedBy[row][col] === currentPlayer;

  const escapes = Array(GRID_SIZE).fill(false).map(() => Array(GRID_SIZE).fill(false));
  const queue: {r:number,c:number}[] = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (i === 0 || i === GRID_SIZE - 1 || j === 0 || j === GRID_SIZE - 1) {
        if (!isWall(i, j)) { escapes[i][j] = true; queue.push({ r: i, c: j }); }
      }
    }
  }
  let head = 0;
  while (head < queue.length) {
    const { r: cr, c: cc } = queue[head++];
    for (const [dr, dc] of DIRS_8) {
      const nr = cr + dr, nc = cc + dc;
      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
        if (!escapes[nr][nc] && !isWall(nr, nc)) { escapes[nr][nc] = true; queue.push({ r: nr, c: nc }); }
      }
    }
  }

  const regionVisited = Array(GRID_SIZE).fill(false).map(() => Array(GRID_SIZE).fill(false));
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (!escapes[i][j] && !isWall(i, j) && !regionVisited[i][j]) {
        const region: {r:number,c:number}[] = [];
        let hasOpponentPoint = false;
        let opponentPointsCount = 0;
        const rq = [{ r: i, c: j }];
        regionVisited[i][j] = true;
        let rHead = 0;
        while (rHead < rq.length) {
          const curr = rq[rHead++];
          region.push(curr);
          if (newBoard[curr.r][curr.c] === (1 - currentPlayer) && newCapturedBy[curr.r][curr.c] === null) {
            hasOpponentPoint = true; opponentPointsCount++;
          }
          for (const [dr, dc] of DIRS_8) {
            const nr = curr.r + dr, nc = curr.c + dc;
            if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
              if (!escapes[nr][nc] && !isWall(nr, nc) && !regionVisited[nr][nc]) {
                regionVisited[nr][nc] = true; rq.push({ r: nr, c: nc });
              }
            }
          }
        }

        if (hasOpponentPoint) {
          // ── Mise à jour des captures (logique inchangée) ────────────────
          region.forEach(({ r: rr, c: rc }) => { if (newCapturedBy[rr][rc] === null) newCapturedBy[rr][rc] = currentPlayer; });
          pointsCapturedInTurn += opponentPointsCount;

          // ── Calcul des lignes : PÉRIMÈTRE EXTÉRIEUR seulement ───────────
          const componentSet = new Set(region.map(({ r: rr, c: rc }) => `${rr},${rc}`));

          const boundaryPoints = new Set<string>();
          region.forEach(({ r: rr, c: rc }) => {
            for (const [dr, dc] of DIRS_8) {
              const nr = rr + dr, nc = rc + dc;
              if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && newBoard[nr][nc] === currentPlayer)
                boundaryPoints.add(`${nr},${nc}`);
            }
          });

          const boundaryArray = Array.from(boundaryPoints).map(s => {
            const [br, bc] = s.split(',').map(Number);
            return { r: br, c: bc };
          });

          boundaryArray.forEach(({ r: br, c: bc }) => {
            // ── Voisin de droite : ligne horizontale (br,bc)→(br,bc+1) ──
            if (boundaryPoints.has(`${br},${bc + 1}`)) {
              const aboveInComp =
                componentSet.has(`${br - 1},${bc}`) ||
                componentSet.has(`${br - 1},${bc + 1}`);
              const belowInComp =
                componentSet.has(`${br + 1},${bc}`) ||
                componentSet.has(`${br + 1},${bc + 1}`);
              if (!(aboveInComp && belowInComp)) {
                newLines.push({
                  id: `line-${br}-${bc}-H-${Date.now()}-${Math.random()}`,
                  r1: br, c1: bc, r2: br, c2: bc + 1, player: currentPlayer,
                });
              }
            }

            // ── Voisin du bas : ligne verticale (br,bc)→(br+1,bc) ──────
            if (boundaryPoints.has(`${br + 1},${bc}`)) {
              const leftInComp =
                componentSet.has(`${br},${bc - 1}`) ||
                componentSet.has(`${br + 1},${bc - 1}`);
              const rightInComp =
                componentSet.has(`${br},${bc + 1}`) ||
                componentSet.has(`${br + 1},${bc + 1}`);
              if (!(leftInComp && rightInComp)) {
                newLines.push({
                  id: `line-${br}-${bc}-V-${Date.now()}-${Math.random()}`,
                  r1: br, c1: bc, r2: br + 1, c2: bc, player: currentPlayer,
                });
              }
            }
          });
        }
      }
    }
  }
  // ── Fin logique ─────────────────────────────────────────────────────────

  let isFull = true;
  for (let i = 0; i < GRID_SIZE; i++)
    for (let j = 0; j < GRID_SIZE; j++)
      if (newBoard[i][j] === null && newCapturedBy[i][j] === null) { isFull = false; break; }

  return { newBoard, newCapturedBy, newLines, pointsCaptured: pointsCapturedInTurn, isFull };
}

export function createEmptyBoard(): (number | null)[][] {
  return Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
}

// ══════════════════════════════════════════════════════════════════════════════
// DYNAMIC GRID SIZE — same logic, gridSize passed as parameter
// ══════════════════════════════════════════════════════════════════════════════
export function createEmptyBoardN(n: number): (number | null)[][] {
  return Array(n).fill(null).map(() => Array(n).fill(null));
}

export function processMoveN(
  board: (number | null)[][],
  capturedBy: (number | null)[][],
  currentPlayer: number,
  r: number,
  c: number,
  n: number
): MoveResult {
  const newBoard = board.map(row => [...row]);
  newBoard[r][c] = currentPlayer;
  const newCapturedBy = capturedBy.map(row => [...row]);
  let pointsCapturedInTurn = 0;
  const newLines: LineData[] = [];

  // ── LOGIQUE DE CAPTURE (inchangée) ──────────────────────────────────────
  const isWall = (row: number, col: number) =>
    newBoard[row][col] === currentPlayer || newCapturedBy[row][col] === currentPlayer;

  const escapes = Array(n).fill(false).map(() => Array(n).fill(false));
  const queue: {r:number,c:number}[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === 0 || i === n - 1 || j === 0 || j === n - 1) {
        if (!isWall(i, j)) { escapes[i][j] = true; queue.push({ r: i, c: j }); }
      }
    }
  }
  let head = 0;
  while (head < queue.length) {
    const { r: cr, c: cc } = queue[head++];
    for (const [dr, dc] of DIRS_8) {
      const nr = cr + dr, nc = cc + dc;
      if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
        if (!escapes[nr][nc] && !isWall(nr, nc)) { escapes[nr][nc] = true; queue.push({ r: nr, c: nc }); }
      }
    }
  }

  const regionVisited = Array(n).fill(false).map(() => Array(n).fill(false));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (!escapes[i][j] && !isWall(i, j) && !regionVisited[i][j]) {
        const region: {r:number,c:number}[] = [];
        let hasOpponentPoint = false;
        let opponentPointsCount = 0;
        const rq = [{ r: i, c: j }];
        regionVisited[i][j] = true;
        let rHead = 0;
        while (rHead < rq.length) {
          const curr = rq[rHead++];
          region.push(curr);
          if (newBoard[curr.r][curr.c] === (1 - currentPlayer) && newCapturedBy[curr.r][curr.c] === null) {
            hasOpponentPoint = true; opponentPointsCount++;
          }
          for (const [dr, dc] of DIRS_8) {
            const nr = curr.r + dr, nc = curr.c + dc;
            if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
              if (!escapes[nr][nc] && !isWall(nr, nc) && !regionVisited[nr][nc]) {
                regionVisited[nr][nc] = true; rq.push({ r: nr, c: nc });
              }
            }
          }
        }

        if (hasOpponentPoint) {
          region.forEach(({ r: rr, c: rc }) => { if (newCapturedBy[rr][rc] === null) newCapturedBy[rr][rc] = currentPlayer; });
          pointsCapturedInTurn += opponentPointsCount;

          const componentSet = new Set(region.map(({ r: rr, c: rc }) => `${rr},${rc}`));
          const boundaryPoints = new Set<string>();
          region.forEach(({ r: rr, c: rc }) => {
            for (const [dr, dc] of DIRS_8) {
              const nr = rr + dr, nc = rc + dc;
              if (nr >= 0 && nr < n && nc >= 0 && nc < n && newBoard[nr][nc] === currentPlayer)
                boundaryPoints.add(`${nr},${nc}`);
            }
          });

          const boundaryArray = Array.from(boundaryPoints).map(s => {
            const [br, bc] = s.split(',').map(Number);
            return { r: br, c: bc };
          });

          boundaryArray.forEach(({ r: br, c: bc }) => {
            if (boundaryPoints.has(`${br},${bc + 1}`)) {
              const aboveInComp = componentSet.has(`${br - 1},${bc}`) || componentSet.has(`${br - 1},${bc + 1}`);
              const belowInComp = componentSet.has(`${br + 1},${bc}`) || componentSet.has(`${br + 1},${bc + 1}`);
              if (!(aboveInComp && belowInComp)) {
                newLines.push({ id: `line-${br}-${bc}-H-${Date.now()}-${Math.random()}`, r1: br, c1: bc, r2: br, c2: bc + 1, player: currentPlayer });
              }
            }
            if (boundaryPoints.has(`${br + 1},${bc}`)) {
              const leftInComp = componentSet.has(`${br},${bc - 1}`) || componentSet.has(`${br + 1},${bc - 1}`);
              const rightInComp = componentSet.has(`${br},${bc + 1}`) || componentSet.has(`${br + 1},${bc + 1}`);
              if (!(leftInComp && rightInComp)) {
                newLines.push({ id: `line-${br}-${bc}-V-${Date.now()}-${Math.random()}`, r1: br, c1: bc, r2: br + 1, c2: bc, player: currentPlayer });
              }
            }
          });
        }
      }
    }
  }
  // ── Fin logique ─────────────────────────────────────────────────────────

  let isFull = true;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      if (newBoard[i][j] === null && newCapturedBy[i][j] === null) { isFull = false; break; }

  return { newBoard, newCapturedBy, newLines, pointsCaptured: pointsCapturedInTurn, isFull };
}

export function expandBoardN(
  board: (number | null)[][],
  capturedBy: (number | null)[][],
  oldN: number,
  newN: number
): { newBoard: (number | null)[][], newCapturedBy: (number | null)[][] } {
  const newBoard = Array(newN).fill(null).map((_, r) =>
    Array(newN).fill(null).map((_, c) =>
      r < oldN && c < oldN ? board[r][c] : null
    )
  );
  const newCapturedBy = Array(newN).fill(null).map((_, r) =>
    Array(newN).fill(null).map((_, c) =>
      r < oldN && c < oldN ? capturedBy[r][c] : null
    )
  );
  return { newBoard, newCapturedBy };
}
