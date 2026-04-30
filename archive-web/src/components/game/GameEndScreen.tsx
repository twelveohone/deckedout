import React, { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { VIBE_THEMES, CARD_BACKS, TABLE_SKINS } from '@/lib/gameData';
import { Trophy, Sparkles, RotateCw, Check, Mail } from 'lucide-react';

const GameEndScreen: React.FC = () => {
  const { game, players, me, resetGame } = useGame();

  if (!game) return null;
  const theme = VIBE_THEMES[game.vibe];

  const ranked = [...players].sort((a, b) => b.total_reactions - a.total_reactions);
  const champion = ranked[0];
  const isYou = champion?.id === me?.id;

  const rewardOptions = [
    { type: 'skin', id: TABLE_SKINS[1].id, name: TABLE_SKINS[1].name, preview: TABLE_SKINS[1].preview, label: 'Table Skin' },
    { type: 'cardback', id: CARD_BACKS[2].id, name: CARD_BACKS[2].name, preview: CARD_BACKS[2].preview, label: 'Card Back' },
    { type: 'pack', id: 'host-pack', name: 'Host Pack: "Office Hours"', preview: 'bg-gradient-to-br from-emerald-400 to-cyan-500', label: 'Card Pack' },
  ];
  const [picked, setPicked] = useState<string | null>(null);

  // Email signup state
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      await fetch('https://famous.ai/api/crm/69f35d3d5b3ddd5d3954f7a8/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          source: 'game-end',
          tags: ['vibedecks', 'game-completed', game.vibe.toLowerCase()],
        }),
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.from} ${theme.to}`}>
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-32 pt-8">
        <div className="text-center text-white">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-widest backdrop-blur">
            <Sparkles className="h-3 w-3" /> Game Over
          </div>
          <h1 className="mt-4 text-4xl font-black drop-shadow">
            {isYou ? 'You won the night.' : champion ? `${champion.name} took it.` : 'Game complete.'}
          </h1>
          {game.closing_line && (
            <p className="mt-2 text-sm font-medium text-white/90">"{game.closing_line}"</p>
          )}
        </div>

        <div className="mt-6 rounded-3xl bg-white p-5 shadow-2xl">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Final Leaderboard</h3>
          </div>
          <div className="mt-3 space-y-2">
            {ranked.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center gap-3 rounded-xl p-3 ${
                  i === 0 ? 'bg-amber-50 ring-2 ring-amber-300' : 'bg-slate-50'
                }`}
              >
                <div className="w-6 text-center text-sm font-black text-slate-500">#{i + 1}</div>
                <div className={`flex h-9 w-9 items-center justify-center rounded-full ${p.color} font-bold text-white`}>
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-900">
                    {p.name} {me?.id === p.id && <span className="text-xs font-medium text-slate-500">(you)</span>}
                  </p>
                  <p className="text-xs text-slate-500">
                    {p.total_reactions} total reactions
                  </p>
                </div>
                {i === 0 && <Trophy className="h-4 w-4 text-amber-500" />}
              </div>
            ))}
          </div>
        </div>

        {isYou && (
          <div className="mt-5 rounded-3xl bg-white/10 p-5 backdrop-blur">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Pick your champion reward</h3>
            <p className="mt-1 text-xs text-white/80">Cosmetic only. No pay-to-win, ever.</p>
            <div className="mt-3 grid grid-cols-1 gap-2">
              {rewardOptions.map((r) => {
                const sel = picked === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setPicked(r.id)}
                    className={`flex items-center gap-3 rounded-xl ${r.preview} p-3 text-left text-white shadow ${
                      sel ? 'ring-4 ring-amber-300' : ''
                    }`}
                  >
                    <div className="rounded-md bg-white/30 px-2 py-1 text-[10px] font-bold uppercase backdrop-blur">
                      {r.label}
                    </div>
                    <p className="flex-1 text-sm font-bold">{r.name}</p>
                    {sel && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-900">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-5 rounded-3xl bg-white p-5 shadow-xl">
          <div className="flex items-start gap-2">
            <Mail className="mt-0.5 h-4 w-4 text-slate-500" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-slate-900">Want new card packs?</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                We'll email you when fresh decks drop. No spam. We promise like, 80%.
              </p>
            </div>
          </div>
          {submitted ? (
            <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
              You're on the list. Stay weird.
            </div>
          ) : (
            <form onSubmit={handleEmail} className="mt-3 flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white active:scale-95 disabled:opacity-50"
              >
                {submitting ? '...' : 'Notify me'}
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/20 bg-black/30 p-4 pb-6 backdrop-blur-lg">
        <div className="mx-auto max-w-md">
          <button
            onClick={resetGame}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-4 text-base font-bold text-slate-900 transition active:scale-95"
          >
            <RotateCw className="h-4 w-4" />
            Start a New Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameEndScreen;
