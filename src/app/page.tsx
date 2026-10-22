"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  RotateCcw,
  Sparkles,
  Trophy,
  History,
  Settings,
  HelpCircle,
  Play,
  RotateCw,
  Info,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  User,
  Bot,
  Sliders,
} from 'lucide-react';
import {
  DEFAULT_RULES,
  indexToAlgebraic,
} from '../engine/constants';
import { SearchEngine } from '../engine/search';
import {
  applyMove,
  createInitialState,
  getLegalMoves,
  undoMove,
} from '../engine/state';
import {
  AnalysisResult,
  CandidateAnalysis,
  CellIndex,
  GameRules,
  GameState,
  Player,
  SearchOptions,
} from '../engine/types';
import { Header } from '../components/Header';
import { Board } from '../components/Board';
import { BestMovePanel } from '../components/BestMovePanel';
import { AlternativeMoves } from '../components/AlternativeMoves';
import { OpponentAnalysis } from '../components/OpponentAnalysis';
import { GameTimeline } from '../components/GameTimeline';
import { EngineStatus } from '../components/EngineStatus';
import { SimulationSandbox } from '../components/SimulationSandbox';
import { SettingsModal } from '../components/SettingsModal';
import { ExportImportModal } from '../components/ExportImportModal';
import { ReconstructModal } from '../components/ReconstructModal';
import { NewGameModal } from '../components/NewGameModal';
import { ErrorBoundary } from '../components/ErrorBoundary';

export default function InfiniteTicTacToePage() {
  // Engine instance
  const searchEngine = useMemo(() => new SearchEngine(), []);

  // Player & Match Configuration
  const [userSymbol, setUserSymbol] = useState<Player>('X');
  const [whoPlaysFirst, setWhoPlaysFirst] = useState<'user' | 'opponent'>('user');
  const [rules, setRules] = useState<GameRules>(DEFAULT_RULES);
  const [searchOptions, setSearchOptions] = useState<SearchOptions>({
    maxDepth: 8,
    timeBudgetMs: 1500,
  });

  // Derived starting player based on who plays first
  const opponentSymbol: Player = userSymbol === 'X' ? 'O' : 'X';
  const initialStartingPlayer: Player = whoPlaysFirst === 'user' ? userSymbol : opponentSymbol;

  // Active Game State
  const [gameState, setGameState] = useState<GameState>(() =>
    createInitialState(DEFAULT_RULES, 'X')
  );

  // Redo stack for move redo support
  const [redoStack, setRedoStack] = useState<CellIndex[]>([]);

  // Analysis result
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // Interactive UI states
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateAnalysis | null>(null);
  const [inspectedMoveIndex, setInspectedMoveIndex] = useState<number | null>(null);
  const [inputMode, setInputMode] = useState<'guided' | 'reconstruct'>('guided');

  // Modals
  const [isNewGameOpen, setIsNewGameOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportImportOpen, setIsExportImportOpen] = useState(false);
  const [isReconstructOpen, setIsReconstructOpen] = useState(false);

  // Re-run search analysis whenever gameState or searchOptions change
  const runAnalysis = useCallback(
    (stateToAnalyze: GameState) => {
      if (stateToAnalyze.status !== 'in_progress') {
        const terminalRes = searchEngine.analyzePosition(stateToAnalyze, searchOptions);
        setAnalysisResult(terminalRes);
        return;
      }
      const res = searchEngine.analyzePosition(stateToAnalyze, searchOptions);
      setAnalysisResult(res);
    },
    [searchEngine, searchOptions]
  );

  useEffect(() => {
    runAnalysis(gameState);
  }, [gameState, runAnalysis]);

  // Start new game with chosen settings
  const handleStartNewGame = (newUserSymbol: Player, newFirstPlayer: 'user' | 'opponent') => {
    setUserSymbol(newUserSymbol);
    setWhoPlaysFirst(newFirstPlayer);

    const newOpponent: Player = newUserSymbol === 'X' ? 'O' : 'X';
    const newStartingPlayer: Player = newFirstPlayer === 'user' ? newUserSymbol : newOpponent;

    const freshState = createInitialState(rules, newStartingPlayer);
    setGameState(freshState);
    setRedoStack([]);
    setSelectedCandidate(null);
    setInspectedMoveIndex(null);
  };

  // Handle cell click on real board
  const handleCellClick = (cell: CellIndex) => {
    if (gameState.status !== 'in_progress') return;

    try {
      const next = applyMove(gameState, cell, rules);
      setGameState(next);
      setRedoStack([]); // Clear redo stack upon new move
      setSelectedCandidate(null);
      setInspectedMoveIndex(null);
    } catch (err: any) {
      console.error('Move error:', err.message);
    }
  };

  // Commit a specific candidate move
  const handleCommitMove = (cell: CellIndex) => {
    handleCellClick(cell);
  };

  // Undo last move
  const handleUndo = () => {
    if (gameState.moveHistory.length === 0) return;
    const lastMove = gameState.moveHistory[gameState.moveHistory.length - 1];
    setRedoStack((prev) => [lastMove.toCell, ...prev]);

    const restored = undoMove(gameState);
    setGameState(restored);
    setSelectedCandidate(null);
    setInspectedMoveIndex(null);
  };

  // Redo previously undone move
  const handleRedo = () => {
    if (redoStack.length === 0 || gameState.status !== 'in_progress') return;
    const [nextCell, ...restRedo] = redoStack;
    try {
      const nextState = applyMove(gameState, nextCell, rules);
      setGameState(nextState);
      setRedoStack(restRedo);
      setSelectedCandidate(null);
      setInspectedMoveIndex(null);
    } catch (e) {
      // Cell is no longer valid, clear redo stack
      setRedoStack([]);
    }
  };

  // Handle game load from Export/Import or Reconstruction
  const handleLoadGame = (newState: GameState, importedUserSymbol?: Player) => {
    if (importedUserSymbol) {
      setUserSymbol(importedUserSymbol);
    }
    setGameState(newState);
    setRedoStack([]);
    setSelectedCandidate(null);
    setInspectedMoveIndex(null);
  };

  // Update rule variations
  const handleChangeRules = (newRules: GameRules) => {
    setRules(newRules);
    // Replay history under new rules
    let replayed = createInitialState(newRules, gameState.startingPlayer);
    for (const m of gameState.moveHistory) {
      try {
        replayed = applyMove(replayed, m.toCell, newRules);
      } catch (e) {
        break;
      }
    }
    setGameState(replayed);
  };

  // Reconstructed state for historical move inspection
  const inspectedState = useMemo(() => {
    if (inspectedMoveIndex === null || inspectedMoveIndex >= gameState.moveHistory.length - 1) {
      return null;
    }
    try {
      let replay = createInitialState(rules, gameState.startingPlayer);
      for (let i = 0; i <= inspectedMoveIndex; i++) {
        replay = applyMove(replay, gameState.moveHistory[i].toCell, rules);
      }
      return replay;
    } catch {
      return null;
    }
  }, [gameState.moveHistory, gameState.startingPlayer, rules, inspectedMoveIndex]);

  const activeBoardState = inspectedState || gameState;

  const isUserTurn = gameState.turn === userSymbol;
  const isGameOver = gameState.status !== 'in_progress';
  const bestMove = analysisResult?.bestMove ?? null;
  const candidates = analysisResult?.candidates ?? [];
  const engineTelemetry = analysisResult?.engineStatus ?? {
    searchDepth: 0,
    nodesSearched: 0,
    timeTakenMs: 0,
    isExact: false,
    completedDepth: true,
    transpositionHits: 0,
    searchMethod: 'alpha_beta',
  };

  // Format status prompt titles and subtitles accurately as required
  let turnPromptTitle = '';
  let turnPromptSubtitle = '';

  if (isGameOver) {
    turnPromptTitle =
      gameState.status === 'x_won'
        ? 'Game Over — Player X Won!'
        : gameState.status === 'o_won'
        ? 'Game Over — Player O Won!'
        : 'Game Over — Drawn';
    turnPromptSubtitle =
      gameState.winner === userSymbol
        ? `Victory! Your symbol (${userSymbol}) forced a game-theoretic win.`
        : gameState.winner !== null
        ? `Player ${gameState.winner} won this game.`
        : 'Game drawn by repetition or move limit.';
  } else if (isUserTurn) {
    turnPromptTitle = `Your turn (${userSymbol})`;
    turnPromptSubtitle = bestMove
      ? `Analysis complete — recommended move: ${bestMove.algebraic}`
      : 'Analyzing board...';
  } else {
    // Opponent's turn
    if (gameState.moveHistory.length === 0) {
      turnPromptTitle = 'Opponent started — enter their move';
      turnPromptSubtitle = `Your opponent (${opponentSymbol}) plays first. Click the square they choose on the physical board.`;
    } else {
      turnPromptTitle = `Opponent's turn (${opponentSymbol})`;
      turnPromptSubtitle = `Record the move your opponent (${opponentSymbol}) just played on the physical board.`;
    }
  }

  return (
    <ErrorBoundary onReset={() => handleStartNewGame(userSymbol, whoPlaysFirst)}>
      <div className="min-h-screen bg-charcoal-950 text-slate-100 flex flex-col font-sans selection:bg-playerX selection:text-charcoal-950">
        {/* Top Header */}
      <Header
        state={gameState}
        userSymbol={userSymbol}
        onNewGame={() => setIsNewGameOpen(true)}
        onUndo={handleUndo}
        canUndo={gameState.moveHistory.length > 0}
        onRedo={handleRedo}
        canRedo={redoStack.length > 0}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenExportImport={() => setIsExportImportOpen(true)}
        onOpenReconstruct={() => setIsReconstructOpen(true)}
        inputMode={inputMode}
        onChangeInputMode={setInputMode}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Match Setup & Starting Player Control Banner */}
        <div className="p-4 rounded-2xl bg-charcoal-900 border border-charcoal-800 shadow-lg space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Live Turn Guidance & Status Callout */}
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                  isGameOver
                    ? 'bg-amber-500/20 text-amber-400'
                    : isUserTurn
                    ? 'bg-playerX/20 text-playerX shadow-lg shadow-playerX/20'
                    : 'bg-playerO/20 text-playerO shadow-lg shadow-playerO/20'
                }`}
              >
                {isGameOver ? (
                  <Trophy className="w-5 h-5" />
                ) : isUserTurn ? (
                  <User className="w-5 h-5" />
                ) : (
                  <Bot className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-100">
                    {turnPromptTitle}
                  </h2>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                      isGameOver
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : isUserTurn
                        ? 'bg-playerX/10 text-playerX border-playerX/30'
                        : 'bg-playerO/10 text-playerO border-playerO/30'
                    }`}
                  >
                    {isGameOver
                      ? 'Terminal'
                      : isUserTurn
                      ? `Your Move (${userSymbol})`
                      : `Opponent Move (${opponentSymbol})`}
                  </span>
                </div>
                <p className="text-xs text-charcoal-400 mt-0.5">
                  {turnPromptSubtitle}
                </p>
              </div>
            </div>

            {/* Quick Match Setup Details & Change Button */}
            <div className="flex items-center gap-2 self-start md:self-center">
              <div className="px-3 py-1.5 rounded-xl bg-charcoal-850 border border-charcoal-750 text-xs flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-charcoal-500">You:</span>
                  <span
                    className={`font-mono font-bold px-1.5 py-0.2 rounded ${
                      userSymbol === 'X'
                        ? 'bg-playerX/20 text-playerX'
                        : 'bg-playerO/20 text-playerO'
                    }`}
                  >
                    {userSymbol}
                  </span>
                </div>
                <span className="text-charcoal-600">•</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-charcoal-500">First to Play:</span>
                  <span className="font-semibold text-slate-200">
                    {whoPlaysFirst === 'user'
                      ? `You (${userSymbol})`
                      : `Opponent (${opponentSymbol})`}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsNewGameOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-charcoal-800 hover:bg-charcoal-750 text-slate-200 hover:text-white border border-charcoal-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <RotateCw className="w-3.5 h-3.5 text-playerX" />
                <span>New Game Setup</span>
              </button>
            </div>
          </div>
        </div>

        {/* Primary 2-Column Strategy Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Board & Timeline (5 cols on lg) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Interactive 3x3 Board */}
            <div className="p-6 rounded-2xl bg-charcoal-900 border border-charcoal-800 shadow-xl flex flex-col items-center">
              <div className="w-full flex items-center justify-between text-xs font-mono text-charcoal-400 mb-3 px-2">
                <span>Move #{gameState.moveHistory.length + 1}</span>
                <span
                  className={`font-bold ${
                    gameState.turn === userSymbol ? 'text-playerX' : 'text-playerO'
                  }`}
                >
                  {gameState.status === 'in_progress'
                    ? `Turn: Player ${gameState.turn} ${isUserTurn ? '(You)' : '(Opponent)'}`
                    : 'Game Over'}
                </span>
              </div>

              {/* Historical Inspection Callout */}
              {inspectedState && inspectedMoveIndex !== null && (
                <div className="w-full mb-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
                  <span className="text-amber-400 font-medium">
                    Viewing Move #{inspectedMoveIndex + 1} ({gameState.moveHistory[inspectedMoveIndex]?.notation})
                  </span>
                  <button
                    onClick={() => setInspectedMoveIndex(null)}
                    className="px-2.5 py-1 rounded-lg bg-charcoal-800 hover:bg-charcoal-750 text-slate-200 text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    Resume Live Game
                  </button>
                </div>
              )}

              <Board
                state={activeBoardState}
                recommendedMove={inspectedState ? null : isUserTurn ? bestMove : null}
                selectedCandidate={inspectedState ? null : selectedCandidate}
                onCellClick={(cell) => {
                  if (inspectedState) {
                    setInspectedMoveIndex(null);
                  } else {
                    handleCellClick(cell);
                  }
                }}
                disabled={inspectedState !== null}
              />
            </div>

            {/* Real Engine Telemetry */}
            <EngineStatus status={engineTelemetry} />

            {/* Game Move Timeline */}
            <GameTimeline
              history={gameState.moveHistory}
              inspectedIndex={inspectedMoveIndex}
              onInspectMove={(idx) =>
                setInspectedMoveIndex((prev) => (prev === idx ? null : idx))
              }
            />
          </div>

          {/* Right Column: AI Analysis & Opponent Counterplay (7 cols on lg) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Interactive Simulation Sandbox (shown when a candidate or best move is simulated) */}
            {selectedCandidate && (
              <SimulationSandbox
                realState={gameState}
                candidate={selectedCandidate}
                onClose={() => setSelectedCandidate(null)}
                onCommitMove={handleCommitMove}
              />
            )}

            {/* Best Move Panel (recommends for the user when it's their turn) */}
            <BestMovePanel
              bestMove={bestMove}
              turn={gameState.turn}
              isUserTurn={isUserTurn}
              engineStatus={engineTelemetry}
              onCommitMove={handleCommitMove}
              onSimulateMove={(cand) =>
                setSelectedCandidate(
                  selectedCandidate?.cell === cand.cell ? null : cand
                )
              }
              isSimulating={selectedCandidate?.cell === bestMove?.cell}
            />

            {/* Opponent Analysis & Threats */}
            <OpponentAnalysis
              bestMove={bestMove}
              activePlayer={gameState.turn}
            />

            {/* Alternative Moves Table */}
            {isUserTurn && (
              <AlternativeMoves
                candidates={candidates}
                selectedCandidate={selectedCandidate}
                onSelectCandidate={(cand) => setSelectedCandidate(cand)}
                onCommitMove={handleCommitMove}
              />
            )}
          </div>
        </div>
      </main>

      {/* Dedicated New Game Modal: "Who plays first?" + Symbol Selector */}
      <NewGameModal
        isOpen={isNewGameOpen}
        onClose={() => setIsNewGameOpen(false)}
        initialUserSymbol={userSymbol}
        initialFirstPlayer={whoPlaysFirst}
        onStartNewGame={handleStartNewGame}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userSymbol={userSymbol}
        onChangeUserSymbol={(s) => {
          setUserSymbol(s);
          setRedoStack([]);
          setSelectedCandidate(null);
          setInspectedMoveIndex(null);
          if (whoPlaysFirst === 'user') {
            setGameState(createInitialState(rules, s));
          } else {
            setGameState(createInitialState(rules, s === 'X' ? 'O' : 'X'));
          }
        }}
        startingPlayer={gameState.startingPlayer}
        onChangeStartingPlayer={(p) => {
          setWhoPlaysFirst(p === userSymbol ? 'user' : 'opponent');
          setRedoStack([]);
          setSelectedCandidate(null);
          setInspectedMoveIndex(null);
          setGameState(createInitialState(rules, p));
        }}
        rules={rules}
        onChangeRules={(newRules) => {
          setRedoStack([]);
          setSelectedCandidate(null);
          setInspectedMoveIndex(null);
          handleChangeRules(newRules);
        }}
        searchOptions={searchOptions}
        onChangeSearchOptions={setSearchOptions}
      />

      {/* Export / Import Modal */}
      <ExportImportModal
        isOpen={isExportImportOpen}
        onClose={() => setIsExportImportOpen(false)}
        state={gameState}
        onLoadGame={(s) => handleLoadGame(s, userSymbol)}
      />

      {/* Mode B: Reconstruct Modal */}
      <ReconstructModal
        isOpen={isReconstructOpen}
        onClose={() => setIsReconstructOpen(false)}
        rules={rules}
        onGameReconstructed={(s) => handleLoadGame(s, userSymbol)}
      />
    </div>
  </ErrorBoundary>
  );
}
