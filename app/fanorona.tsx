import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Line, Circle, G, Defs, RadialGradient, Stop } from "react-native-svg";

import Colors from "@/constants/colors";
import {
  COLS, ROWS, DIRS,
  hasDir, idx, inB, count,
  neighbors, getCaptures, applyCaptures, hasAnyCapture,
  initBoard, generateMoves,
  neuralEval, TT, minimax, getBestMove,
  type MultiState, type Move,
} from "@/game-logic/fanorona-logic";

const T = Colors.theme;
const SCREEN_W = Dimensions.get("window").width;

// ── Rendering constants (UI only, not logic) ────────────────────────────────
// The board is logically ROWS(5) x COLS(9). We rotate 90 degrees visually.
// So width relies on ROWS(5) and height relies on COLS(9).
const CELL = Math.min(65, Math.floor((SCREEN_W - 40) / (ROWS - 1)));
const PAD = CELL / 2;
const BOARD_W = PAD * 2 + CELL * (ROWS - 1);
const BOARD_H = PAD * 2 + CELL * (COLS - 1);
// Map r (0..4) -> X axis, c (0..8) -> Y axis
const cx = (r: number) => PAD + r * CELL;
const cy = (c: number) => PAD + c * CELL;

// ── Board SVG View ───────────────────────────────────────────────────────────
function BoardView({
  board, selected, validMoves, captureChoices, lastMoved,
  onCellClick, aiThinking, gameMode,
}: {
  board: number[];
  selected: [number,number] | null;
  validMoves: [number,number][];
  captureChoices: [number,number][];
  lastMoved: [number,number] | null;
  onCellClick: (r:number,c:number) => void;
  aiThinking: boolean;
  gameMode: string;
}) {
  const lines: React.ReactNode[] = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++)
    for (const [dr, dc] of DIRS) {
      if (dr < 0 || (dr === 0 && dc < 0)) continue;
      if (!hasDir(r, c, dr, dc)) continue;
      const nr = r + dr, nc = c + dc;
      if (!inB(nr, nc)) continue;
      lines.push(
        <Line key={`l${r}${c}${dr}${dc}`}
          x1={cx(r)} y1={cy(c)} x2={cx(nr)} y2={cy(nc)}
          stroke={T.boardLine} strokeWidth={1.5}
        />
      );
    }

  const cells: React.ReactNode[] = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const i = idx(r, c), piece = board[i];
    const isSel = selected && selected[0] === r && selected[1] === c;
    const isValid = validMoves.some(([vr, vc]) => vr === r && vc === c);
    const isCap = captureChoices && captureChoices.some(([cr, cc]) => cr === r && cc === c);
    const isLast = lastMoved && lastMoved[0] === r && lastMoved[1] === c;
    const handlePress = () => !aiThinking && onCellClick(r, c);

    if (isSel) cells.push(<Circle key={`sr${i}`} cx={cx(r)} cy={cy(c)} r={CELL * 0.55} fill={T.green} fillOpacity={0.2} />);
    if (isValid && !piece) cells.push(
      <Circle key={`v${i}`} cx={cx(r)} cy={cy(c)} r={CELL * 0.28} fill={T.green} fillOpacity={0.5}
        stroke={T.green} strokeWidth={1.5} onPress={handlePress} />
    );
    if (isCap) cells.push(
      <Circle key={`cp${i}`} cx={cx(r)} cy={cy(c)} r={CELL * 0.36} fill={T.orange} fillOpacity={0.25}
        stroke={T.orange} strokeWidth={2} />
    );

    if (piece) {
      const isP1 = piece === 1;
      const isAI = gameMode === "hva" && !isP1;
      const fill = isAI ? "url(#gAI)" : isP1 ? "url(#gP1)" : "url(#gP2)";
      const strokeC = isSel ? T.orange : isLast ? "#FFCC80" : isP1 ? "#E64A19" : "#424242";
      cells.push(
        <G key={`pc${i}`} onPress={handlePress}>
          <Circle cx={cx(r) + 1.5} cy={cy(c) + 2.5} r={CELL * 0.44} fill="rgba(0,0,0,0.15)" />
          <Circle cx={cx(r)} cy={cy(c)} r={CELL * 0.44} fill={fill}
            stroke={strokeC} strokeWidth={isSel || isLast ? 3 : 1.8} />
          <Circle cx={cx(r) - CELL * 0.13} cy={cy(c) - CELL * 0.13} r={CELL * 0.12} fill="rgba(255,255,255,0.4)" />
          {isLast && <Circle cx={cx(r)} cy={cy(c)} r={CELL * 0.5} fill="none" stroke={T.orangeLight} strokeWidth={2} strokeDasharray="4,3" />}
        </G>
      );
    } else if (!isValid) {
      cells.push(
        <Circle key={`d${i}`} cx={cx(r)} cy={cy(c)} r={3} fill={T.boardLine}
          onPress={handlePress} />
      );
    }

    // Invisible touch target for the whole cell
    cells.push(
      <Circle key={`hit${i}`} cx={cx(r)} cy={cy(c)} r={CELL * 0.5}
        fill="transparent" onPress={handlePress} />
    );
  }

  return (
    <View style={{ borderRadius: 12, overflow: "hidden", backgroundColor: "#FFFDE7" }}>
      <Svg width={BOARD_W} height={BOARD_H}>
        <Defs>
          <RadialGradient id="gP1" cx="35%" cy="35%" r="65%">
            <Stop offset="0%" stopColor="#FFCC80" />
            <Stop offset="100%" stopColor="#BF360C" />
          </RadialGradient>
          <RadialGradient id="gP2" cx="35%" cy="35%" r="65%">
            <Stop offset="0%" stopColor="#616161" />
            <Stop offset="100%" stopColor="#1a1a1a" />
          </RadialGradient>
          <RadialGradient id="gAI" cx="35%" cy="35%" r="65%">
            <Stop offset="0%" stopColor="#616161" />
            <Stop offset="100%" stopColor="#1a1a1a" />
          </RadialGradient>
        </Defs>
        {lines}
        {cells}
      </Svg>
    </View>
  );
}

// ── Main Game Component ──────────────────────────────────────────────────────
export default function FanoronaScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const [gameMode, setGameMode] = useState<"menu" | "hvh" | "hva">("menu");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [board, setBoard] = useState<number[]>(initBoard());
  const [turn, setTurn] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<[number,number] | null>(null);
  const [validMoves, setValidMoves] = useState<[number,number][]>([]);
  const [phase, setPhase] = useState<"select" | "capture-choice" | "multi-capture">("select");
  const [pendingMove, setPendingMove] = useState<any>(null);
  const [captureChoices, setCaptureChoices] = useState<[number,number][]>([]);
  const [lastMoved, setLastMoved] = useState<[number,number] | null>(null);
  const [multiCapState, setMultiCapState] = useState<MultiState | null>(null);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"normal" | "capture" | "ai" | "winner">("normal");
  const [winner, setWinner] = useState<number | null>(null);
  const [scores, setScores] = useState<[number,number]>([0, 0]);
  const [aiThinking, setAiThinking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const AI_P = 2;
  const isAiTurn = gameMode === "hva" && turn === AI_P && !winner;
  const p1c = count(board, 1), p2c = count(board, 2);
  const curBoard = multiCapState ? multiCapState.board : board;
  const dispBoard = phase === "capture-choice" ? board : curBoard;

  // ── AI effect ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAiTurn || phase !== "select") return;
    setAiThinking(true);
    setStatus("L'IA analyse le plateau...");
    setStatusType("ai");
    timerRef.current = setTimeout(() => {
      const move = getBestMove(board, AI_P, difficulty);
      setAiThinking(false);
      if (!move) { doEndTurn(board); return; }
      doAiMove(board, move, null);
    }, 700);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [turn, phase, isAiTurn]);

  useEffect(() => {
    if (!isAiTurn || phase !== "multi-capture" || !multiCapState) return;
    setAiThinking(true);
    timerRef.current = setTimeout(() => {
      const moves = generateMoves(multiCapState.board, AI_P, multiCapState);
      setAiThinking(false);
      if (!moves.length) { doEndTurn(multiCapState.board); return; }
      let best: Move | null = null, bv = -Infinity;
      moves.forEach(m => { const v = neuralEval(m.board, AI_P); if (v > bv) { bv = v; best = m; } });
      if (best) doAiMove(multiCapState.board, best, multiCapState);
    }, 500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase, multiCapState, isAiTurn]);

  // ── Move helpers ────────────────────────────────────────────────────────
  function getValidForPiece(b: number[], r: number, c: number, player: 1 | 2, ms: MultiState | null): [number,number][] {
    const force = hasAnyCapture(b, player);
    return neighbors(r, c)
      .filter(([nr, nc]) => {
        if (b[idx(nr, nc)] !== 0) return false;
        if (ms && ms.visitedCells.some(([a, bb]) => a === nr && bb === nc)) return false;
        const { approach, withdraw } = getCaptures(b, r, c, nr, nc);
        const has = approach.length || withdraw.length;
        if ((force || ms) && !has) return false;
        return true;
      })
      .map(([nr, nc]) => [nr, nc] as [number,number]);
  }

  function handleCellClick(r: number, c: number) {
    if (winner || aiThinking) return;
    if (gameMode === "hva" && turn === AI_P) return;

    if (phase === "capture-choice") {
      const { approachCaptures: ac, withdrawCaptures: wc, newBoardBase: base, toR, toC, fromR, fromC } = pendingMove;
      let chosen: [number,number][] | null = null;
      if (ac.some(([cr, cc]: [number,number]) => cr === r && cc === c)) chosen = ac;
      else if (wc.some(([cr, cc]: [number,number]) => cr === r && cc === c)) chosen = wc;
      if (!chosen) return;
      finalize(applyCaptures(base, chosen), toR, toC, fromR, fromC, chosen, chosen === ac ? "approach" : "withdraw");
      return;
    }

    const cb = multiCapState ? multiCapState.board : board;
    if (phase === "multi-capture") {
      const [pr, pc] = multiCapState!.movedPiece;
      if (validMoves.some(([vr, vc]) => vr === r && vc === c)) doHumanMove(cb, pr, pc, r, c, multiCapState);
      return;
    }
    if (cb[idx(r, c)] === turn) {
      setSelected([r, c]); setValidMoves(getValidForPiece(cb, r, c, turn, null)); return;
    }
    if (selected && validMoves.some(([vr, vc]) => vr === r && vc === c)) {
      doHumanMove(cb, selected[0], selected[1], r, c, null); return;
    }
    setSelected(null); setValidMoves([]);
  }

  function doHumanMove(cb: number[], fr: number, fc: number, tr: number, tc: number, ms: MultiState | null) {
    const base = [...cb]; base[idx(tr, tc)] = turn; base[idx(fr, fc)] = 0;
    const { approach: ac, withdraw: wc } = getCaptures(cb, fr, fc, tr, tc);
    if (ac.length && wc.length) {
      setPhase("capture-choice");
      setPendingMove({ approachCaptures: ac, withdrawCaptures: wc, newBoardBase: base, toR: tr, toC: tc, fromR: fr, fromC: fc });
      setBoard(base); setSelected([tr, tc]); setValidMoves([]);
      setCaptureChoices([...ac, ...wc] as [number,number][]); setLastMoved([tr, tc]);
      setStatus("Choisissez la direction de capture !"); setStatusType("capture");
      return;
    }
    const caps = ac.length ? ac : wc.length ? wc : [] as [number,number][];
    finalize(applyCaptures(base, caps), tr, tc, fr, fc, caps, ac.length ? "approach" : "withdraw", ms);
  }

  function doAiMove(cb: number[], move: Move, ms: MultiState | null) {
    const base = [...cb]; base[idx(move.toR, move.toC)] = AI_P; base[idx(move.fromR, move.fromC)] = 0;
    finalize(applyCaptures(base, move.caps), move.toR, move.toC, move.fromR, move.fromC, move.caps, move.capType, ms);
  }

  function finalize(nb: number[], toR: number, toC: number, fromR: number, fromC: number, caps: [number,number][], capType: string, prevMs: MultiState | null = null) {
    setCaptureChoices([]); setLastMoved([toR, toC]);
    const opp = turn === 1 ? 2 : 1;
    if (count(nb, opp) === 0) {
      setBoard(nb); setWinner(turn);
      setScores(prev => { const s = [...prev] as [number,number]; s[turn - 1]++; return s; });
      setStatus(`Joueur ${turn === AI_P && gameMode === "hva" ? "IA" : turn} gagne !`);
      setStatusType("winner");
      setPhase("select"); setSelected(null); setValidMoves([]); setMultiCapState(null);
      return;
    }
    if (caps.length) {
      const vis = prevMs
        ? [...prevMs.visitedCells, [toR, toC] as [number,number]]
        : [[fromR, fromC], [toR, toC]] as [number,number][];
      const nm: MultiState = { movedPiece: [toR, toC], visitedCells: vis, board: nb };
      const cont = generateMoves(nb, turn, nm);
      if (cont.length) {
        setBoard(nb); setPhase("multi-capture"); setMultiCapState(nm);
        setSelected([toR, toC]); setValidMoves(cont.map(m => [m.toR, m.toC] as [number,number]));
        setStatus(`${gameMode === "hva" && turn === AI_P ? "IA continue" : `Joueur ${turn} continue`} !`);
        setStatusType("capture");
        return;
      }
    }
    doEndTurn(nb);
  }

  function doEndTurn(nb: number[]) {
    const next = (turn === 1 ? 2 : 1) as 1 | 2;
    setBoard(nb); setTurn(next);
    setPhase("select"); setSelected(null); setValidMoves([]);
    setMultiCapState(null); setPendingMove(null);
    const p1 = count(nb, 1), p2 = count(nb, 2);
    setStatus(gameMode === "hva"
      ? next === 1 ? `Votre tour — ${p1} vs ${p2}` : ""
      : `Joueur ${next} — ${p1} vs ${p2}`);
    setStatusType("normal");
  }

  function startGame(mode: "hvh" | "hva") {
    setGameMode(mode); setBoard(initBoard()); setTurn(1);
    setSelected(null); setValidMoves([]); setPhase("select");
    setPendingMove(null); setCaptureChoices([]); setLastMoved(null);
    setMultiCapState(null); setWinner(null); setAiThinking(false);
    setStatus(mode === "hva" ? "Votre tour (Rouge) !" : "Joueur 1 commence !");
    setStatusType("normal");
  }

  // ── MENU ────────────────────────────────────────────────────────────────
  if (gameMode === "menu") {
    return (
      <View style={[styles.root, { backgroundColor: T.bg }]}>
        <ScrollView
          contentContainerStyle={[styles.scroll, {
            paddingTop: topPad + 16,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 24,
          }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Nav */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={T.green} />
            <Text style={styles.backText}>Collection</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.menuHeader}>
            <View style={styles.menuIcon}>
              <MaterialCommunityIcons name="chess-queen" size={40} color={T.white} />
            </View>
            <Text style={styles.menuTitle}>Fanorona Sivy</Text>
            <Text style={styles.menuSub}>Jeu Traditionnel Malgache · IA Intégrée</Text>
          </View>

          {/* Mode */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mode de jeu</Text>
            <View style={styles.modeRow}>
              <TouchableOpacity style={styles.modeBtn} onPress={() => startGame("hvh")} activeOpacity={0.8}>
                <Ionicons name="people" size={28} color={T.green} />
                <Text style={styles.modeBtnTitle}>Humain</Text>
                <Text style={styles.modeBtnSub}>vs Humain</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modeBtn, styles.modeBtnPrimary]} onPress={() => startGame("hva")} activeOpacity={0.8}>
                <MaterialCommunityIcons name="robot" size={28} color={T.white} />
                <Text style={[styles.modeBtnTitle, { color: T.white }]}>Humain</Text>
                <Text style={[styles.modeBtnSub, { color: "rgba(255,255,255,0.75)" }]}>vs IA</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Difficulty */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Niveau de l'IA</Text>
            <View style={styles.diffRow}>
              {(["easy", "medium", "hard"] as const).map((d, i) => {
                const labels = ["Facile", "Moyen", "Expert"];
                const colors = [T.greenLight, T.orange, "#C62828"];
                const isActive = difficulty === d;
                return (
                  <TouchableOpacity
                    key={d}
                    style={[styles.diffBtn, isActive && { borderColor: colors[i], backgroundColor: colors[i] + "20" }]}
                    onPress={() => setDifficulty(d)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.diffBtnText, isActive && { color: colors[i] }]}>{labels[i]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.diffHint}>
              Profondeur Minimax : {({ easy: 1, medium: 2, hard: 3 })[difficulty]} niveau{difficulty === "easy" ? "" : "x"}
            </Text>
          </View>

          {/* AI Info */}
          <View style={[styles.section, styles.aiCard]}>
            <Text style={[styles.sectionTitle, { color: T.ai }]}>Architecture IA</Text>
            {[
              ["Minimax + Alpha-Beta", "Arbre de jeu (théorie des graphes)"],
              ["Réseau de Neurones", "12 features → 8 neurones → score"],
              ["Table de Transposition", "Cache des positions évaluées"],
            ].map(([title, desc]) => (
              <View key={title} style={styles.aiRow}>
                <MaterialCommunityIcons name="circle-small" size={18} color={T.ai} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.aiTitle}>{title}</Text>
                  <Text style={styles.aiDesc}>{desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── GAME ────────────────────────────────────────────────────────────────
  const isAiP = (p: number) => gameMode === "hva" && p === AI_P;
  const activeBg = (p: number) => p === 1 ? "#BF360C" : "#2a2a2a";

  const renderPlayerCard = (p: 1 | 2) => {
    const active = turn === p && !winner;
    return (
      <View style={[
        styles.playerCard,
        active && { backgroundColor: activeBg(p), borderColor: "transparent" },
      ]}>
        <View style={[styles.playerDot, {
          backgroundColor: p === 1 ? "#BF360C" : "#424242",
          borderColor: active ? T.white : p === 1 ? "#FFCC80" : "#757575",
        }]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.playerName, active && { color: T.white }]}>
            {p === 1 ? "Joueur 1" : isAiP(2) ? "IA" : "Joueur 2"}
          </Text>
          <Text style={[styles.playerPieces, active && { color: "rgba(255,255,255,0.7)" }]}>
            {p === 1 ? p1c : p2c} pièces
          </Text>
        </View>
        {active && aiThinking && (
          <View style={styles.thinkingDots}>
            {[0, 1, 2].map(i => (
              <View key={i} style={[styles.thinkingDot, { opacity: 0.4 + i * 0.3 }]} />
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: T.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, {
          paddingTop: topPad + 12,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 24,
        }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.topBack} onPress={() => setGameMode("menu")}>
            <Ionicons name="chevron-back" size={20} color={T.white} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Fanorona Sivy</Text>
          <View style={styles.topScore}>
            <Text style={styles.topScoreP1}>{scores[0]}</Text>
            <Text style={styles.topScoreVs}>vs</Text>
            <Text style={styles.topScoreP2}>{scores[1]}</Text>
          </View>
        </View>

        {/* Player 2 (Top) */}
        <View style={{ marginBottom: 12 }}>
          {renderPlayerCard(2)}
        </View>

        {/* Status */}
        {!!status && (
          <View style={[styles.statusBar, {
            backgroundColor: winner
              ? T.green
              : statusType === "capture" ? T.orange
              : statusType === "ai" ? T.ai
              : T.card,
            borderWidth: statusType === "normal" ? 1.5 : 0,
            borderColor: T.greenPale,
          }]}>
            <Text style={[styles.statusText, {
              color: statusType !== "normal" ? T.white : T.black,
            }]}>{status}</Text>
          </View>
        )}

        {/* Board */}
        <View style={[styles.boardWrapper, { opacity: aiThinking ? 0.88 : 1 }]}>
          <BoardView
            board={dispBoard}
            selected={phase === "multi-capture" && multiCapState ? multiCapState.movedPiece : selected}
            validMoves={validMoves}
            captureChoices={captureChoices}
            lastMoved={lastMoved}
            onCellClick={handleCellClick}
            aiThinking={aiThinking}
            gameMode={gameMode}
          />
        </View>

        {/* Buttons */}
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.newGameBtn} onPress={() => startGame(gameMode as "hvh" | "hva")}>
            <Ionicons name="refresh" size={18} color={T.white} />
            <Text style={styles.newGameBtnText}>Nouvelle Partie</Text>
          </TouchableOpacity>
          {phase === "multi-capture" && !(gameMode === "hva" && turn === AI_P) && (
            <TouchableOpacity
              style={styles.endTurnBtn}
              onPress={() => multiCapState && doEndTurn(multiCapState.board)}
            >
              <Ionicons name="checkmark" size={18} color={T.white} />
              <Text style={styles.newGameBtnText}>Fin du tour</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Player 1 (Bottom) */}
        <View style={{ marginBottom: 14 }}>
          {renderPlayerCard(1)}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          {[
            [T.greenAccent, "Mouvements valides"],
            [T.orange, "Captures possibles"],
            ["#BF360C", "Joueur 1 (Rouge)"],
            ["#424242", gameMode === "hva" ? "IA (Noir)" : "Joueur 2 (Noir)"],
          ].map(([col, lbl]) => (
            <View key={String(lbl)} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: col as string }]} />
              <Text style={styles.legendText}>{String(lbl)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16, flexGrow: 1 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 24 },
  backText: { fontSize: 15, color: T.green, fontWeight: "700" },
  menuHeader: { alignItems: "center", marginBottom: 28 },
  menuIcon: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: T.green, alignItems: "center", justifyContent: "center",
    marginBottom: 14,
    shadowColor: T.green, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16,
    elevation: 8,
  },
  menuTitle: { fontSize: 28, fontWeight: "900", color: T.green, marginBottom: 6 },
  menuSub: { fontSize: 12, color: T.textMuted, fontWeight: "600", textAlign: "center", letterSpacing: 0.5 },
  section: {
    backgroundColor: T.card, borderRadius: 16, padding: 16,
    marginBottom: 14, borderWidth: 1.5, borderColor: T.greenPale,
  },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: T.black, marginBottom: 12 },
  modeRow: { flexDirection: "row", gap: 10 },
  modeBtn: {
    flex: 1, borderRadius: 14, padding: 16, alignItems: "center", gap: 6,
    borderWidth: 2, borderColor: T.greenPale, backgroundColor: T.card,
  },
  modeBtnPrimary: { backgroundColor: T.green, borderColor: T.green },
  modeBtnTitle: { fontSize: 14, fontWeight: "800", color: T.black },
  modeBtnSub: { fontSize: 11, fontWeight: "600", color: T.gray },
  diffRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  diffBtn: {
    flex: 1, paddingVertical: 11, borderRadius: 10,
    borderWidth: 2, borderColor: T.greenPale, alignItems: "center",
  },
  diffBtnText: { fontSize: 12, fontWeight: "800", color: T.gray },
  diffHint: { fontSize: 11, color: T.gray, textAlign: "center", fontWeight: "600" },
  aiCard: { borderColor: T.aiPale },
  aiRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginBottom: 8 },
  aiTitle: { fontSize: 12, fontWeight: "800", color: T.ai },
  aiDesc: { fontSize: 11, color: T.textMuted, fontWeight: "600" },
  topBar: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: T.green, borderRadius: 16, padding: 12,
    marginBottom: 14, gap: 10,
  },
  topBack: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center",
  },
  topTitle: { flex: 1, fontSize: 16, fontWeight: "900", color: T.white },
  topScore: { flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  topScoreP1: { fontSize: 16, fontWeight: "900", color: T.greenAccent },
  topScoreVs: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.5)" },
  topScoreP2: { fontSize: 16, fontWeight: "900", color: T.orangeLight },
  playerRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  playerCard: {
    flex: 1, borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: T.card, borderWidth: 2, borderColor: T.greenPale,
  },
  playerDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2.5 },
  playerName: { fontSize: 13, fontWeight: "800", color: T.black },
  playerPieces: { fontSize: 11, fontWeight: "600", color: T.gray, marginTop: 2 },
  thinkingDots: { flexDirection: "row", gap: 4 },
  thinkingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.white },
  statusBar: {
    borderRadius: 12, padding: 11, marginBottom: 12, alignItems: "center",
  },
  statusText: { fontSize: 13, fontWeight: "700" },
  boardWrapper: {
    backgroundColor: T.card, borderRadius: 18, padding: 10,
    marginBottom: 14, alignSelf: "center",
    shadowColor: T.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 20,
    elevation: 8, borderWidth: 1.5, borderColor: T.greenPale,
  },
  btnRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  newGameBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 13, borderRadius: 14, backgroundColor: T.green,
  },
  endTurnBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 13, borderRadius: 14, backgroundColor: T.orange,
  },
  newGameBtnText: { fontSize: 14, fontWeight: "800", color: T.white },
  legend: {
    backgroundColor: T.card, borderRadius: 14, padding: 14,
    flexDirection: "row", flexWrap: "wrap", gap: 10,
    borderWidth: 1.5, borderColor: T.greenPale,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 7, width: "45%" },
  legendDot: { width: 9, height: 9, borderRadius: 4.5 },
  legendText: { fontSize: 12, color: T.black, fontWeight: "600" },
});
