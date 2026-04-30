import { supabase } from '@/lib/supabase';
import {
  Vibe,
  PROMPTS,
  ANSWERS,
  Card,
  eligibleCards,
  pickRandom,
  AVATAR_COLORS,
  pickWeightedClosing,
} from '@/lib/gameData';

const HAND_SIZE = 7;
const TOTAL_ROUNDS = 10;
const DEVICE_KEY = 'vibedecks_device_id';

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = (crypto.randomUUID?.() || `dev-${Math.random().toString(36).slice(2)}-${Date.now()}`);
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

function genCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export interface DbGame {
  id: string;
  code: string;
  vibe: Vibe;
  status: 'lobby' | 'in_progress' | 'completed';
  host_device_id: string;
  current_round: number;
  table_skin: string;
  vibe_boost: Vibe | null;
  closing_line: string | null;
  created_at: string;
}

export interface DbPlayer {
  id: string;
  game_id: string;
  device_id: string;
  name: string;
  color: string;
  is_host: boolean;
  total_reactions: number;
  joined_at: string;
}

export interface DbRound {
  id: string;
  game_id: string;
  round_number: number;
  prompt_id: string;
  prompt_text: string;
  prompt_vibe: Vibe;
  phase: 'submit' | 'reveal' | 'result' | 'done';
  winner_player_id: string | null;
  created_at: string;
}

export interface DbSubmission {
  id: string;
  round_id: string;
  player_id: string;
  card_id: string;
  card_text: string;
  card_vibe: Vibe;
  created_at: string;
}

export interface DbReaction {
  id: string;
  submission_id: string;
  player_id: string;
  reaction_id: string;
  created_at: string;
}

export interface DbHand {
  id: string;
  player_id: string;
  card_id: string;
  card_text: string;
  card_vibe: Vibe;
}

export async function createGame(vibe: Vibe, hostName: string): Promise<{ game: DbGame; player: DbPlayer }> {
  const deviceId = getDeviceId();
  const code = genCode();
  const { data: game, error: gErr } = await supabase
    .from('games')
    .insert({
      code,
      vibe,
      host_device_id: deviceId,
      status: 'lobby',
    })
    .select()
    .single();
  if (gErr || !game) throw gErr || new Error('Game create failed');

  const { data: player, error: pErr } = await supabase
    .from('players')
    .insert({
      game_id: game.id,
      device_id: deviceId,
      name: hostName,
      color: AVATAR_COLORS[0],
      is_host: true,
    })
    .select()
    .single();
  if (pErr || !player) throw pErr || new Error('Player create failed');

  return { game, player };
}

export async function getGameByCode(code: string): Promise<DbGame | null> {
  const { data } = await supabase
    .from('games')
    .select('*')
    .eq('code', code.toUpperCase())
    .maybeSingle();
  return data as DbGame | null;
}

export async function joinGame(code: string, name: string): Promise<{ game: DbGame; player: DbPlayer }> {
  const game = await getGameByCode(code);
  if (!game) throw new Error('Game not found');
  const deviceId = getDeviceId();

  // Check existing player on this device
  const { data: existing } = await supabase
    .from('players')
    .select('*')
    .eq('game_id', game.id)
    .eq('device_id', deviceId)
    .maybeSingle();

  if (existing) {
    return { game, player: existing as DbPlayer };
  }

  // Count current players for color assignment
  const { count } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .eq('game_id', game.id);

  const idx = count ?? 0;
  const { data: player, error } = await supabase
    .from('players')
    .insert({
      game_id: game.id,
      device_id: deviceId,
      name,
      color: AVATAR_COLORS[idx % AVATAR_COLORS.length],
      is_host: false,
    })
    .select()
    .single();
  if (error || !player) throw error || new Error('Join failed');
  return { game, player };
}

export async function listPlayers(gameId: string): Promise<DbPlayer[]> {
  const { data } = await supabase
    .from('players')
    .select('*')
    .eq('game_id', gameId)
    .order('joined_at', { ascending: true });
  return (data || []) as DbPlayer[];
}

export async function listRounds(gameId: string): Promise<DbRound[]> {
  const { data } = await supabase
    .from('rounds')
    .select('*')
    .eq('game_id', gameId)
    .order('round_number', { ascending: true });
  return (data || []) as DbRound[];
}

export async function getCurrentRound(gameId: string, roundNumber: number): Promise<DbRound | null> {
  const { data } = await supabase
    .from('rounds')
    .select('*')
    .eq('game_id', gameId)
    .eq('round_number', roundNumber)
    .maybeSingle();
  return data as DbRound | null;
}

export async function listSubmissions(roundId: string): Promise<DbSubmission[]> {
  const { data } = await supabase
    .from('submissions')
    .select('*')
    .eq('round_id', roundId)
    .order('created_at', { ascending: true });
  return (data || []) as DbSubmission[];
}

export async function listReactionsForRound(roundId: string): Promise<DbReaction[]> {
  // Get submissions then reactions
  const subs = await listSubmissions(roundId);
  if (subs.length === 0) return [];
  const { data } = await supabase
    .from('reactions')
    .select('*')
    .in('submission_id', subs.map((s) => s.id));
  return (data || []) as DbReaction[];
}

export async function getHand(playerId: string): Promise<DbHand[]> {
  const { data } = await supabase
    .from('player_hands')
    .select('*')
    .eq('player_id', playerId);
  return (data || []) as DbHand[];
}

async function dealNewHandForPlayer(playerId: string, vibe: Vibe, exclude: Set<string>): Promise<void> {
  const pool = eligibleCards(ANSWERS, vibe).filter((c) => !exclude.has(c.id));
  const used = new Set<string>();
  const cards: Card[] = [];
  while (cards.length < HAND_SIZE && cards.length < pool.length) {
    const c = pickRandom(pool);
    if (!used.has(c.id)) {
      used.add(c.id);
      cards.push(c);
    }
  }
  await supabase.from('player_hands').insert(
    cards.map((c) => ({
      player_id: playerId,
      card_id: c.id,
      card_text: c.text,
      card_vibe: c.vibe,
    }))
  );
}

export async function startGame(gameId: string): Promise<void> {
  const { data: game } = await supabase.from('games').select('*').eq('id', gameId).single();
  if (!game) return;
  if (game.status !== 'lobby') return;

  const players = await listPlayers(gameId);
  // Deal hands
  for (const p of players) {
    await dealNewHandForPlayer(p.id, game.vibe, new Set());
  }
  // First prompt
  const prompt = pickRandom(eligibleCards(PROMPTS, game.vibe));
  await supabase.from('rounds').insert({
    game_id: gameId,
    round_number: 1,
    prompt_id: prompt.id,
    prompt_text: prompt.text,
    prompt_vibe: prompt.vibe,
    phase: 'submit',
  });
  await supabase
    .from('games')
    .update({ status: 'in_progress', current_round: 1 })
    .eq('id', gameId);
}

export async function submitAnswer(
  gameId: string,
  roundId: string,
  playerId: string,
  card: { id: string; text: string; vibe: Vibe }
): Promise<void> {
  // Insert submission (unique on round+player)
  const { error } = await supabase.from('submissions').insert({
    round_id: roundId,
    player_id: playerId,
    card_id: card.id,
    card_text: card.text,
    card_vibe: card.vibe,
  });
  if (error && !error.message?.includes('duplicate')) throw error;

  // Remove card from hand
  await supabase
    .from('player_hands')
    .delete()
    .eq('player_id', playerId)
    .eq('card_id', card.id);

  // Refill hand by 1 from eligible pool
  const { data: game } = await supabase.from('games').select('vibe').eq('id', gameId).single();
  if (game) {
    const hand = await getHand(playerId);
    const exclude = new Set(hand.map((h) => h.card_id));
    exclude.add(card.id);
    const pool = eligibleCards(ANSWERS, game.vibe as Vibe).filter((c) => !exclude.has(c.id));
    if (pool.length > 0) {
      const next = pickRandom(pool);
      await supabase.from('player_hands').insert({
        player_id: playerId,
        card_id: next.id,
        card_text: next.text,
        card_vibe: next.vibe,
      });
    }
  }

  // Check if all players submitted; if so, flip phase to 'reveal'
  const players = await listPlayers(gameId);
  const subs = await listSubmissions(roundId);
  if (subs.length >= players.length) {
    await supabase
      .from('rounds')
      .update({ phase: 'reveal' })
      .eq('id', roundId)
      .eq('phase', 'submit');
  }
}

export async function reactToSubmission(
  submissionId: string,
  playerId: string,
  reactionId: string
): Promise<void> {
  // Upsert: one reaction per (submission, player). Switch reaction by deleting then inserting.
  await supabase
    .from('reactions')
    .delete()
    .eq('submission_id', submissionId)
    .eq('player_id', playerId);
  await supabase.from('reactions').insert({
    submission_id: submissionId,
    player_id: playerId,
    reaction_id: reactionId,
  });
}

export async function tryAdvanceToResult(gameId: string, roundId: string): Promise<void> {
  // Result if every player has reacted to every submission they didn't make
  const players = await listPlayers(gameId);
  const subs = await listSubmissions(roundId);
  const reactions = await listReactionsForRound(roundId);

  let allDone = true;
  for (const sub of subs) {
    for (const p of players) {
      if (p.id === sub.player_id) continue;
      const reacted = reactions.some(
        (r) => r.submission_id === sub.id && r.player_id === p.id
      );
      if (!reacted) {
        allDone = false;
        break;
      }
    }
    if (!allDone) break;
  }

  if (!allDone) return;

  // Determine winner
  let winnerId: string | null = null;
  let max = -1;
  for (const sub of subs) {
    const total = reactions.filter((r) => r.submission_id === sub.id).length;
    if (total > max) {
      max = total;
      winnerId = sub.player_id;
    }
  }

  // Update round + accumulate totals on players
  const { data: roundNow } = await supabase
    .from('rounds')
    .select('phase')
    .eq('id', roundId)
    .single();
  if (roundNow?.phase !== 'reveal') return; // already advanced

  await supabase
    .from('rounds')
    .update({ phase: 'result', winner_player_id: winnerId })
    .eq('id', roundId)
    .eq('phase', 'reveal');

  // Update each player's total reactions
  for (const sub of subs) {
    const total = reactions.filter((r) => r.submission_id === sub.id).length;
    if (total === 0) continue;
    const player = players.find((p) => p.id === sub.player_id);
    if (!player) continue;
    await supabase
      .from('players')
      .update({ total_reactions: player.total_reactions + total })
      .eq('id', player.id);
  }
}

export async function advanceToNextRound(
  gameId: string,
  reward?: { type: 'skin' | 'boost'; value: string }
): Promise<void> {
  const { data: game } = await supabase.from('games').select('*').eq('id', gameId).single();
  if (!game) return;

  const updates: any = {};
  if (reward?.type === 'skin') updates.table_skin = reward.value;
  if (reward?.type === 'boost') updates.vibe_boost = reward.value;

  const nextRoundNumber = game.current_round + 1;
  if (nextRoundNumber > TOTAL_ROUNDS) {
    updates.status = 'completed';
    updates.closing_line = pickWeightedClosing(game.vibe as Vibe);
    updates.vibe_boost = null;
    await supabase.from('games').update(updates).eq('id', gameId);
    return;
  }

  // Mark current round done
  await supabase
    .from('rounds')
    .update({ phase: 'done' })
    .eq('game_id', gameId)
    .eq('round_number', game.current_round);

  // Pick prompt for next round (anti-repeat)
  const prevRounds = await listRounds(gameId);
  const recentIds = prevRounds.slice(-40).map((r) => r.prompt_id);
  let pool = eligibleCards(PROMPTS, game.vibe as Vibe).filter((c) => !recentIds.includes(c.id));
  if (pool.length === 0) pool = eligibleCards(PROMPTS, game.vibe as Vibe);
  const boost = (updates.vibe_boost ?? game.vibe_boost) as Vibe | null;
  if (boost) {
    const boosted = pool.filter((c) => c.vibe === boost);
    pool = [...pool, ...boosted, ...boosted];
  }
  const prompt = pickRandom(pool);

  await supabase.from('rounds').insert({
    game_id: gameId,
    round_number: nextRoundNumber,
    prompt_id: prompt.id,
    prompt_text: prompt.text,
    prompt_vibe: prompt.vibe,
    phase: 'submit',
  });

  // Boost is one-round-only; clear after applying (we keep the new boost during this round, then clear)
  // To simplify: we apply boost when picking, then clear immediately
  updates.vibe_boost = null;
  updates.current_round = nextRoundNumber;
  await supabase.from('games').update(updates).eq('id', gameId);
}
