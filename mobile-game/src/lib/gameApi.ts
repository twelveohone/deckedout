import AsyncStorage from "@react-native-async-storage/async-storage";
import { ANSWERS, Card, eligibleCards, pickRandom, PROMPTS, Vibe } from "./gameData";
import { supabase } from "./supabase";

const HAND_SIZE = 7;
const TOTAL_ROUNDS = 10;
const DEVICE_KEY = "vibedecks_device_id";
export const LAST_CODE_KEY = "vibedecks_last_game_code";

export interface DbGame {
  id: string;
  code: string;
  vibe: Vibe;
  status: "lobby" | "in_progress" | "completed";
  host_device_id: string;
  current_round: number;
}

export interface DbPlayer {
  id: string;
  game_id: string;
  device_id: string;
  name: string;
  color: string;
  is_host: boolean;
  total_reactions: number;
}

export interface DbRound {
  id: string;
  game_id: string;
  round_number: number;
  prompt_text: string;
  phase: "submit" | "reveal" | "result" | "done";
  winner_player_id: string | null;
}

export interface DbSubmission {
  id: string;
  round_id: string;
  player_id: string;
  card_id: string;
  card_text: string;
}

export interface DbReaction {
  id: string;
  submission_id: string;
  player_id: string;
  reaction_id: string;
}

export interface DbHand {
  id: string;
  player_id: string;
  card_id: string;
  card_text: string;
  card_vibe: Vibe;
}

export const AVATAR_COLORS = ["#fb7185", "#38bdf8", "#34d399", "#f59e0b", "#818cf8", "#f97316", "#14b8a6"];

export async function getDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const id = `dev-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  await AsyncStorage.setItem(DEVICE_KEY, id);
  return id;
}

function genCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function setLastCode(code: string): Promise<void> {
  await AsyncStorage.setItem(LAST_CODE_KEY, code.toUpperCase());
}

export async function getLastCode(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_CODE_KEY);
}

export async function createGame(vibe: Vibe, hostName: string): Promise<{ game: DbGame; player: DbPlayer }> {
  const deviceId = await getDeviceId();
  const code = genCode();
  const { data: game, error: gErr } = await supabase
    .from("games")
    .insert({ code, vibe, host_device_id: deviceId, status: "lobby" })
    .select()
    .single();
  if (gErr || !game) throw gErr || new Error("Game create failed");

  const { data: player, error: pErr } = await supabase
    .from("players")
    .insert({
      game_id: game.id,
      device_id: deviceId,
      name: hostName,
      color: AVATAR_COLORS[0],
      is_host: true,
    })
    .select()
    .single();
  if (pErr || !player) throw pErr || new Error("Player create failed");

  await setLastCode(game.code);
  return { game: game as DbGame, player: player as DbPlayer };
}

export async function getGameByCode(code: string): Promise<DbGame | null> {
  const { data } = await supabase.from("games").select("*").eq("code", code.toUpperCase()).maybeSingle();
  return (data as DbGame) || null;
}

export async function joinGame(code: string, name: string): Promise<{ game: DbGame; player: DbPlayer }> {
  const game = await getGameByCode(code);
  if (!game) throw new Error("Game not found");
  const deviceId = await getDeviceId();

  const { data: existing } = await supabase
    .from("players")
    .select("*")
    .eq("game_id", game.id)
    .eq("device_id", deviceId)
    .maybeSingle();
  if (existing) {
    await setLastCode(game.code);
    return { game, player: existing as DbPlayer };
  }

  const { count } = await supabase.from("players").select("*", { count: "exact", head: true }).eq("game_id", game.id);
  const idx = count ?? 0;
  const { data: player, error } = await supabase
    .from("players")
    .insert({
      game_id: game.id,
      device_id: deviceId,
      name,
      color: AVATAR_COLORS[idx % AVATAR_COLORS.length],
      is_host: false,
    })
    .select()
    .single();
  if (error || !player) throw error || new Error("Join failed");
  await setLastCode(game.code);
  return { game, player: player as DbPlayer };
}

export async function listPlayers(gameId: string): Promise<DbPlayer[]> {
  const { data } = await supabase.from("players").select("*").eq("game_id", gameId).order("joined_at", { ascending: true });
  return (data || []) as DbPlayer[];
}

export async function getCurrentRound(gameId: string, roundNumber: number): Promise<DbRound | null> {
  const { data } = await supabase
    .from("rounds")
    .select("*")
    .eq("game_id", gameId)
    .eq("round_number", roundNumber)
    .maybeSingle();
  return (data as DbRound) || null;
}

export async function listSubmissions(roundId: string): Promise<DbSubmission[]> {
  const { data } = await supabase.from("submissions").select("*").eq("round_id", roundId).order("created_at", { ascending: true });
  return (data || []) as DbSubmission[];
}

export async function listReactionsForRound(roundId: string): Promise<DbReaction[]> {
  const subs = await listSubmissions(roundId);
  if (!subs.length) return [];
  const { data } = await supabase.from("reactions").select("*").in("submission_id", subs.map((s) => s.id));
  return (data || []) as DbReaction[];
}

export async function getHand(playerId: string): Promise<DbHand[]> {
  const { data } = await supabase.from("player_hands").select("*").eq("player_id", playerId);
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
  await supabase.from("player_hands").insert(
    cards.map((c) => ({
      player_id: playerId,
      card_id: c.id,
      card_text: c.text,
      card_vibe: c.vibe,
    }))
  );
}

export async function startGame(gameId: string): Promise<void> {
  const { data: game } = await supabase.from("games").select("*").eq("id", gameId).single();
  if (!game || game.status !== "lobby") return;

  const players = await listPlayers(gameId);
  for (const p of players) {
    await dealNewHandForPlayer(p.id, game.vibe as Vibe, new Set());
  }

  const prompt = pickRandom(eligibleCards(PROMPTS, game.vibe as Vibe));
  await supabase.from("rounds").insert({
    game_id: gameId,
    round_number: 1,
    prompt_id: prompt.id,
    prompt_text: prompt.text,
    prompt_vibe: prompt.vibe,
    phase: "submit",
  });

  await supabase.from("games").update({ status: "in_progress", current_round: 1 }).eq("id", gameId);
}

export async function submitAnswer(
  gameId: string,
  roundId: string,
  playerId: string,
  card: { id: string; text: string; vibe: Vibe }
): Promise<void> {
  const { error } = await supabase
    .from("submissions")
    .insert({ round_id: roundId, player_id: playerId, card_id: card.id, card_text: card.text, card_vibe: card.vibe });
  if (error && !error.message?.includes("duplicate")) throw error;

  await supabase.from("player_hands").delete().eq("player_id", playerId).eq("card_id", card.id);

  const { data: game } = await supabase.from("games").select("vibe").eq("id", gameId).single();
  if (game) {
    const hand = await getHand(playerId);
    const exclude = new Set(hand.map((h) => h.card_id));
    exclude.add(card.id);
    const pool = eligibleCards(ANSWERS, game.vibe as Vibe).filter((c) => !exclude.has(c.id));
    if (pool.length) {
      const next = pickRandom(pool);
      await supabase
        .from("player_hands")
        .insert({ player_id: playerId, card_id: next.id, card_text: next.text, card_vibe: next.vibe });
    }
  }

  const players = await listPlayers(gameId);
  const subs = await listSubmissions(roundId);
  if (subs.length >= players.length) {
    await supabase.from("rounds").update({ phase: "reveal" }).eq("id", roundId).eq("phase", "submit");
  }
}

export async function reactToSubmission(submissionId: string, playerId: string, reactionId: string): Promise<void> {
  await supabase.from("reactions").delete().eq("submission_id", submissionId).eq("player_id", playerId);
  await supabase.from("reactions").insert({ submission_id: submissionId, player_id: playerId, reaction_id: reactionId });
}

export async function tryAdvanceToResult(gameId: string, roundId: string): Promise<void> {
  const players = await listPlayers(gameId);
  const subs = await listSubmissions(roundId);
  const reactions = await listReactionsForRound(roundId);

  let allDone = true;
  for (const sub of subs) {
    for (const p of players) {
      if (p.id === sub.player_id) continue;
      if (!reactions.some((r) => r.submission_id === sub.id && r.player_id === p.id)) {
        allDone = false;
        break;
      }
    }
    if (!allDone) break;
  }
  if (!allDone) return;

  let winnerId: string | null = null;
  let max = -1;
  for (const sub of subs) {
    const total = reactions.filter((r) => r.submission_id === sub.id).length;
    if (total > max) {
      max = total;
      winnerId = sub.player_id;
    }
  }

  const { data: roundNow } = await supabase.from("rounds").select("phase").eq("id", roundId).single();
  if (roundNow?.phase !== "reveal") return;
  await supabase.from("rounds").update({ phase: "result", winner_player_id: winnerId }).eq("id", roundId).eq("phase", "reveal");

  for (const sub of subs) {
    const total = reactions.filter((r) => r.submission_id === sub.id).length;
    if (!total) continue;
    const player = players.find((p) => p.id === sub.player_id);
    if (!player) continue;
    await supabase.from("players").update({ total_reactions: player.total_reactions + total }).eq("id", player.id);
  }
}

export async function advanceToNextRound(gameId: string): Promise<void> {
  const { data: game } = await supabase.from("games").select("*").eq("id", gameId).single();
  if (!game) return;
  const nextRoundNumber = game.current_round + 1;
  if (nextRoundNumber > TOTAL_ROUNDS) {
    await supabase.from("games").update({ status: "completed" }).eq("id", gameId);
    return;
  }

  await supabase.from("rounds").update({ phase: "done" }).eq("game_id", gameId).eq("round_number", game.current_round);
  const prompt = pickRandom(eligibleCards(PROMPTS, game.vibe as Vibe));
  await supabase.from("rounds").insert({
    game_id: gameId,
    round_number: nextRoundNumber,
    prompt_id: prompt.id,
    prompt_text: prompt.text,
    prompt_vibe: prompt.vibe,
    phase: "submit",
  });
  await supabase.from("games").update({ current_round: nextRoundNumber }).eq("id", gameId);
}
