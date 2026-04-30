import React, { useState, useEffect, useMemo } from 'react';
import { useGame } from '@/contexts/GameContext';
import { VIBE_THEMES, REACTIONS, ReactionId } from '@/lib/gameData';
import { Clock, Loader2 } from 'lucide-react';

const RoundRevealScreen: React.FC = () => {
  const { game, currentRound, submissions, reactions, players, me, reactToSubmission } = useGame();
  const [revealCount, setRevealCount] = useState(0);

  useEffect(() => {
    if (!submissions.length) return;
    setRevealCount(0);
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setRevealCount(i);
      if (i >= submissions.length) clearInterval(t);
    }, 350);
    return () => clearInterval(t);
  }, [submissions.length, currentRound?.id]);

  // Shuffle deterministically per round so order is anonymized but stable
  const shuffledSubs = useMemo(() => {
    if (!currentRound) return [];
    const seed = currentRound.id;
    const arr = [...submissions];
    // Sort by hash(submission.id + round.id)
    arr.sort((a, b) => {
      const ha = hashString(a.id + seed);
      const hb = hashString(b.id + seed);
      return ha - hb;
    });
    return arr;
  }, [submissions, currentRound]);

  if (!game || !currentRound || !me) return null;
  const theme = VIBE_THEMES[game.vibe];

  // My current reaction per submission
  const myReactions = useMemo(() => {
    const map: Record<string, string> = {};
    reactions.forEach((r) => {
      if (r.player_id === me.id) map[r.submission_id] = r.reaction_id;
    });
    return map;
  }, [reactions, me.id]);

  // Reaction counts
  const countsBySub = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    submissions.forEach((s) => {
      map[s.id] = { lol: 0, love: 0, yikes: 0, mind: 0 };
    });
    reactions.forEach((r) => {
      if (!map[r.submission_id]) map[r.submission_id] = { lol: 0, love: 0, yikes: 0, mind: 0 };
      map[r.submission_id][r.reaction_id] = (map[r.submission_id][r.reaction_id] || 0) + 1;
    });
    return map;
  }, [submissions, reactions]);

  const handleReact = (subId: string, r: ReactionId) => {
    reactToSubmission(subId, r);
  };

  // How many submissions have I reacted to (excluding my own)
  const myReactableSubs = submissions.filter((s) => s.player_id !== me.id);
  const myReactedCount = myReactableSubs.filter((s) => myReactions[s.id]).length;

  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.from} ${theme.to}`}>
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-32 pt-6">
        <div className="flex items-center justify-between text-white">
          <div className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur">
            Round {currentRound.round_number} · React
          </div>
          <div className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur">
            <Clock className="h-3 w-3" /> 1h 48m
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-slate-900/80 p-5 text-white shadow-xl backdrop-blur">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/50">Prompt</p>
          <p className="mt-2 text-lg font-bold leading-snug">{currentRound.prompt_text}</p>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs font-medium text-white">
          <p>You: {myReactedCount} / {myReactableSubs.length} reacted</p>
          <p className="text-white/70">{reactions.length} total reactions</p>
        </div>

        <div className="mt-4 space-y-3">
          {shuffledSubs.map((sub, idx) => {
            const visible = idx < revealCount;
            const isYours = sub.player_id === me.id;
            const counts = countsBySub[sub.id] || { lol: 0, love: 0, yikes: 0, mind: 0 };
            return (
              <div
                key={sub.id}
                className={`rounded-2xl bg-white p-5 shadow-lg transition-all duration-500 ${
                  visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                } ${isYours ? 'ring-2 ring-amber-300' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="flex-1 text-base font-semibold leading-snug text-slate-900">
                    {sub.card_text}
                  </p>
                  {isYours && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                      Yours
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-2">
                  {REACTIONS.map((r) => {
                    const count = counts[r.id] || 0;
                    const picked = myReactions[sub.id] === r.id;
                    return (
                      <button
                        key={r.id}
                        disabled={isYours}
                        onClick={() => handleReact(sub.id, r.id)}
                        className={`flex flex-1 items-center justify-center gap-1 rounded-xl border px-2 py-2 text-sm transition active:scale-95 ${
                          picked
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-slate-50 text-slate-700'
                        } ${isYours ? 'opacity-50' : ''}`}
                      >
                        <span className="text-base">{r.emoji}</span>
                        <span className="text-xs font-bold">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 rounded-2xl bg-white/15 p-4 text-center text-sm text-white backdrop-blur">
          <Loader2 className="mx-auto h-5 w-5 animate-spin opacity-70" />
          <p className="mt-2 font-medium">Round advances when everyone reacts.</p>
          <p className="text-xs text-white/70">
            Players reacted: {Math.min(reactions.length, myReactableSubs.length * (players.length - 1))} / {myReactableSubs.length * (players.length - 1)}
          </p>
        </div>
      </div>
    </div>
  );
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}

export default RoundRevealScreen;
