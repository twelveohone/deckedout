import cors from "cors";
import express from "express";
import crypto from "node:crypto";
import { Pool } from "pg";

const app = express();
const port = Number(process.env.PORT) || 3000;
const HAND_SIZE = 7;
const DEFAULT_ROUNDS = 8;

type Vibe = "Playful" | "Clever" | "Spicy" | "Dark";
type Phase = "submit" | "reveal" | "result" | "done";
type GameStatus = "lobby" | "in_progress" | "completed";
type Card = { id: string; text: string; vibe: Vibe };

const VIBE_ELIGIBILITY: Record<Vibe, Vibe[]> = {
  Playful: ["Playful"],
  Clever: ["Playful", "Clever"],
  Spicy: ["Playful", "Clever", "Spicy"],
  Dark: ["Playful", "Clever", "Spicy", "Dark"],
};
const PROMPTS: Card[] = [
  { id: "p1", text: "The real reason my dog will not look me in the eye is ___.", vibe: "Playful" },
  { id: "p2", text: "My new morning routine includes 30 minutes of ___.", vibe: "Playful" },
  { id: "p3", text: "The school talent show was ruined by ___.", vibe: "Playful" },
  { id: "p4", text: "I would trade my left sock for ___.", vibe: "Playful" },
  { id: "c1", text: "My therapist gently suggested I stop ___.", vibe: "Clever" },
  { id: "c2", text: "A surprisingly effective negotiating tactic: ___.", vibe: "Clever" },
  { id: "c3", text: "The most aggressive form of self-care is ___.", vibe: "Clever" },
  { id: "s1", text: "My ex still texts me about ___.", vibe: "Spicy" },
  { id: "s2", text: "The HR complaint specifically mentioned ___.", vibe: "Spicy" },
  { id: "s3", text: "I will absolutely judge you for ___.", vibe: "Spicy" },
  { id: "d1", text: "My will leaves everything to ___.", vibe: "Dark" },
  { id: "d2", text: "In hindsight, the warning signs were ___.", vibe: "Dark" },
  { id: "d3", text: "My funeral playlist opens with ___.", vibe: "Dark" },
];
const ANSWERS: Card[] = [
  { id: "a1", text: "a suspicious amount of glitter", vibe: "Playful" },
  { id: "a2", text: "an emotionally available raccoon", vibe: "Playful" },
  { id: "a3", text: "a goose that knows your name", vibe: "Playful" },
  { id: "a4", text: "a pony named Brenda", vibe: "Playful" },
  { id: "a5", text: "late-stage capitalism", vibe: "Clever" },
  { id: "a6", text: "plausible deniability", vibe: "Clever" },
  { id: "a7", text: "an MFA in passive aggression", vibe: "Clever" },
  { id: "a8", text: "one perfectly placed semicolon", vibe: "Clever" },
  { id: "a9", text: "tequila and bad decisions", vibe: "Spicy" },
  { id: "a10", text: "sending the screenshot", vibe: "Spicy" },
  { id: "a11", text: "a thirst trap with a typo", vibe: "Spicy" },
  { id: "a12", text: "subtweeting my mother", vibe: "Spicy" },
  { id: "a13", text: "the void, but make it cozy", vibe: "Dark" },
  { id: "a14", text: "inherited generational trauma", vibe: "Dark" },
  { id: "a15", text: "a clown at my funeral", vibe: "Dark" },
  { id: "a16", text: "the heat death of the universe", vibe: "Dark" },
];
const AVATAR_COLORS = ["#fb7185", "#38bdf8", "#34d399", "#f59e0b", "#818cf8", "#f97316", "#14b8a6"];
const BOT_NAMES = ["Disco Bot", "Neon Bot", "Chaos Bot", "Glitter Bot"];

const corsOrigin = process.env.CORS_ORIGIN;
app.use(cors({ origin: corsOrigin === "*" || !corsOrigin ? true : corsOrigin.split(",").map((s) => s.trim()) }));
app.use(express.json());

function dbPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const ssl =
    process.env.NODE_ENV === "production" || connectionString.includes("render.com")
      ? { rejectUnauthorized: false }
      : false;
  return new Pool({ connectionString, ssl });
}
const pool = dbPool();

function eligibleCards<T extends Card>(cards: T[], vibe: Vibe): T[] {
  return cards.filter((c) => VIBE_ELIGIBILITY[vibe].includes(c.vibe));
}
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function genId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}
function genCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function initSchema(): Promise<void> {
  await pool.query("CREATE TABLE IF NOT EXISTS games (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, vibe TEXT NOT NULL, status TEXT NOT NULL, host_device_id TEXT NOT NULL, current_round INT NOT NULL DEFAULT 0, round_count INT NOT NULL DEFAULT 8, table_skin TEXT NOT NULL DEFAULT 'classic', card_back TEXT NOT NULL DEFAULT 'stripes', allow_skin_donations BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  await pool.query("ALTER TABLE games ADD COLUMN IF NOT EXISTS round_count INT NOT NULL DEFAULT 8");
  await pool.query("ALTER TABLE games ADD COLUMN IF NOT EXISTS table_skin TEXT NOT NULL DEFAULT 'classic'");
  await pool.query("ALTER TABLE games ADD COLUMN IF NOT EXISTS card_back TEXT NOT NULL DEFAULT 'stripes'");
  await pool.query("ALTER TABLE games ADD COLUMN IF NOT EXISTS allow_skin_donations BOOLEAN NOT NULL DEFAULT FALSE");
  await pool.query("CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE, device_id TEXT NOT NULL, name TEXT NOT NULL, color TEXT NOT NULL, is_host BOOLEAN NOT NULL DEFAULT FALSE, is_bot BOOLEAN NOT NULL DEFAULT FALSE, total_reactions INT NOT NULL DEFAULT 0, joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(game_id, device_id))");
  await pool.query("ALTER TABLE players ADD COLUMN IF NOT EXISTS is_bot BOOLEAN NOT NULL DEFAULT FALSE");
  await pool.query("CREATE TABLE IF NOT EXISTS rounds (id TEXT PRIMARY KEY, game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE, round_number INT NOT NULL, prompt_id TEXT NOT NULL, prompt_text TEXT NOT NULL, prompt_vibe TEXT NOT NULL, phase TEXT NOT NULL, winner_player_id TEXT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(game_id, round_number))");
  await pool.query("CREATE TABLE IF NOT EXISTS submissions (id TEXT PRIMARY KEY, round_id TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE, player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE, card_id TEXT NOT NULL, card_text TEXT NOT NULL, card_vibe TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(round_id, player_id))");
  await pool.query("CREATE TABLE IF NOT EXISTS reactions (id TEXT PRIMARY KEY, submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE, player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE, reaction_id TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(submission_id, player_id))");
  await pool.query("CREATE TABLE IF NOT EXISTS player_hands (id TEXT PRIMARY KEY, player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE, card_id TEXT NOT NULL, card_text TEXT NOT NULL, card_vibe TEXT NOT NULL)");
}

async function getState(code: string, deviceId: string): Promise<unknown> {
  const game = (await pool.query("SELECT * FROM games WHERE code = $1", [code.toUpperCase()])).rows[0];
  if (!game) return null;
  const me = (await pool.query("SELECT * FROM players WHERE game_id = $1 AND device_id = $2", [game.id, deviceId])).rows[0] ?? null;
  const players = (await pool.query("SELECT * FROM players WHERE game_id = $1 ORDER BY joined_at ASC", [game.id])).rows;
  const round = (await pool.query("SELECT * FROM rounds WHERE game_id = $1 AND round_number = $2", [game.id, game.current_round])).rows[0] ?? null;
  const submissions = round ? (await pool.query("SELECT * FROM submissions WHERE round_id = $1 ORDER BY created_at ASC", [round.id])).rows : [];
  const reactions = round
    ? (await pool.query("SELECT r.* FROM reactions r JOIN submissions s ON s.id = r.submission_id WHERE s.round_id = $1", [round.id])).rows
    : [];
  const hand = me ? (await pool.query("SELECT * FROM player_hands WHERE player_id = $1", [me.id])).rows : [];
  return { game, me, players, round, submissions, reactions, hand };
}

async function dealNewHandForPlayer(playerId: string, vibe: Vibe): Promise<void> {
  const poolCards = eligibleCards(ANSWERS, vibe);
  const used = new Set<string>();
  while (used.size < Math.min(HAND_SIZE, poolCards.length)) {
    const card = pickRandom(poolCards);
    if (used.has(card.id)) continue;
    used.add(card.id);
    await pool.query("INSERT INTO player_hands (id, player_id, card_id, card_text, card_vibe) VALUES ($1,$2,$3,$4,$5)", [genId("hand"), playerId, card.id, card.text, card.vibe]);
  }
}

async function ensureTestBots(gameId: string): Promise<void> {
  const playerRows = (
    await pool.query("SELECT id FROM players WHERE game_id = $1", [gameId])
  ).rows as Array<{ id: string }>;
  if (playerRows.length > 1) return;
  for (let i = 0; i < 2; i += 1) {
    const botId = genId("player");
    const botDevice = `bot-${gameId}-${i + 1}`;
    await pool.query(
      "INSERT INTO players (id, game_id, device_id, name, color, is_host, is_bot, total_reactions) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
      [
        botId,
        gameId,
        botDevice,
        BOT_NAMES[i % BOT_NAMES.length],
        AVATAR_COLORS[(i + 1) % AVATAR_COLORS.length],
        false,
        true,
        0,
      ]
    );
  }
}

async function autoBotSubmissions(gameId: string, roundId: string): Promise<void> {
  const game = (await pool.query("SELECT vibe FROM games WHERE id = $1", [gameId])).rows[0] as { vibe: Vibe } | undefined;
  const bots = (
    await pool.query("SELECT id FROM players WHERE game_id = $1 AND is_bot = TRUE", [gameId])
  ).rows as Array<{ id: string }>;
  for (const bot of bots) {
    const hand = (
      await pool.query("SELECT card_id, card_text, card_vibe FROM player_hands WHERE player_id = $1 LIMIT 1", [bot.id])
    ).rows[0] as { card_id: string; card_text: string; card_vibe: string } | undefined;
    if (!hand) continue;
    await pool.query(
      "INSERT INTO submissions (id, round_id, player_id, card_id, card_text, card_vibe) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (round_id, player_id) DO NOTHING",
      [genId("sub"), roundId, bot.id, hand.card_id, hand.card_text, hand.card_vibe]
    );
    await pool.query("DELETE FROM player_hands WHERE player_id = $1 AND card_id = $2", [bot.id, hand.card_id]);
    if (game) {
      const existing = (
        await pool.query("SELECT card_id FROM player_hands WHERE player_id = $1", [bot.id])
      ).rows as Array<{ card_id: string }>;
      const excluded = new Set(existing.map((c) => c.card_id));
      excluded.add(hand.card_id);
      const choices = eligibleCards(ANSWERS, game.vibe).filter((c) => !excluded.has(c.id));
      if (choices.length) {
        const next = pickRandom(choices);
        await pool.query(
          "INSERT INTO player_hands (id, player_id, card_id, card_text, card_vibe) VALUES ($1,$2,$3,$4,$5)",
          [genId("hand"), bot.id, next.id, next.text, next.vibe]
        );
      }
    }
  }
}

async function autoBotReactions(roundId: string): Promise<void> {
  const submissions = (
    await pool.query("SELECT id, player_id FROM submissions WHERE round_id = $1", [roundId])
  ).rows as Array<{ id: string; player_id: string }>;
  if (!submissions.length) return;
  const botPlayers = (
    await pool.query(
      "SELECT p.id FROM players p JOIN rounds r ON r.game_id = p.game_id WHERE r.id = $1 AND p.is_bot = TRUE",
      [roundId]
    )
  ).rows as Array<{ id: string }>;
  const reactionPool = ["lol", "love", "yikes", "mind"];
  for (const bot of botPlayers) {
    for (const sub of submissions) {
      if (sub.player_id === bot.id) continue;
      const reactionId = reactionPool[Math.floor(Math.random() * reactionPool.length)];
      await pool.query(
        "INSERT INTO reactions (id, submission_id, player_id, reaction_id) VALUES ($1,$2,$3,$4) ON CONFLICT (submission_id, player_id) DO NOTHING",
        [genId("react"), sub.id, bot.id, reactionId]
      );
    }
  }
}

app.get("/health", (_req, res) => res.json({ ok: true, service: "decked-out-api" }));
app.get("/health/db", async (_req, res) => {
  try {
    const r = await pool.query("SELECT 1 AS n");
    res.json({ ok: true, db: r.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/create-game", async (req, res) => {
  try {
    const { vibe, hostName, deviceId } = req.body as { vibe: Vibe; hostName: string; deviceId: string };
    const gameId = genId("game");
    const playerId = genId("player");
    const code = genCode();
    await pool.query("INSERT INTO games (id, code, vibe, status, host_device_id, current_round, round_count, table_skin, card_back, allow_skin_donations) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)", [gameId, code, vibe, "lobby", deviceId, 0, DEFAULT_ROUNDS, "classic", "stripes", false]);
    await pool.query("INSERT INTO players (id, game_id, device_id, name, color, is_host, total_reactions) VALUES ($1,$2,$3,$4,$5,$6,$7)", [playerId, gameId, deviceId, hostName, AVATAR_COLORS[0], true, 0]);
    res.json(await getState(code, deviceId));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/join-game", async (req, res) => {
  try {
    const { code, name, deviceId } = req.body as { code: string; name: string; deviceId: string };
    const game = (await pool.query("SELECT * FROM games WHERE code = $1", [code.toUpperCase()])).rows[0];
    if (!game) return res.status(404).json({ error: "Game not found" });
    const existing = await pool.query("SELECT * FROM players WHERE game_id = $1 AND device_id = $2", [game.id, deviceId]);
    if (!existing.rowCount) {
      const count = Number((await pool.query("SELECT COUNT(*)::int AS c FROM players WHERE game_id = $1", [game.id])).rows[0]?.c ?? 0);
      await pool.query("INSERT INTO players (id, game_id, device_id, name, color, is_host, total_reactions) VALUES ($1,$2,$3,$4,$5,$6,$7)", [genId("player"), game.id, deviceId, name, AVATAR_COLORS[count % AVATAR_COLORS.length], false, 0]);
    }
    res.json(await getState(game.code as string, deviceId));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/api/state", async (req, res) => {
  try {
    const code = String(req.query.code || "");
    const deviceId = String(req.query.deviceId || "");
    const state = await getState(code, deviceId);
    if (!state) return res.status(404).json({ error: "Game not found" });
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/api/game-by-code", async (req, res) => {
  try {
    const code = String(req.query.code || "").toUpperCase();
    const game = (await pool.query("SELECT * FROM games WHERE code = $1", [code])).rows[0] ?? null;
    res.json(game);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/api/players", async (req, res) => {
  try {
    const gameId = String(req.query.gameId || "");
    const players = (await pool.query("SELECT * FROM players WHERE game_id = $1 ORDER BY joined_at ASC", [gameId])).rows;
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/api/current-round", async (req, res) => {
  try {
    const gameId = String(req.query.gameId || "");
    const roundNumber = Number(req.query.roundNumber || 0);
    const round = (await pool.query("SELECT * FROM rounds WHERE game_id = $1 AND round_number = $2", [gameId, roundNumber])).rows[0] ?? null;
    res.json(round);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/api/submissions", async (req, res) => {
  try {
    const roundId = String(req.query.roundId || "");
    const submissions = (await pool.query("SELECT * FROM submissions WHERE round_id = $1 ORDER BY created_at ASC", [roundId])).rows;
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/api/reactions", async (req, res) => {
  try {
    const roundId = String(req.query.roundId || "");
    const reactions = (await pool.query("SELECT r.* FROM reactions r JOIN submissions s ON s.id = r.submission_id WHERE s.round_id = $1", [roundId])).rows;
    res.json(reactions);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get("/api/hand", async (req, res) => {
  try {
    const playerId = String(req.query.playerId || "");
    const hand = (await pool.query("SELECT * FROM player_hands WHERE player_id = $1", [playerId])).rows;
    res.json(hand);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/start-game", async (req, res) => {
  try {
    const { gameId } = req.body as { gameId: string };
    const game = (await pool.query("SELECT * FROM games WHERE id = $1", [gameId])).rows[0] as { vibe: Vibe; status: GameStatus } | undefined;
    if (!game) return res.status(404).json({ error: "Game not found" });
    if (game.status !== "lobby") return res.json({ ok: true });
    await ensureTestBots(gameId);
    const players = (await pool.query("SELECT id FROM players WHERE game_id = $1", [gameId])).rows as Array<{ id: string }>;
    for (const p of players) await dealNewHandForPlayer(p.id, game.vibe);
    const prompt = pickRandom(eligibleCards(PROMPTS, game.vibe));
    const roundId = genId("round");
    await pool.query("INSERT INTO rounds (id, game_id, round_number, prompt_id, prompt_text, prompt_vibe, phase, winner_player_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)", [roundId, gameId, 1, prompt.id, prompt.text, prompt.vibe, "submit", null]);
    await autoBotSubmissions(gameId, roundId);
    await pool.query("UPDATE games SET status = $1, current_round = $2 WHERE id = $3", ["in_progress", 1, gameId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/submit-answer", async (req, res) => {
  try {
    const { gameId, roundId, playerId, card } = req.body as { gameId: string; roundId: string; playerId: string; card: Card };
    await pool.query("INSERT INTO submissions (id, round_id, player_id, card_id, card_text, card_vibe) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (round_id, player_id) DO NOTHING", [genId("sub"), roundId, playerId, card.id, card.text, card.vibe]);
    await pool.query("DELETE FROM player_hands WHERE player_id = $1 AND card_id = $2", [playerId, card.id]);
    const game = (await pool.query("SELECT vibe FROM games WHERE id = $1", [gameId])).rows[0] as { vibe: Vibe } | undefined;
    if (game) {
      const handRows = (await pool.query("SELECT card_id FROM player_hands WHERE player_id = $1", [playerId])).rows as Array<{ card_id: string }>;
      const exclude = new Set(handRows.map((h) => h.card_id));
      exclude.add(card.id);
      const choices = eligibleCards(ANSWERS, game.vibe).filter((c) => !exclude.has(c.id));
      if (choices.length) {
        const next = pickRandom(choices);
        await pool.query("INSERT INTO player_hands (id, player_id, card_id, card_text, card_vibe) VALUES ($1,$2,$3,$4,$5)", [genId("hand"), playerId, next.id, next.text, next.vibe]);
      }
    }
    const playersCount = Number((await pool.query("SELECT COUNT(*)::int AS c FROM players WHERE game_id = $1", [gameId])).rows[0]?.c ?? 0);
    const subsCount = Number((await pool.query("SELECT COUNT(*)::int AS c FROM submissions WHERE round_id = $1", [roundId])).rows[0]?.c ?? 0);
    if (subsCount >= playersCount) {
      await pool.query("UPDATE rounds SET phase = $1 WHERE id = $2 AND phase = $3", ["reveal", roundId, "submit"]);
      await autoBotReactions(roundId);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/react", async (req, res) => {
  try {
    const { submissionId, playerId, reactionId } = req.body as { submissionId: string; playerId: string; reactionId: string };
    await pool.query("DELETE FROM reactions WHERE submission_id = $1 AND player_id = $2", [submissionId, playerId]);
    await pool.query("INSERT INTO reactions (id, submission_id, player_id, reaction_id) VALUES ($1,$2,$3,$4)", [genId("react"), submissionId, playerId, reactionId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/try-advance-result", async (req, res) => {
  try {
    const { gameId, roundId } = req.body as { gameId: string; roundId: string };
    const players = (await pool.query("SELECT id, total_reactions FROM players WHERE game_id = $1", [gameId])).rows as Array<{ id: string; total_reactions: number }>;
    const subs = (await pool.query("SELECT id, player_id FROM submissions WHERE round_id = $1", [roundId])).rows as Array<{ id: string; player_id: string }>;
    const reactions = (await pool.query("SELECT r.submission_id, r.player_id FROM reactions r JOIN submissions s ON s.id = r.submission_id WHERE s.round_id = $1", [roundId])).rows as Array<{ submission_id: string; player_id: string }>;
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
    if (!allDone) return res.json({ ok: true, advanced: false });
    let winnerId: string | null = null;
    let max = -1;
    for (const sub of subs) {
      const total = reactions.filter((r) => r.submission_id === sub.id).length;
      if (total > max) {
        max = total;
        winnerId = sub.player_id;
      }
    }
    const round = (await pool.query("SELECT phase FROM rounds WHERE id = $1", [roundId])).rows[0] as { phase: Phase } | undefined;
    if (round?.phase !== "reveal") return res.json({ ok: true, advanced: false });
    await pool.query("UPDATE rounds SET phase = $1, winner_player_id = $2 WHERE id = $3 AND phase = $4", ["result", winnerId, roundId, "reveal"]);
    for (const sub of subs) {
      const total = reactions.filter((r) => r.submission_id === sub.id).length;
      if (total > 0) await pool.query("UPDATE players SET total_reactions = total_reactions + $1 WHERE id = $2", [total, sub.player_id]);
    }
    res.json({ ok: true, advanced: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/advance-round", async (req, res) => {
  try {
    const { gameId } = req.body as { gameId: string };
    const game = (await pool.query("SELECT * FROM games WHERE id = $1", [gameId])).rows[0] as { current_round: number; vibe: Vibe; round_count: number } | undefined;
    if (!game) return res.status(404).json({ error: "Game not found" });
    const nextRound = game.current_round + 1;
    if (nextRound > (game.round_count || DEFAULT_ROUNDS)) {
      await pool.query("UPDATE games SET status = $1 WHERE id = $2", ["completed", gameId]);
      return res.json({ ok: true, completed: true });
    }
    await pool.query("UPDATE rounds SET phase = $1 WHERE game_id = $2 AND round_number = $3", ["done", gameId, game.current_round]);
    const prompt = pickRandom(eligibleCards(PROMPTS, game.vibe));
    const roundId = genId("round");
    await pool.query("INSERT INTO rounds (id, game_id, round_number, prompt_id, prompt_text, prompt_vibe, phase, winner_player_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)", [roundId, gameId, nextRound, prompt.id, prompt.text, prompt.vibe, "submit", null]);
    await autoBotSubmissions(gameId, roundId);
    await pool.query("UPDATE games SET current_round = $1 WHERE id = $2", [nextRound, gameId]);
    res.json({ ok: true, completed: false });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/update-game-settings", async (req, res) => {
  try {
    const { gameId, tableSkin, cardBack, allowSkinDonations, roundCount } = req.body as {
      gameId: string;
      tableSkin?: string;
      cardBack?: string;
      allowSkinDonations?: boolean;
      roundCount?: number;
    };
    await pool.query(
      "UPDATE games SET table_skin = COALESCE($1, table_skin), card_back = COALESCE($2, card_back), allow_skin_donations = COALESCE($3, allow_skin_donations), round_count = COALESCE($4, round_count) WHERE id = $5",
      [
        tableSkin ?? null,
        cardBack ?? null,
        typeof allowSkinDonations === "boolean" ? allowSkinDonations : null,
        typeof roundCount === "number" ? roundCount : null,
        gameId,
      ]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) console.warn("JWT_SECRET is not set");
initSchema()
  .then(() => app.listen(port, "0.0.0.0", () => console.log(`listening on 0.0.0.0:${port}`)))
  .catch((err) => {
    console.error("startup failed", err);
    process.exit(1);
  });
