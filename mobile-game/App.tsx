import "react-native-url-polyfill/auto";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  type DimensionValue,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar as NativeStatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { REACTIONS, VIBES, Vibe } from "./src/lib/gameData";
import {
  advanceToNextRound,
  createGame,
  DbGame,
  DbPlayer,
  DbReaction,
  DbRound,
  DbSubmission,
  getCurrentRound,
  getGameByCode,
  getHand,
  getLastCode,
  joinGame,
  listPlayers,
  listReactionsForRound,
  listSubmissions,
  reactToSubmission,
  startGame,
  submitAnswer,
  tryAdvanceToResult,
} from "./src/lib/gameApi";

type Screen = "home" | "setup" | "lobby" | "submit" | "reveal" | "result" | "end";

type BackdropCardSpec = {
  top?: DimensionValue;
  bottom?: DimensionValue;
  left?: DimensionValue;
  right?: DimensionValue;
  rotate: string;
  color: string;
  accent: string;
};

const BACKDROP_CARDS: BackdropCardSpec[] = [
  { top: "6%", left: "-8%", rotate: "-18deg", color: "#3a2454", accent: "#ffc857" },
  { top: "11%", right: "-10%", rotate: "17deg", color: "#2e1d45", accent: "#2ee8c3" },
  { top: "34%", left: "-6%", rotate: "12deg", color: "#412356", accent: "#ff5e8a" },
  { top: "37%", right: "-9%", rotate: "-14deg", color: "#2b1a41", accent: "#9b5de5" },
  { bottom: "22%", left: "8%", rotate: "-10deg", color: "#37214f", accent: "#ffc857" },
  { bottom: "16%", right: "10%", rotate: "13deg", color: "#28193f", accent: "#2ee8c3" },
  { bottom: "-6%", left: "-2%", rotate: "8deg", color: "#442a61", accent: "#ff5e8a" },
  { bottom: "-8%", right: "-3%", rotate: "-9deg", color: "#312049", accent: "#9b5de5" },
];

function PartyBackdrop() {
  return (
    <View style={styles.backdrop} pointerEvents="none">
      {BACKDROP_CARDS.map((card, idx) => (
        <View
          key={idx}
          style={[
            styles.backdropCard,
            {
              top: card.top,
              bottom: card.bottom,
              left: card.left,
              right: card.right,
              transform: [{ rotate: card.rotate }],
              backgroundColor: card.color,
              borderColor: card.accent,
            },
          ]}
        >
          <View style={[styles.backPatternBand, { backgroundColor: card.accent }]} />
          <View style={styles.backPatternRow}>
            <View style={[styles.backPatternDot, { backgroundColor: card.accent }]} />
            <View style={[styles.backPatternDot, { backgroundColor: "#fff8f0" }]} />
            <View style={[styles.backPatternDot, { backgroundColor: card.accent }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function App() {
  const [loading, setLoading] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [name, setName] = useState("");
  const [gameCode, setGameCode] = useState("");
  const [selectedVibe, setSelectedVibe] = useState<Vibe>("Playful");

  const [game, setGame] = useState<DbGame | null>(null);
  const [me, setMe] = useState<DbPlayer | null>(null);
  const [players, setPlayers] = useState<DbPlayer[]>([]);
  const [round, setRound] = useState<DbRound | null>(null);
  const [submissions, setSubmissions] = useState<DbSubmission[]>([]);
  const [reactions, setReactions] = useState<DbReaction[]>([]);
  const [myHand, setMyHand] = useState<{ id: string; text: string; vibe: Vibe }[]>([]);
  const scrollRef = useRef<ScrollView | null>(null);

  const meSubmission = useMemo(
    () => submissions.find((s) => s.player_id === me?.id),
    [submissions, me?.id]
  );

  const winner = useMemo(
    () => players.find((p) => p.id === round?.winner_player_id),
    [players, round?.winner_player_id]
  );

  async function refreshState(g: DbGame, p: DbPlayer) {
    const latestGame = await getGameByCode(g.code);
    if (!latestGame) return;
    setGame(latestGame);
    const allPlayers = await listPlayers(latestGame.id);
    setPlayers(allPlayers);

    if (latestGame.status === "lobby") {
      setScreen("lobby");
      return;
    }
    if (latestGame.status === "completed") {
      setScreen("end");
      return;
    }

    const currentRound = await getCurrentRound(latestGame.id, latestGame.current_round);
    setRound(currentRound);
    if (!currentRound) return;

    const [subs, reacts, hand] = await Promise.all([
      listSubmissions(currentRound.id),
      listReactionsForRound(currentRound.id),
      getHand(p.id),
    ]);
    setSubmissions(subs);
    setReactions(reacts);
    setMyHand(hand.map((h) => ({ id: h.card_id, text: h.card_text, vibe: h.card_vibe })));

    if (currentRound.phase === "submit") setScreen("submit");
    if (currentRound.phase === "reveal") setScreen("reveal");
    if (currentRound.phase === "result") setScreen("result");
  }

  useEffect(() => {
    (async () => {
      const lastCode = await getLastCode();
      if (lastCode) setGameCode(lastCode);
    })();
  }, []);

  useEffect(() => {
    if (!game || !me) return;
    const id = setInterval(() => {
      void refreshState(game, me);
    }, 3000);
    return () => clearInterval(id);
  }, [game, me]);

  async function onCreate() {
    if (!name.trim()) return Alert.alert("Name required", "Pick a display name first.");
    setLoading(true);
    try {
      const result = await createGame(selectedVibe, name.trim());
      setGame(result.game);
      setMe(result.player);
      await refreshState(result.game, result.player);
    } catch (err: unknown) {
      Alert.alert("Create failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function onJoin() {
    if (!name.trim() || !gameCode.trim()) {
      return Alert.alert("Missing info", "Enter both your name and a game code.");
    }
    setLoading(true);
    try {
      const result = await joinGame(gameCode.trim(), name.trim());
      setGame(result.game);
      setMe(result.player);
      await refreshState(result.game, result.player);
    } catch (err: unknown) {
      Alert.alert("Join failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  if (loading && !game) {
    return (
      <SafeAreaView style={styles.centered}>
        <PartyBackdrop />
        <ActivityIndicator size="large" color="#ff5e8a" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.page}>
      <PartyBackdrop />
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 16 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={[styles.heroCard, styles.landingCardFlat]}>
          <Image
            source={require("./assets/branding/logo/logotrans.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.title}>Decked Out</Text>
          <Text style={styles.tagline}>The Wild Card Party Game</Text>
          <Text style={styles.heroDescription}>
            Loud answers, bigger laughs, zero spreadsheets. This is a party, not a meeting.
          </Text>
        </View>

        {screen === "home" && (
          <View style={[styles.card, styles.homeCard, styles.homeCardNoBorder, styles.landingCardFlat]}>
            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              onPress={() => {
                Alert.alert("Login coming soon", "For now, use Guest Play to jump in instantly.");
              }}
            >
              <Text style={styles.buttonText}>Let’s go — Login</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.buttonSecondary, pressed && styles.buttonPressed]}
              onPress={() => setScreen("setup")}
            >
              <Text style={styles.buttonTextSecondary}>Jump in as Guest 🎉</Text>
            </Pressable>
            <Text style={styles.guestHint}>No account. No friction. Just chaos with friends.</Text>
          </View>
        )}

        {screen === "setup" && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Game setup 🎲</Text>
            <Text style={styles.guestHint}>You’re in guest mode — pick a name and you’re ready.</Text>
            <TextInput
              placeholder="Your name"
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={setName}
              onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120)}
              style={styles.input}
              returnKeyType="done"
            />
            <Text style={styles.label}>Party vibe</Text>
            <View style={styles.rowWrap}>
              {VIBES.map((v) => (
                <Pressable
                  key={v}
                  onPress={() => setSelectedVibe(v)}
                  style={[styles.chip, selectedVibe === v && styles.chipActive]}
                >
                  <Text style={styles.chipText}>{v}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]} onPress={() => void onCreate()}>
              <Text style={styles.buttonText}>Start a new party ✨</Text>
            </Pressable>
            <View style={styles.divider} />
            <TextInput
              placeholder="Game code"
              placeholderTextColor="#94a3b8"
              value={gameCode}
              onChangeText={setGameCode}
              autoCapitalize="characters"
              onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120)}
              style={styles.input}
              returnKeyType="done"
            />
            <Pressable style={({ pressed }) => [styles.buttonSecondary, pressed && styles.buttonPressed]} onPress={() => void onJoin()}>
              <Text style={styles.buttonTextSecondary}>Slide into the party 🚪</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.buttonGhost, pressed && styles.buttonGhostPressed]} onPress={() => setScreen("home")}>
              <Text style={styles.buttonGhostText}>← Back to the fun</Text>
            </Pressable>
          </View>
        )}

        {screen === "lobby" && game && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Pre-party lobby 🥳</Text>
            <Text style={styles.text}>Code: {game.code}</Text>
            <Text style={styles.text}>Players: {players.length}</Text>
            {players.map((p) => (
              <Text style={styles.text} key={p.id}>
                {p.name}
                {p.is_host ? " (Host)" : ""}
              </Text>
            ))}
            {me?.is_host && (
              <Pressable
                style={styles.button}
                onPress={async () => {
                  if (!game) return;
                  await startGame(game.id);
                  await refreshState(game, me!);
                }}
              >
                <Text style={styles.buttonText}>Deal the first round 🃏</Text>
              </Pressable>
            )}
          </View>
        )}

        {screen === "submit" && game && round && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Round {game.current_round} — your move</Text>
            <Text style={styles.prompt}>{round.prompt_text}</Text>
            {meSubmission && <Text style={styles.text}>Submitted: {meSubmission.card_text}</Text>}
            {!meSubmission &&
              myHand.map((card) => (
                <Pressable
                  key={card.id}
                  style={styles.answer}
                  onPress={async () => {
                    if (!me || !round) return;
                    await submitAnswer(game.id, round.id, me.id, card);
                    await refreshState(game, me);
                  }}
                >
                  <Text style={styles.text}>{card.text}</Text>
                </Pressable>
              ))}
          </View>
        )}

        {screen === "reveal" && game && round && me && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>React like you mean it</Text>
            {submissions.map((sub) => {
              const mine = sub.player_id === me.id;
              const myReaction = reactions.find((r) => r.submission_id === sub.id && r.player_id === me.id);
              return (
                <View key={sub.id} style={styles.answer}>
                  <Text style={styles.text}>{sub.card_text}</Text>
                  {!mine && (
                    <View style={styles.rowWrap}>
                      {REACTIONS.map((r) => (
                        <Pressable
                          key={r.id}
                          style={[styles.chip, myReaction?.reaction_id === r.id && styles.chipActive]}
                          onPress={async () => {
                            await reactToSubmission(sub.id, me.id, r.id);
                            await refreshState(game, me);
                            await tryAdvanceToResult(game.id, round.id);
                            await refreshState(game, me);
                          }}
                        >
                          <Text style={styles.chipText}>{r.emoji}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {screen === "result" && game && me && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Round verdict 🏆</Text>
            <Text style={styles.text}>Winner: {winner?.name ?? "No winner"}</Text>
            {players
              .slice()
              .sort((a, b) => b.total_reactions - a.total_reactions)
              .map((p) => (
                <Text style={styles.text} key={p.id}>
                  {p.name}: {p.total_reactions}
                </Text>
              ))}
            {me.is_host && (
              <Pressable
                style={styles.button}
                onPress={async () => {
                  if (!game) return;
                  await advanceToNextRound(game.id);
                  await refreshState(game, me);
                }}
              >
                <Text style={styles.buttonText}>Keep the party going →</Text>
              </Pressable>
            )}
          </View>
        )}

          {screen === "end" && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>That’s a wrap! Final scores 🎊</Text>
              {players
                .slice()
                .sort((a, b) => b.total_reactions - a.total_reactions)
                .map((p) => (
                  <Text style={styles.text} key={p.id}>
                    {p.name}: {p.total_reactions}
                  </Text>
                ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#1a0f24",
    overflow: "hidden",
  },
  backdropCard: {
    position: "absolute",
    width: 86,
    height: 120,
    borderRadius: 14,
    borderWidth: 2,
    opacity: 0.3,
    padding: 10,
    justifyContent: "space-between",
  },
  backPatternBand: {
    height: 18,
    borderRadius: 999,
    opacity: 0.45,
  },
  backPatternRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  backPatternDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    opacity: 0.55,
  },
  page: {
    flex: 1,
    backgroundColor: "#1a0f24",
    paddingTop: Platform.OS === "android" ? (NativeStatusBar.currentHeight ?? 0) : 0,
  },
  keyboardWrap: { flex: 1 },
  container: { padding: 16, gap: 12, flexGrow: 1, paddingBottom: 36 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1a0f24" },
  heroCard: {
    backgroundColor: "transparent",
    borderRadius: 20,
    padding: 18,
    borderWidth: 0,
    gap: 10,
    alignItems: "center",
  },
  logoImage: { width: 220, height: 120 },
  title: {
    color: "#fff8f0",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 4,
    letterSpacing: -0.5,
    textShadowColor: "rgba(255, 94, 138, 0.45)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  tagline: {
    color: "#ffc857",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  heroDescription: {
    color: "#e8dff5",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    fontWeight: "600",
    paddingHorizontal: 8,
  },
  card: {
    backgroundColor: "rgba(45, 33, 56, 0.72)",
    borderRadius: 22,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 200, 87, 0.35)",
  },
  homeCard: { marginTop: "auto", marginBottom: 12 },
  homeCardNoBorder: { borderWidth: 0 },
  landingCardFlat: { backgroundColor: "transparent", borderWidth: 0 },
  sectionTitle: {
    color: "#fff8f0",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  sectionSubtitle: { color: "#e8dff5", fontSize: 14, fontWeight: "700" },
  guestHint: { color: "#d4c4e8", fontSize: 14, textAlign: "center", lineHeight: 20, fontWeight: "600" },
  label: { color: "#ffc857", fontSize: 14, fontWeight: "800" },
  text: { color: "#fff4ea", fontSize: 16, lineHeight: 22 },
  prompt: {
    color: "#ffffff",
    fontSize: 19,
    fontWeight: "800",
    lineHeight: 26,
  },
  input: {
    borderWidth: 2,
    borderColor: "rgba(255, 94, 138, 0.45)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#fff8f0",
    backgroundColor: "rgba(26, 15, 36, 0.65)",
    fontSize: 16,
    fontWeight: "600",
  },
  button: {
    backgroundColor: "#ff5e8a",
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 248, 240, 0.35)",
    shadowColor: "#ff5e8a",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  buttonSecondary: {
    backgroundColor: "#ffc857",
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(26, 15, 36, 0.25)",
    shadowColor: "#ffc857",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  buttonPressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  buttonText: { color: "#2a1028", fontWeight: "900", fontSize: 16, letterSpacing: 0.2 },
  buttonTextSecondary: { color: "#2a1028", fontWeight: "900", fontSize: 16, letterSpacing: 0.2 },
  buttonGhost: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 200, 87, 0.45)",
    backgroundColor: "rgba(26, 15, 36, 0.35)",
  },
  buttonGhostPressed: { opacity: 0.85 },
  buttonGhostText: { color: "#ffc857", fontWeight: "800", fontSize: 15 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    backgroundColor: "rgba(26, 15, 36, 0.55)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: "rgba(155, 93, 229, 0.45)",
  },
  chipActive: { backgroundColor: "#9b5de5", borderColor: "rgba(255, 248, 240, 0.45)" },
  chipText: { color: "#fff8f0", fontWeight: "800", fontSize: 14 },
  divider: { height: 1, backgroundColor: "rgba(255, 200, 87, 0.25)", marginVertical: 6 },
  answer: {
    backgroundColor: "rgba(26, 15, 36, 0.55)",
    borderRadius: 18,
    padding: 14,
    gap: 12,
    borderWidth: 2,
    borderColor: "rgba(46, 232, 195, 0.35)",
  },
});
