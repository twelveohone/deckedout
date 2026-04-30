import "react-native-url-polyfill/auto";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar as NativeStatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
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
        <ActivityIndicator size="large" color="#6366f1" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.page}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={[styles.heroCard, styles.landingCardFlat]}>
          <Image
            source={require("./assets/branding/logo/logotrans.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.title}>Decked Out</Text>
          <Text style={styles.tagline}>The Wild Card Party Game</Text>
          <Text style={styles.heroDescription}>Build wild answers. React hard. Win the party.</Text>
        </View>

        {screen === "home" && (
          <View style={[styles.card, styles.homeCard, styles.homeCardNoBorder, styles.landingCardFlat]}>
            <Pressable
              style={styles.button}
              onPress={() => {
                Alert.alert("Login coming soon", "For now, use Guest Play to jump in instantly.");
              }}
            >
              <Text style={styles.buttonText}>Login</Text>
            </Pressable>
            <Pressable style={styles.buttonSecondary} onPress={() => setScreen("setup")}>
              <Text style={styles.buttonText}>Freeplay as Guest</Text>
            </Pressable>
            <Text style={styles.guestHint}>No account required. Play instantly as a guest.</Text>
          </View>
        )}

        {screen === "setup" && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Game Setup</Text>
            <Text style={styles.guestHint}>Guest mode active. No account required.</Text>
            <TextInput
              placeholder="Your name"
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={setName}
              style={styles.input}
            />
            <Text style={styles.label}>Vibe</Text>
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
            <Pressable style={styles.button} onPress={() => void onCreate()}>
              <Text style={styles.buttonText}>Create Party</Text>
            </Pressable>
            <View style={styles.divider} />
            <TextInput
              placeholder="Game code"
              placeholderTextColor="#94a3b8"
              value={gameCode}
              onChangeText={setGameCode}
              autoCapitalize="characters"
              style={styles.input}
            />
            <Pressable style={styles.buttonSecondary} onPress={() => void onJoin()}>
              <Text style={styles.buttonText}>Join Party</Text>
            </Pressable>
            <Pressable style={styles.buttonGhost} onPress={() => setScreen("home")}>
              <Text style={styles.buttonGhostText}>Back</Text>
            </Pressable>
          </View>
        )}

        {screen === "lobby" && game && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Lobby</Text>
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
                <Text style={styles.buttonText}>Start Game</Text>
              </Pressable>
            )}
          </View>
        )}

        {screen === "submit" && game && round && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Round {game.current_round}</Text>
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
            <Text style={styles.sectionTitle}>React to submissions</Text>
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
            <Text style={styles.sectionTitle}>Round Result</Text>
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
                <Text style={styles.buttonText}>Next Round</Text>
              </Pressable>
            )}
          </View>
        )}

        {screen === "end" && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Game Complete</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#09070f",
    paddingTop: Platform.OS === "android" ? (NativeStatusBar.currentHeight ?? 0) : 0,
  },
  container: { padding: 16, gap: 12, flexGrow: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#09070f" },
  heroCard: {
    backgroundColor: "#130f21",
    borderRadius: 16,
    padding: 18,
    borderWidth: 0,
    gap: 8,
    alignItems: "center",
    shadowColor: "#ff2bd6",
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  logoImage: { width: 220, height: 120 },
  title: { color: "#f8f7ff", fontSize: 32, fontWeight: "900", marginTop: 4 },
  tagline: { color: "#33f6ff", fontSize: 14, fontWeight: "700" },
  heroDescription: { color: "#beb6d8", fontSize: 14, textAlign: "center", lineHeight: 20 },
  card: { backgroundColor: "#161225", borderRadius: 12, padding: 14, gap: 10, borderWidth: 1, borderColor: "#ff2bd6" },
  homeCard: { marginTop: "auto", marginBottom: 12 },
  homeCardNoBorder: { borderWidth: 0 },
  landingCardFlat: { backgroundColor: "transparent", shadowOpacity: 0, elevation: 0 },
  sectionTitle: { color: "#f8f7ff", fontSize: 20, fontWeight: "700" },
  sectionSubtitle: { color: "#d7d2ea", fontSize: 14, fontWeight: "700" },
  guestHint: { color: "#b7b0d3", fontSize: 13, textAlign: "center" },
  label: { color: "#d7d2ea", fontSize: 14 },
  text: { color: "#f1eeff", fontSize: 16 },
  prompt: { color: "#ffffff", fontSize: 18, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: "#5e4a91",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#f8f7ff",
    backgroundColor: "#0e0b1a",
  },
  button: { backgroundColor: "#ff2bd6", borderRadius: 10, paddingVertical: 11, alignItems: "center" },
  buttonSecondary: { backgroundColor: "#33f6ff", borderRadius: 10, paddingVertical: 11, alignItems: "center" },
  buttonText: { color: "#120f1f", fontWeight: "900" },
  buttonGhost: {
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#5e4a91",
  },
  buttonGhostText: { color: "#d7d2ea", fontWeight: "700" },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: "#1f1833", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "#5e4a91" },
  chipActive: { backgroundColor: "#ff2bd6" },
  chipText: { color: "#f8f7ff", fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#5e4a91", marginVertical: 4 },
  answer: { backgroundColor: "#1f1833", borderRadius: 10, padding: 10, gap: 10, borderWidth: 1, borderColor: "#5e4a91" },
});
