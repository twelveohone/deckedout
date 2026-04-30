import React, { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { ArrowLeft, ScanLine } from 'lucide-react';

interface Props {
  prefilledCode?: string;
}

const JoinScreen: React.FC<Props> = ({ prefilledCode }) => {
  const { setScreen, joinGameByCode, loadGameByCode, loading, error } = useGame();
  const [code, setCode] = useState(prefilledCode?.toUpperCase() || '');
  const [name, setName] = useState('');
  const [gameInfo, setGameInfo] = useState<{ vibe: string; players?: number } | null>(null);

  useEffect(() => {
    if (prefilledCode) {
      setCode(prefilledCode.toUpperCase());
    }
  }, [prefilledCode]);

  // Look up game when code is 6 chars
  useEffect(() => {
    if (code.length === 6) {
      loadGameByCode(code).then((g) => {
        if (g) setGameInfo({ vibe: g.vibe });
        else setGameInfo(null);
      });
    } else {
      setGameInfo(null);
    }
  }, [code, loadGameByCode]);

  const submit = async () => {
    if (!name.trim() || !code.trim()) return;
    await joinGameByCode(code.trim().toUpperCase(), name.trim());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-purple-900">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-10 pt-6 text-white">
        <button
          onClick={() => setScreen('home')}
          className="flex items-center gap-1 text-sm font-medium text-white/70 active:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="mt-8">
          <h2 className="text-3xl font-black">Join a game</h2>
          <p className="mt-1 text-sm text-white/70">
            Got a link? Tap it. Got a code? Drop it below.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/60">
              Your name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex"
              className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-4 text-lg text-white placeholder-white/40 outline-none backdrop-blur focus:ring-2 focus:ring-amber-300"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/60">
              Invite code
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABCD12"
              maxLength={6}
              className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-4 text-2xl font-bold tracking-[0.4em] text-white placeholder-white/40 outline-none backdrop-blur focus:ring-2 focus:ring-amber-300"
            />
            {code.length === 6 && (
              <div className="mt-2 text-xs">
                {gameInfo ? (
                  <span className="text-emerald-300">✓ Game found · {gameInfo.vibe} vibe</span>
                ) : (
                  <span className="text-rose-300">No game with that code</span>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 py-3 text-sm font-medium text-white/80 active:bg-white/10"
            onClick={() => alert('QR scanner would open the device camera in the native app')}
          >
            <ScanLine className="h-4 w-4" />
            Scan QR code instead
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-rose-500/20 p-3 text-sm text-rose-100">{error}</div>
        )}

        <div className="mt-auto pt-8">
          <button
            onClick={submit}
            disabled={!name.trim() || !code || loading}
            className="w-full rounded-2xl bg-amber-300 py-4 text-base font-bold text-slate-900 transition active:scale-95 disabled:opacity-40"
          >
            {loading ? 'Joining...' : 'Join Game'}
          </button>
          <p className="mt-3 text-center text-xs text-white/50">
            No invite? Hit back and start your own.
          </p>
        </div>
      </div>
    </div>
  );
};

export default JoinScreen;
