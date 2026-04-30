import React, { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { VIBE_THEMES, TABLE_SKINS, VIBE_ELIGIBILITY, Vibe } from '@/lib/gameData';
import { Trophy, Sparkles, ArrowRight, Check, Loader2 } from 'lucide-react';

const RoundResultScreen: React.FC = () => {
  const { game, currentRound, submissions, reactions, players, me, nextRound, loading } = useGame();
  const [tab, setTab] = useState<'skin' | 'boost'>('skin');
  const [picked, setPicked] = useState<{ type: 'skin' | 'boost'; value: string } | null>(null);
  const [advancing, setAdvancing] = useState(false);

  if (!game || !currentRound || !me) return null;
  const theme = VIBE_THEMES[game.vibe];
  const winner = players.find((p) => p.id === currentRound.winner_player_id);
  const winningSub = submissions.find((s) => s.player_id === currentRound.winner_player_id);
  const isYou = currentRound.winner_player_id === me.id;
  const isHost = me.is_host;
  const totalReacts = winningSub
    ? reactions.filter((r) => r.submission_id === winningSub.id).length
    : 0;

  const allowedVibes = VIBE_ELIGIBILITY[game.vibe];
  const isFinalRound = currentRound.round_number >= 10;

  const advance = async () => {
    setAdvancing(true);
    try {
      await nextRound(picked && isYou ? picked : undefined);
    } finally {
      setAdvancing(false);
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.from} ${theme.to}`}>
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-32 pt-6">
        <div className="flex items-center justify-center text-white">
          <div className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur">
            Round {currentRound.round_number} Result
          </div>
        </div>

        <div className="mt-6 rounded-3xl bg-white p-6 text-center shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-300">
            <Trophy className="h-8 w-8 text-slate-900" />
          </div>
          <p className="mt-3 text-xs font-bold uppercase tracking-widest text-slate-500">Round Winner</p>
          <div className="mt-1 flex items-center justify-center gap-2">
            {winner && (
              <div className={`flex h-9 w-9 items-center justify-center rounded-full ${winner.color} font-bold text-white`}>
                {winner.name.charAt(0).toUpperCase()}
              </div>
            )}
            <h2 className="text-2xl font-black text-slate-900">
              {isYou ? 'You won!' : winner ? `${winner.name} won` : 'Tie game'}
            </h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {totalReacts} reaction{totalReacts === 1 ? '' : 's'}
          </p>
          {winningSub && (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-left">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Winning answer
              </p>
              <p className="mt-1 font-semibold text-slate-900">{winningSub.card_text}</p>
            </div>
          )}
        </div>

        {/* Reward selector (only for human winner) */}
        {isYou && !isFinalRound && (
          <div className="mt-6 rounded-3xl bg-white/10 p-5 backdrop-blur">
            <div className="flex items-center gap-2 text-white">
              <Sparkles className="h-4 w-4" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Pick your reward</h3>
            </div>
            <p className="mt-1 text-xs text-white/80">Cosmetic only — no gameplay advantage.</p>

            <div className="mt-4 flex gap-2 rounded-xl bg-black/20 p-1">
              <button
                onClick={() => setTab('skin')}
                className={`flex-1 rounded-lg py-2 text-xs font-bold ${tab === 'skin' ? 'bg-white text-slate-900' : 'text-white/80'}`}
              >
                Table Skin
              </button>
              <button
                onClick={() => setTab('boost')}
                className={`flex-1 rounded-lg py-2 text-xs font-bold ${tab === 'boost' ? 'bg-white text-slate-900' : 'text-white/80'}`}
              >
                Vibe Boost
              </button>
            </div>

            {tab === 'skin' && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {TABLE_SKINS.map((s) => {
                  const sel = picked?.type === 'skin' && picked.value === s.id;
                  const active = !picked && game.table_skin === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setPicked({ type: 'skin', value: s.id })}
                      className={`relative rounded-xl ${s.preview} p-3 text-left text-white shadow ${
                        sel ? 'ring-4 ring-amber-300' : active ? 'ring-2 ring-white/60' : ''
                      }`}
                    >
                      <p className="text-xs font-bold drop-shadow">{s.name}</p>
                      <p className="text-[10px] text-white/80">Next round</p>
                      {sel && (
                        <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-900">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {tab === 'boost' && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-white/80">Slightly favor a vibe in next round's prompt.</p>
                {allowedVibes.map((v: Vibe) => {
                  const t = VIBE_THEMES[v];
                  const sel = picked?.type === 'boost' && picked.value === v;
                  return (
                    <button
                      key={v}
                      onClick={() => setPicked({ type: 'boost', value: v })}
                      className={`flex w-full items-center gap-3 rounded-xl bg-gradient-to-br ${t.from} ${t.to} p-3 text-left text-white shadow ${
                        sel ? 'ring-4 ring-amber-300' : ''
                      }`}
                    >
                      <span className="text-2xl">{t.emoji}</span>
                      <div className="flex-1">
                        <p className="text-sm font-bold">{v} boost</p>
                        <p className="text-[10px] text-white/80">Next round only</p>
                      </div>
                      {sel && (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-900">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {!isHost && (
          <div className="mt-6 rounded-2xl bg-white/15 p-4 text-center text-sm text-white backdrop-blur">
            <Loader2 className="mx-auto h-5 w-5 animate-spin opacity-70" />
            <p className="mt-2 font-medium">Waiting for the host to start the next round.</p>
          </div>
        )}
      </div>

      {isHost && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/20 bg-black/30 p-4 pb-6 backdrop-blur-lg">
          <div className="mx-auto max-w-md">
            <button
              onClick={advance}
              disabled={advancing || loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-4 text-base font-bold text-slate-900 transition active:scale-95 disabled:opacity-50"
            >
              {advancing ? 'Loading...' : isFinalRound ? 'See Final Results' : `Next Round (${currentRound.round_number + 1}/10)`}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoundResultScreen;
