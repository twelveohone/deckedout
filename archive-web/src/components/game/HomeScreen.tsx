import React from 'react';
import { useGame } from '@/contexts/GameContext';
import { Sparkles, Users } from 'lucide-react';

const HERO = 'https://d64gsuwffb70l.cloudfront.net/69f35d3d5b3ddd5d3954f7a8_1777556897461_bccbf5a2.jpg';

const HomeScreen: React.FC = () => {
  const { setScreen } = useGame();
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-fuchsia-600 via-purple-600 to-amber-400">
      <div
        className="absolute inset-0 opacity-30 bg-cover bg-center"
        style={{ backgroundImage: `url(${HERO})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-between px-6 py-10 text-white">
        <div className="w-full pt-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-4 py-1.5 text-xs font-medium uppercase tracking-widest">
            <Sparkles className="h-3.5 w-3.5" /> Async Party Cards
          </div>
        </div>

        <div className="flex flex-col items-center text-center">
          <h1 className="text-7xl font-black tracking-tight drop-shadow-lg sm:text-8xl">
            Vibe<span className="text-amber-300">Decks</span>
          </h1>
          <p className="mt-4 max-w-xs text-lg font-medium text-white/90">
            The party card game for friends who can't ever be in the same room.
          </p>
          <p className="mt-2 max-w-xs text-sm text-white/70">
            Play across hours, not minutes. No accounts. No waiting.
          </p>
        </div>

        <div className="w-full max-w-sm space-y-3">
          <button
            onClick={() => setScreen('join')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-5 text-lg font-bold text-purple-700 shadow-2xl transition active:scale-95"
          >
            <Users className="h-5 w-5" />
            Join a Game
          </button>
          <button
            onClick={() => setScreen('create')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-white/40 bg-white/10 py-4 text-base font-semibold text-white backdrop-blur transition active:scale-95"
          >
            Start a Game
          </button>
          <p className="pt-2 text-center text-xs text-white/60">
            No login required. Just bring your worst opinions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
