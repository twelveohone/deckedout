import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Vibe } from '@/lib/gameData';
import {
  DbGame,
  DbPlayer,
  DbRound,
  DbSubmission,
  DbReaction,
  DbHand,
  getDeviceId,
  createGame as apiCreateGame,
  joinGame as apiJoinGame,
  getGameByCode,
  listPlayers,
  listRounds,
  listSubmissions,
  listReactionsForRound,
  getHand,
  startGame as apiStartGame,
  submitAnswer as apiSubmitAnswer,
  reactToSubmission as apiReactToSubmission,
  tryAdvanceToResult,
  advanceToNextRound,
} from '@/lib/gameApi';

export type Screen =
  | 'home'
  | 'create'
  | 'join'
  | 'lobby'
  | 'round-submit'
  | 'round-reveal'
  | 'round-result'
  | 'game-end';

interface GameContextValue {
  screen: Screen;
  setScreen: (s: Screen) => void;
  pendingJoinCode: string | null;
  setPendingJoinCode: (code: string | null) => void;
  deviceId: string;
  game: DbGame | null;
  me: DbPlayer | null;
  players: DbPlayer[];
  rounds: DbRound[];
  currentRound: DbRound | null;
  submissions: DbSubmission[];
  reactions: DbReaction[];
  hand: DbHand[];
  loading: boolean;
  error: string | null;
  createGame: (vibe: Vibe, name: string) => Promise<void>;
  joinGameByCode: (code: string, name: string) => Promise<void>;
  loadGameByCode: (code: string) => Promise<DbGame | null>;
  startGame: () => Promise<void>;
  submitAnswer: (cardId: string, cardText: string, cardVibe: Vibe) => Promise<void>;
  reactToSubmission: (submissionId: string, reactionId: string) => Promise<void>;
  finishReactions: () => Promise<void>;
  nextRound: (reward?: { type: 'skin' | 'boost'; value: string }) => Promise<void>;
  resetGame: () => void;
  refresh: () => Promise<void>;
}

const GameContext = createContext<GameContextValue | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [screen, setScreen] = useState<Screen>('home');
  const [pendingJoinCode, setPendingJoinCode] = useState<string | null>(null);
  const [game, setGame] = useState<DbGame | null>(null);
  const [me, setMe] = useState<DbPlayer | null>(null);
  const [players, setPlayers] = useState<DbPlayer[]>([]);
  const [rounds, setRounds] = useState<DbRound[]>([]);
  const [currentRound, setCurrentRound] = useState<DbRound | null>(null);
  const [submissions, setSubmissions] = useState<DbSubmission[]>([]);
  const [reactions, setReactions] = useState<DbReaction[]>([]);
  const [hand, setHand] = useState<DbHand[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deviceId = useMemo(() => getDeviceId(), []);
  const gameIdRef = useRef<string | null>(null);
  const meRef = useRef<DbPlayer | null>(null);

  useEffect(() => {
    gameIdRef.current = game?.id || null;
  }, [game]);
  useEffect(() => {
    meRef.current = me;
  }, [me]);

  const refresh = useCallback(async () => {
    const gid = gameIdRef.current;
    if (!gid) return;
    const [g, ps, rs] = await Promise.all([
      supabase.from('games').select('*').eq('id', gid).maybeSingle().then((r) => r.data as DbGame | null),
      listPlayers(gid),
      listRounds(gid),
    ]);
    if (g) setGame(g);
    setPlayers(ps);
    setRounds(rs);
    const cr = rs.length > 0 ? rs[rs.length - 1] : null;
    setCurrentRound(cr);
    if (cr) {
      const [subs, reacts] = await Promise.all([
        listSubmissions(cr.id),
        listReactionsForRound(cr.id),
      ]);
      setSubmissions(subs);
      setReactions(reacts);
    } else {
      setSubmissions([]);
      setReactions([]);
    }
    if (meRef.current) {
      const h = await getHand(meRef.current.id);
      setHand(h);
    }
  }, []);

  // Drive screen based on game state
  useEffect(() => {
    if (!game) return;
    if (game.status === 'lobby') {
      setScreen('lobby');
      return;
    }
    if (game.status === 'completed') {
      setScreen('game-end');
      return;
    }
    if (game.status === 'in_progress' && currentRound) {
      if (currentRound.phase === 'submit') {
        setScreen('round-submit');
      } else if (currentRound.phase === 'reveal') {
        setScreen('round-reveal');
      } else if (currentRound.phase === 'result' || currentRound.phase === 'done') {
        setScreen('round-result');
      }
    }
  }, [game, currentRound?.phase, currentRound?.id]);

  // Auto-trigger advance to result when reveal phase completes
  useEffect(() => {
    if (!game || !currentRound) return;
    if (currentRound.phase !== 'reveal') return;
    if (submissions.length === 0) return;
    const required = submissions.length * (players.length - 1);
    if (reactions.length >= required && required > 0) {
      tryAdvanceToResult(game.id, currentRound.id).catch(() => {});
    }
  }, [reactions.length, currentRound?.phase, currentRound?.id, players.length, submissions.length, game?.id]);

  // Realtime subscriptions
  useEffect(() => {
    if (!game) return;
    const gid = game.id;
    const channel = supabase
      .channel(`game-${gid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gid}` }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${gid}` }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rounds', filter: `game_id=eq.${gid}` }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, () => refresh())
      .subscribe();

    // Polling fallback every 4s in case realtime isn't enabled
    const interval = setInterval(() => {
      refresh();
    }, 4000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [game?.id, refresh]);

  const createGame = useCallback(async (vibe: Vibe, name: string) => {
    setLoading(true);
    setError(null);
    try {
      const { game, player } = await apiCreateGame(vibe, name || 'Host');
      setGame(game);
      setMe(player);
      localStorage.setItem('vibedecks_last_game_code', game.code);
      setScreen('lobby');
      await refresh();
    } catch (e: any) {
      setError(e.message || 'Failed to create game');
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const loadGameByCode = useCallback(async (code: string): Promise<DbGame | null> => {
    return await getGameByCode(code);
  }, []);

  const joinGameByCode = useCallback(async (code: string, name: string) => {
    setLoading(true);
    setError(null);
    try {
      const { game, player } = await apiJoinGame(code, name);
      setGame(game);
      setMe(player);
      localStorage.setItem('vibedecks_last_game_code', game.code);
      setPendingJoinCode(null);
      await refresh();
    } catch (e: any) {
      setError(e.message || 'Failed to join game');
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const startGameFn = useCallback(async () => {
    if (!game) return;
    await apiStartGame(game.id);
    await refresh();
  }, [game, refresh]);

  const submitAnswer = useCallback(
    async (cardId: string, cardText: string, cardVibe: Vibe) => {
      if (!game || !currentRound || !me) return;
      await apiSubmitAnswer(game.id, currentRound.id, me.id, {
        id: cardId,
        text: cardText,
        vibe: cardVibe,
      });
      await refresh();
    },
    [game, currentRound, me, refresh]
  );

  const reactToSubmissionFn = useCallback(
    async (submissionId: string, reactionId: string) => {
      if (!me) return;
      await apiReactToSubmission(submissionId, me.id, reactionId);
      await refresh();
    },
    [me, refresh]
  );

  const finishReactions = useCallback(async () => {
    if (!game || !currentRound) return;
    await tryAdvanceToResult(game.id, currentRound.id);
    await refresh();
  }, [game, currentRound, refresh]);

  const nextRound = useCallback(
    async (reward?: { type: 'skin' | 'boost'; value: string }) => {
      if (!game) return;
      await advanceToNextRound(game.id, reward);
      await refresh();
    },
    [game, refresh]
  );

  const resetGame = useCallback(() => {
    setGame(null);
    setMe(null);
    setPlayers([]);
    setRounds([]);
    setCurrentRound(null);
    setSubmissions([]);
    setReactions([]);
    setHand([]);
    setScreen('home');
    setPendingJoinCode(null);
    localStorage.removeItem('vibedecks_last_game_code');
  }, []);

  const value = useMemo<GameContextValue>(
    () => ({
      screen,
      setScreen,
      pendingJoinCode,
      setPendingJoinCode,
      deviceId,
      game,
      me,
      players,
      rounds,
      currentRound,
      submissions,
      reactions,
      hand,
      loading,
      error,
      createGame,
      joinGameByCode,
      loadGameByCode,
      startGame: startGameFn,
      submitAnswer,
      reactToSubmission: reactToSubmissionFn,
      finishReactions,
      nextRound,
      resetGame,
      refresh,
    }),
    [
      screen,
      pendingJoinCode,
      deviceId,
      game,
      me,
      players,
      rounds,
      currentRound,
      submissions,
      reactions,
      hand,
      loading,
      error,
      createGame,
      joinGameByCode,
      loadGameByCode,
      startGameFn,
      submitAnswer,
      reactToSubmissionFn,
      finishReactions,
      nextRound,
      resetGame,
      refresh,
    ]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
