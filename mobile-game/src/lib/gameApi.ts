import AsyncStorage from "@react-native-async-storage/async-storage";
import { Vibe } from "./gameData";

const DEVICE_KEY = "vibedecks_device_id";
export const LAST_CODE_KEY = "vibedecks_last_game_code";
const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  console.warn("EXPO_PUBLIC_API_URL is not set. API calls will fail until configured.");
}

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
const memoryStorage = new Map<string, string>();

async function storageGet(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return memoryStorage.get(key) ?? null;
  }
}

async function storageSet(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    memoryStorage.set(key, value);
  }
}

async function http<T>(path: string, options?: RequestInit): Promise<T> {
  if (!API_URL) throw new Error("Missing EXPO_PUBLIC_API_URL");
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    ...options,
  });
  const raw = await res.text();
  let data: unknown = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const message =
      (data as { error?: string } | null)?.error ||
      (raw && !raw.startsWith("<") ? raw : "") ||
      `${res.status} ${res.statusText}`;
    throw new Error(message || "Request failed");
  }
  if (data === null) {
    throw new Error("API returned an empty response");
  }
  return data as T;
}

export async function getDeviceId(): Promise<string> {
  const existing = await storageGet(DEVICE_KEY);
  if (existing) return existing;
  const id = `dev-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  await storageSet(DEVICE_KEY, id);
  return id;
}

export async function setLastCode(code: string): Promise<void> {
  await storageSet(LAST_CODE_KEY, code.toUpperCase());
}

export async function getLastCode(): Promise<string | null> {
  return storageGet(LAST_CODE_KEY);
}

export async function createGame(vibe: Vibe, hostName: string): Promise<{ game: DbGame; player: DbPlayer }> {
  const deviceId = await getDeviceId();
  const state = await http<{ game: DbGame; me: DbPlayer }>("/api/create-game", {
    method: "POST",
    body: JSON.stringify({ vibe, hostName, deviceId }),
  });
  await setLastCode(state.game.code);
  return { game: state.game, player: state.me };
}

export async function getGameByCode(code: string): Promise<DbGame | null> {
  return http<DbGame | null>(`/api/game-by-code?code=${encodeURIComponent(code)}`);
}

export async function joinGame(code: string, name: string): Promise<{ game: DbGame; player: DbPlayer }> {
  const deviceId = await getDeviceId();
  const state = await http<{ game: DbGame; me: DbPlayer }>("/api/join-game", {
    method: "POST",
    body: JSON.stringify({ code, name, deviceId }),
  });
  await setLastCode(state.game.code);
  return { game: state.game, player: state.me };
}

export async function listPlayers(gameId: string): Promise<DbPlayer[]> {
  return http<DbPlayer[]>(`/api/players?gameId=${encodeURIComponent(gameId)}`);
}

export async function getCurrentRound(gameId: string, roundNumber: number): Promise<DbRound | null> {
  return http<DbRound | null>(
    `/api/current-round?gameId=${encodeURIComponent(gameId)}&roundNumber=${encodeURIComponent(String(roundNumber))}`
  );
}

export async function listSubmissions(roundId: string): Promise<DbSubmission[]> {
  return http<DbSubmission[]>(`/api/submissions?roundId=${encodeURIComponent(roundId)}`);
}

export async function listReactionsForRound(roundId: string): Promise<DbReaction[]> {
  return http<DbReaction[]>(`/api/reactions?roundId=${encodeURIComponent(roundId)}`);
}

export async function getHand(playerId: string): Promise<DbHand[]> {
  return http<DbHand[]>(`/api/hand?playerId=${encodeURIComponent(playerId)}`);
}

export async function startGame(gameId: string): Promise<void> {
  await http<{ ok: boolean }>("/api/start-game", { method: "POST", body: JSON.stringify({ gameId }) });
}

export async function submitAnswer(
  gameId: string,
  roundId: string,
  playerId: string,
  card: { id: string; text: string; vibe: Vibe }
): Promise<void> {
  await http<{ ok: boolean }>("/api/submit-answer", {
    method: "POST",
    body: JSON.stringify({ gameId, roundId, playerId, card }),
  });
}

export async function reactToSubmission(submissionId: string, playerId: string, reactionId: string): Promise<void> {
  await http<{ ok: boolean }>("/api/react", {
    method: "POST",
    body: JSON.stringify({ submissionId, playerId, reactionId }),
  });
}

export async function tryAdvanceToResult(gameId: string, roundId: string): Promise<void> {
  await http<{ ok: boolean }>("/api/try-advance-result", {
    method: "POST",
    body: JSON.stringify({ gameId, roundId }),
  });
}

export async function advanceToNextRound(gameId: string): Promise<void> {
  await http<{ ok: boolean }>("/api/advance-round", { method: "POST", body: JSON.stringify({ gameId }) });
}
