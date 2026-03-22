import React, { useState, useCallback, useRef } from "react";
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
import Svg, {
  Line, Circle, Rect, G, Defs, RadialGradient, Stop,
} from "react-native-svg";

import Colors from "@/constants/colors";
import {
  GRID_SIZE as BASE_GRID_SIZE,
  PLAYER_1, PLAYER_2,
  createEmptyBoardN, processMoveN, expandBoardN,
  type LineData,
} from "@/game-logic/jeu-des-points-logic";

const T = Colors.theme;
const SCREEN_W = Dimensions.get("window").width;
const CELL_SIZE = Math.max(42, Math.floor(SCREEN_W / 10));
const EXPAND_BY = 5;
const MAX_EXPANSIONS = 4;

function getStarPoints(n: number): number[] {
  const stars: number[] = [];
  const base = [3, 7, 11];
  for (const s of base) if (s < n - 1) stars.push(s);
  return stars;
}

// ── Board SVG Component ───────────────────────────────────────────────────────
function BoardView({
  board, capturedBy, lines, currentPlayer, gridSize, gameOver, onPress,
}: {
  board: (number | null)[][];
  capturedBy: (number | null)[][];
  lines: LineData[];
  currentPlayer: number;
  gridSize: number;
  gameOver: boolean;
  onPress: (r: number, c: number) => void;
}) {
  const boardPx = gridSize * CELL_SIZE;
  const starPoints = getStarPoints(gridSize);

  const canPlace = (r: number, c: number) =>
    board[r][c] === null && capturedBy[r][c] === null && !gameOver;

  return (
    <Svg width={boardPx} height={boardPx}>
      <Defs>
        <RadialGradient id="p1Grad" cx="38%" cy="32%" r="65%">
          <Stop offset="0%" stopColor={T.greenPale} />
          <Stop offset="45%" stopColor={T.green} />
          <Stop offset="100%" stopColor="#1B5E20" />
        </RadialGradient>
        <RadialGradient id="p2Grad" cx="38%" cy="32%" r="65%">
          <Stop offset="0%" stopColor="#FFCC80" />
          <Stop offset="45%" stopColor={T.orange} />
          <Stop offset="100%" stopColor="#BF360C" />
        </RadialGradient>
      </Defs>

      {/* Board background */}
      <Rect x={0} y={0} width={boardPx} height={boardPx} fill="#F9FBE7" />

      {/* Grid lines */}
      {Array.from({ length: gridSize }).map((_, i) => (
        <React.Fragment key={`gl-${i}`}>
          <Line
            x1={CELL_SIZE / 2} y1={i * CELL_SIZE + CELL_SIZE / 2}
            x2={boardPx - CELL_SIZE / 2} y2={i * CELL_SIZE + CELL_SIZE / 2}
            stroke="rgba(46,125,50,0.28)" strokeWidth={0.8}
          />
          <Line
            x1={i * CELL_SIZE + CELL_SIZE / 2} y1={CELL_SIZE / 2}
            x2={i * CELL_SIZE + CELL_SIZE / 2} y2={boardPx - CELL_SIZE / 2}
            stroke="rgba(46,125,50,0.28)" strokeWidth={0.8}
          />
        </React.Fragment>
      ))}

      {/* Board border */}
      <Rect
        x={CELL_SIZE / 2 - 0.5} y={CELL_SIZE / 2 - 0.5}
        width={boardPx - CELL_SIZE + 1} height={boardPx - CELL_SIZE + 1}
        fill="none" stroke="rgba(46,125,50,0.5)" strokeWidth={1.5}
      />

      {/* Expansion boundary highlight — show the original 15×15 zone */}
      {gridSize > BASE_GRID_SIZE && (
        <Rect
          x={CELL_SIZE / 2 - 0.5} y={CELL_SIZE / 2 - 0.5}
          width={BASE_GRID_SIZE * CELL_SIZE - CELL_SIZE + 1}
          height={BASE_GRID_SIZE * CELL_SIZE - CELL_SIZE + 1}
          fill="none" stroke="rgba(46,125,50,0.18)" strokeWidth={1} strokeDasharray="4,4"
        />
      )}

      {/* Star points */}
      {starPoints.flatMap(sr => starPoints.map(sc => (
        <Circle key={`star-${sr}-${sc}`}
          cx={sc * CELL_SIZE + CELL_SIZE / 2} cy={sr * CELL_SIZE + CELL_SIZE / 2}
          r={2.5} fill="rgba(46,125,50,0.4)"
        />
      )))}

      {/* Captured zone fill */}
      {capturedBy.map((row, r) =>
        row.map((owner, c) => owner !== null && (
          <Rect key={`cap-${r}-${c}`}
            x={c * CELL_SIZE + 0.5} y={r * CELL_SIZE + 0.5}
            width={CELL_SIZE - 1} height={CELL_SIZE - 1}
            fill={owner === PLAYER_1 ? "rgba(46,125,50,0.22)" : "rgba(255,111,0,0.22)"}
          />
        ))
      )}

      {/* Capture lines */}
      {lines.map(line => (
        <Line key={line.id}
          x1={line.c1 * CELL_SIZE + CELL_SIZE / 2}
          y1={line.r1 * CELL_SIZE + CELL_SIZE / 2}
          x2={line.c2 * CELL_SIZE + CELL_SIZE / 2}
          y2={line.r2 * CELL_SIZE + CELL_SIZE / 2}
          stroke={line.player === PLAYER_1 ? "rgba(46,125,50,0.9)" : "rgba(255,111,0,0.9)"}
          strokeWidth={2.5} strokeLinecap="round"
        />
      ))}

      {/* Placed pieces */}
      {board.map((row, r) =>
        row.map((val, c) => {
          if (val === null) return null;
          const pcx = c * CELL_SIZE + CELL_SIZE / 2;
          const pcy = r * CELL_SIZE + CELL_SIZE / 2;
          const R = CELL_SIZE / 3.2;
          const isP1 = val === PLAYER_1;
          return (
            <G key={`pt-${r}-${c}`}>
              <Circle cx={pcx} cy={pcy} r={R + 3}
                fill={isP1 ? "rgba(46,125,50,0.12)" : "rgba(255,111,0,0.12)"} />
              <Circle cx={pcx + 0.8} cy={pcy + 1} r={R} fill="rgba(0,0,0,0.12)" />
              <Circle cx={pcx} cy={pcy} r={R} fill={isP1 ? "url(#p1Grad)" : "url(#p2Grad)"} />
              <Circle cx={pcx - R * 0.25} cy={pcy - R * 0.28} r={R * 0.26} fill="rgba(255,255,255,0.35)" />
            </G>
          );
        })
      )}

      {/* Touch hitboxes */}
      {board.map((row, r) =>
        row.map((_, c) => (
          <Rect key={`hit-${r}-${c}`}
            x={c * CELL_SIZE} y={r * CELL_SIZE}
            width={CELL_SIZE} height={CELL_SIZE}
            fill="transparent"
            onPress={() => canPlace(r, c) && onPress(r, c)}
          />
        ))
      )}
    </Svg>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function JeuDesPointsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const [gridSize, setGridSize] = useState(BASE_GRID_SIZE);
  const [expansionCount, setExpansionCount] = useState(0);
  const [board, setBoard] = useState<(number | null)[][]>(() => createEmptyBoardN(BASE_GRID_SIZE));
  const [capturedBy, setCapturedBy] = useState<(number | null)[][]>(() => createEmptyBoardN(BASE_GRID_SIZE));
  const [lines, setLines] = useState<LineData[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<number>(PLAYER_1);
  const [scores, setScores] = useState({ [PLAYER_1]: 0, [PLAYER_2]: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [lastCapture, setLastCapture] = useState<{ player: number; count: number } | null>(null);
  const [expandNotice, setExpandNotice] = useState<string | null>(null);

  const boardScrollRef = useRef<ScrollView>(null);

  const winner = !gameOver ? null
    : scores[PLAYER_1] > scores[PLAYER_2] ? PLAYER_1
    : scores[PLAYER_2] > scores[PLAYER_1] ? PLAYER_2
    : -1;

  const handlePress = useCallback((r: number, c: number) => {
    if (gameOver) return;
    if (board[r][c] !== null || capturedBy[r][c] !== null) return;

    const result = processMoveN(board, capturedBy, currentPlayer, r, c, gridSize);
    const { newBoard, newCapturedBy, newLines, pointsCaptured, isFull } = result;

    // Update scores first
    const newScores = { ...scores };
    if (pointsCaptured > 0) {
      newScores[currentPlayer] = scores[currentPlayer] + pointsCaptured;
    }

    setBoard(newBoard);
    setCapturedBy(newCapturedBy);
    if (newLines.length > 0) setLines(prev => [...prev, ...newLines]);
    if (pointsCaptured > 0) {
      setScores(newScores);
      setLastCapture({ player: currentPlayer, count: pointsCaptured });
    } else {
      setLastCapture(null);
    }

    if (isFull) {
      const isTie = newScores[PLAYER_1] === newScores[PLAYER_2];
      if (isTie && expansionCount < MAX_EXPANSIONS) {
        // Expand the grid instead of ending
        const newGridSize = gridSize + EXPAND_BY;
        const { newBoard: expandedBoard, newCapturedBy: expandedCapturedBy } =
          expandBoardN(newBoard, newCapturedBy, gridSize, newGridSize);
        setGridSize(newGridSize);
        setExpansionCount(prev => prev + 1);
        setBoard(expandedBoard);
        setCapturedBy(expandedCapturedBy);
        setExpandNotice(`Égalité ! Grille agrandie à ${newGridSize}×${newGridSize}`);
        setCurrentPlayer(1 - currentPlayer);
        setTimeout(() => setExpandNotice(null), 3000);
        // Scroll to show the expanded area
        setTimeout(() => {
          boardScrollRef.current?.scrollToEnd({ animated: true });
        }, 300);
      } else if (isTie && expansionCount >= MAX_EXPANSIONS) {
        // Max expansions reached — declare final tie
        setGameOver(true);
        setScores(newScores);
      } else {
        setGameOver(true);
        setScores(newScores);
      }
    } else {
      setCurrentPlayer(1 - currentPlayer);
    }
  }, [board, capturedBy, currentPlayer, gameOver, gridSize, expansionCount, scores]);

  const resetGame = () => {
    setGridSize(BASE_GRID_SIZE);
    setExpansionCount(0);
    setBoard(createEmptyBoardN(BASE_GRID_SIZE));
    setCapturedBy(createEmptyBoardN(BASE_GRID_SIZE));
    setLines([]);
    setScores({ [PLAYER_1]: 0, [PLAYER_2]: 0 });
    setCurrentPlayer(PLAYER_1);
    setGameOver(false);
    setLastCapture(null);
    setExpandNotice(null);
  };

  const boardPx = gridSize * CELL_SIZE;
  const isScrollable = boardPx > SCREEN_W - 32;
  const p1Name = "Joueur 1";
  const p2Name = "Joueur 2";

  const renderPlayerCard = (p: number) => {
    const active = currentPlayer === p && !gameOver;
    const color = p === PLAYER_1 ? T.green : T.orange;
    const name = p === PLAYER_1 ? p1Name : p2Name;
    return (
      <View style={[
        { borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: T.card, borderWidth: 2, borderColor: T.greenPale, marginBottom: 12 },
        active && { backgroundColor: color + "10", borderColor: color },
      ]}>
        <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2.5, backgroundColor: color, borderColor: active ? T.white : "transparent" }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: "800", color: T.black }}>{name}</Text>
          <Text style={{ fontSize: 11, fontWeight: "600", color: T.gray, marginTop: 2 }}>{scores[p]} point(s) capturé(s)</Text>
        </View>
        {active && (
          <View style={{ flexDirection: "row", gap: 4 }}>
            {[0, 1, 2].map(i => <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, opacity: 0.4 + i * 0.3 }} />)}
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
          <TouchableOpacity style={styles.topBack} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={T.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.topTitle}>Le Jeu des Points</Text>
            {gridSize > BASE_GRID_SIZE && (
              <Text style={styles.topSub}>{gridSize}×{gridSize} — Grille étendue</Text>
            )}
          </View>
          <TouchableOpacity style={styles.topRestart} onPress={resetGame}>
            <Ionicons name="refresh" size={18} color={T.white} />
          </TouchableOpacity>
        </View>

        {/* Player 2 (Top) */}
        {renderPlayerCard(PLAYER_2)}

        {/* Expansion notice */}
        {expandNotice && (
          <View style={styles.expandBanner}>
            <MaterialCommunityIcons name="arrow-expand" size={16} color={T.orange} />
            <Text style={styles.expandText}>{expandNotice}</Text>
          </View>
        )}

        {/* Scroll hint when board is large */}
        {isScrollable && !gameOver && (
          <View style={styles.scrollHint}>
            <Ionicons name="swap-horizontal" size={13} color={T.textMuted} />
            <Text style={styles.scrollHintText}>Faites défiler pour voir toute la grille</Text>
          </View>
        )}

        {/* Turn / capture indicator */}
        <View style={styles.turnBar}>
          {lastCapture ? (
            <View style={[styles.captureToast, {
              backgroundColor: lastCapture.player === PLAYER_1 ? T.green + "20" : T.orange + "20",
              borderColor: lastCapture.player === PLAYER_1 ? T.green : T.orange,
            }]}>
              <MaterialCommunityIcons
                name="star-four-points" size={14}
                color={lastCapture.player === PLAYER_1 ? T.green : T.orange}
              />
              <Text style={[styles.captureText, {
                color: lastCapture.player === PLAYER_1 ? T.green : T.orange,
              }]}>
                {lastCapture.count} point{lastCapture.count > 1 ? "s" : ""} capturé{lastCapture.count > 1 ? "s" : ""} !
              </Text>
            </View>
          ) : !gameOver ? (
            <View style={styles.turnInfo}>
              <View style={[styles.turnDot, {
                backgroundColor: currentPlayer === PLAYER_1 ? T.green : T.orange,
              }]} />
              <Text style={styles.turnText}>
                Tour de{" "}
                <Text style={{ color: currentPlayer === PLAYER_1 ? T.green : T.orange, fontWeight: "800" }}>
                  {currentPlayer === PLAYER_1 ? p1Name : p2Name}
                </Text>
              </Text>
            </View>
          ) : (
            <View style={styles.turnInfo}>
              <Ionicons name="trophy" size={16} color={T.orange} />
              <Text style={styles.turnText}>Partie terminée</Text>
            </View>
          )}
        </View>

        {/* Board — horizontal scroll wrapper */}
        <ScrollView
          ref={boardScrollRef}
          horizontal
          showsHorizontalScrollIndicator={isScrollable}
          scrollEnabled={!!isScrollable}
          style={styles.boardHScroll}
          contentContainerStyle={{ flexGrow: isScrollable ? 0 : 1, justifyContent: isScrollable ? "flex-start" : "center" }}
        >
          <View style={styles.boardWrapper}>
            <BoardView
              board={board}
              capturedBy={capturedBy}
              lines={lines}
              currentPlayer={currentPlayer}
              gridSize={gridSize}
              gameOver={gameOver}
              onPress={handlePress}
            />
          </View>
        </ScrollView>

        {/* Player 1 (Bottom) */}
        <View style={{ marginTop: 2, marginBottom: 12 }}>
          {renderPlayerCard(PLAYER_1)}
        </View>

        {/* Expansion count info */}
        {expansionCount > 0 && !gameOver && (
          <View style={styles.expansionInfo}>
            <Text style={styles.expansionInfoText}>
              Agrandissement {expansionCount}/{MAX_EXPANSIONS}
            </Text>
            <View style={styles.expansionDots}>
              {Array.from({ length: MAX_EXPANSIONS }).map((_, i) => (
                <View key={i} style={[
                  styles.expansionDot,
                  { backgroundColor: i < expansionCount ? T.orange : T.greenPale },
                ]} />
              ))}
            </View>
          </View>
        )}

        {/* Game over banner */}
        {gameOver && (
          <View style={[styles.gameOverCard, {
            borderColor: winner === PLAYER_1 ? T.green : winner === PLAYER_2 ? T.orange : T.gray,
            backgroundColor: winner === PLAYER_1 ? T.green + "15" : winner === PLAYER_2 ? T.orange + "15" : T.grayLight,
          }]}>
            <Ionicons
              name={winner === -1 ? "remove-circle" : "trophy"}
              size={32}
              color={winner === PLAYER_1 ? T.green : winner === PLAYER_2 ? T.orange : T.gray}
            />
            <Text style={[styles.gameOverTitle, {
              color: winner === PLAYER_1 ? T.green : winner === PLAYER_2 ? T.orange : T.gray,
            }]}>
              {winner === -1 ? "Match nul définitif !" : `${winner === PLAYER_1 ? p1Name : p2Name} remporte la victoire !`}
            </Text>
            <Text style={styles.gameOverScore}>
              {scores[PLAYER_1]} — {scores[PLAYER_2]}
            </Text>
            <TouchableOpacity style={[styles.playAgainBtn, {
              backgroundColor: winner === -1 ? T.green : winner === PLAYER_1 ? T.green : T.orange,
            }]} onPress={resetGame}>
              <Ionicons name="refresh" size={16} color={T.white} />
              <Text style={styles.playAgainText}>Rejouer</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Rules */}
        <View style={styles.rulesCard}>
          <Text style={styles.rulesTitle}>Règles</Text>
          <Text style={styles.rulesText}>
            Encerclez les points adverses avec vos pièces. Les diagonales ne sont pas autorisées. Chaque point capturé rapporte 1 point.
            {"\n"}En cas d'égalité, la grille s'agrandit automatiquement jusqu'à {MAX_EXPANSIONS} fois.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16, flexGrow: 1 },
  topBar: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: T.green, borderRadius: 16, padding: 12,
    marginBottom: 14, gap: 10,
  },
  topBack: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center",
  },
  topTitle: { fontSize: 15, fontWeight: "900", color: T.white },
  topSub: { fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: "700", marginTop: 1 },
  topRestart: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center",
  },
  scorePanel: {
    flexDirection: "row", alignItems: "stretch",
    backgroundColor: T.card, borderRadius: 16, overflow: "hidden",
    marginBottom: 10, borderWidth: 1.5, borderColor: T.greenPale,
  },
  scoreSep: {
    paddingHorizontal: 8, alignItems: "center", justifyContent: "center",
    borderLeftWidth: 1, borderRightWidth: 1, borderColor: T.greenPale,
  },
  scoreSepText: { fontSize: 9, fontWeight: "800", color: T.gray, letterSpacing: 2 },
  scoreCard: {
    flex: 1, alignItems: "center", paddingVertical: 14,
    borderWidth: 2, borderColor: "transparent", borderRadius: 14,
    position: "relative", overflow: "hidden",
  },
  scoreActiveBar: {
    position: "absolute", top: 0, left: 16, right: 16, height: 2.5, borderRadius: 2,
  },
  scoreDot: { width: 10, height: 10, borderRadius: 5, marginBottom: 6 },
  scoreName: { fontSize: 10, fontWeight: "700", color: T.textMuted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 },
  scoreValue: { fontSize: 40, fontWeight: "900", lineHeight: 44 },
  expandBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: T.orange + "18", borderRadius: 12,
    borderWidth: 1.5, borderColor: T.orange,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10,
  },
  expandText: { flex: 1, fontSize: 13, fontWeight: "800", color: T.orange },
  scrollHint: {
    flexDirection: "row", alignItems: "center", gap: 6,
    justifyContent: "center", marginBottom: 8,
  },
  scrollHintText: { fontSize: 11, color: T.textMuted, fontWeight: "600" },
  turnBar: { marginBottom: 10, alignItems: "center" },
  captureToast: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
  },
  captureText: { fontSize: 13, fontWeight: "800" },
  turnInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
  turnDot: { width: 8, height: 8, borderRadius: 4 },
  turnText: { fontSize: 14, color: T.textMuted, fontWeight: "600" },
  boardHScroll: { marginBottom: 12 },
  boardWrapper: {
    backgroundColor: T.card, borderRadius: 14, padding: 8,
    borderWidth: 1.5, borderColor: T.greenPale,
  },
  expansionInfo: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, marginBottom: 12,
  },
  expansionInfoText: { fontSize: 11, color: T.textMuted, fontWeight: "700" },
  expansionDots: { flexDirection: "row", gap: 5 },
  expansionDot: { width: 8, height: 8, borderRadius: 4 },
  gameOverCard: {
    borderRadius: 18, padding: 22, alignItems: "center", gap: 8,
    borderWidth: 2, marginBottom: 14,
  },
  gameOverTitle: { fontSize: 18, fontWeight: "900", textAlign: "center" },
  gameOverScore: { fontSize: 14, color: T.textMuted, fontWeight: "700" },
  playAgainBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 6,
  },
  playAgainText: { fontSize: 14, fontWeight: "800", color: T.white },
  rulesCard: {
    backgroundColor: T.card, borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: T.greenPale,
  },
  rulesTitle: { fontSize: 13, fontWeight: "800", color: T.green, marginBottom: 6 },
  rulesText: { fontSize: 13, color: T.textMuted, lineHeight: 20, fontWeight: "600" },
});
