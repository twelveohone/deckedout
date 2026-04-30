import React, { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { VIBE_THEMES } from '@/lib/gameData';
import { Copy, QrCode, Play, Check, Share2 } from 'lucide-react';

const LobbyScreen: React.FC = () => {
  const { game, players, me, startGame, resetGame, loading } = useGame();
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  if (!game) return null;
  const theme = VIBE_THEMES[game.vibe];
  const inviteLink = `${window.location.origin}/join/${game.code}`;
  const isHost = me?.is_host;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my VibeDecks game',
          text: `Join my ${game.vibe} party game on VibeDecks!`,
          url: inviteLink,
        });
      } catch {}
    } else {
      copy();
    }
  };

  // QR-ish placeholder pattern
  const qrPattern = Array.from({ length: 144 }).map((_, i) => {
    const seed = (game.code.charCodeAt(i % game.code.length) + i * 7) % 2;
    return seed === 0;
  });

  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.from} ${theme.to}`}>
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-32 pt-6">
        <div className="flex items-center justify-between">
          <button
            onClick={resetGame}
            className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur active:bg-white/30"
          >
            Leave
          </button>
          <div className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur">
            {theme.emoji} {game.vibe} Vibe
          </div>
        </div>

        <div className="mt-8 text-white">
          <h2 className="text-3xl font-black drop-shadow">Game Lobby</h2>
          <p className="mt-1 text-sm text-white/80">
            Share the invite. Players can join from anywhere, anytime.
          </p>
        </div>

        {/* Invite card */}
        <div className="mt-6 rounded-3xl bg-white p-5 shadow-xl">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Invite Code</p>
            <p className="mt-1 text-4xl font-black tracking-[0.4em] text-slate-900">{game.code}</p>
            <p className="mt-1 break-all text-[11px] text-slate-400">{inviteLink}</p>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={copy}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white active:scale-95"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy link'}
            </button>
            <button
              onClick={share}
              className="flex items-center justify-center rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-900 active:scale-95"
              aria-label="Share"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowQR((s) => !s)}
              className="flex items-center justify-center rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-900 active:scale-95"
              aria-label="Show QR"
            >
              <QrCode className="h-4 w-4" />
            </button>
          </div>

          {showQR && (
            <div className="mt-4 flex flex-col items-center rounded-xl bg-slate-50 p-4">
              <div className="grid h-44 w-44 grid-cols-12 grid-rows-12 gap-px overflow-hidden rounded-lg bg-white p-2">
                {qrPattern.map((on, i) => (
                  <div key={i} className={on ? 'bg-slate-900' : 'bg-white'} />
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">Point a camera. Or just send the link.</p>
            </div>
          )}
        </div>

        {/* Players */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-white">
            <h3 className="text-sm font-bold uppercase tracking-wider">Players ({players.length})</h3>
            <span className="text-xs text-white/70">Min 2 to start</span>
          </div>
          <div className="space-y-2">
            {players.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-2xl bg-white/90 p-3 backdrop-blur"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${p.color} font-bold text-white`}>
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-900">
                    {p.name}
                    {me?.id === p.id && <span className="ml-1 text-xs font-medium text-slate-500">(you)</span>}
                    {p.is_host && <span className="ml-1 text-xs font-medium text-amber-600">· host</span>}
                  </p>
                  <p className="text-xs text-slate-500">Joined</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                  Ready
                </span>
              </div>
            ))}
            {players.length < 2 && (
              <div className="rounded-2xl border-2 border-dashed border-white/40 p-4 text-center text-sm text-white/80">
                Waiting for friends to join via your invite link...
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/20 bg-white/10 p-4 pb-6 backdrop-blur-lg">
        <div className="mx-auto max-w-md">
          {isHost ? (
            <button
              onClick={startGame}
              disabled={players.length < 2 || loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-4 text-base font-bold text-slate-900 shadow-xl transition active:scale-95 disabled:opacity-50"
            >
              <Play className="h-5 w-5" />
              {loading ? 'Starting...' : `Start Round 1 (${players.length} players)`}
            </button>
          ) : (
            <div className="rounded-2xl bg-white/30 px-4 py-3 text-center text-sm font-medium text-white backdrop-blur">
              Waiting for the host to start the game...
            </div>
          )}
          <p className="mt-2 text-center text-xs text-white/80">
            10 rounds · 8h answer windows · 2h reactions
          </p>
        </div>
      </div>
    </div>
  );
};

export default LobbyScreen;
