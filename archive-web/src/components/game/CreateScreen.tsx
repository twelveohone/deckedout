import React, { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { VIBES, VIBE_THEMES, Vibe } from '@/lib/gameData';
import { ArrowLeft, Check } from 'lucide-react';

const CreateScreen: React.FC = () => {
  const { setScreen, createGame, loading, error } = useGame();
  const [selected, setSelected] = useState<Vibe>('Playful');
  const [name, setName] = useState('');

  const submit = async () => {
    if (!name.trim()) return;
    await createGame(selected, name.trim());
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-md flex-col px-5 pb-32 pt-6">
        <button
          onClick={() => setScreen('home')}
          className="flex items-center gap-1 text-sm font-medium text-slate-600 active:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="mt-6">
          <h2 className="text-3xl font-black text-slate-900">Start a game</h2>
          <p className="mt-1 text-sm text-slate-600">
            Pick a vibe. Share the link. Friends play whenever.
          </p>
        </div>

        <div className="mt-6">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
            Your name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alex"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-lg text-slate-900 outline-none focus:border-slate-400"
          />
        </div>

        <div className="mt-6 space-y-3">
          {VIBES.map((v) => {
            const theme = VIBE_THEMES[v];
            const active = selected === v;
            return (
              <button
                key={v}
                onClick={() => setSelected(v)}
                className={`group relative w-full overflow-hidden rounded-2xl bg-gradient-to-br ${theme.from} ${theme.to} p-5 text-left transition active:scale-[0.98] ${
                  active ? 'ring-4 ring-slate-900 ring-offset-2' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/30 text-3xl backdrop-blur">
                    {theme.emoji}
                  </div>
                  <div className="flex-1 text-white drop-shadow-sm">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black">{v}</h3>
                      {v === 'Playful' && (
                        <span className="rounded-full bg-white/30 px-2 py-0.5 text-[10px] font-bold uppercase">Default</span>
                      )}
                    </div>
                    <p className="text-sm text-white/90">{theme.desc}</p>
                  </div>
                  {active && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-900">
                      <Check className="h-5 w-5" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Card Eligibility</h4>
          <p className="mt-2 text-sm text-slate-700">
            Each vibe includes itself and softer ones. There's no escalation later.
          </p>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white p-4 pb-6">
        <div className="mx-auto max-w-md">
          <button
            onClick={submit}
            disabled={!name.trim() || loading}
            className="w-full rounded-2xl bg-slate-900 py-4 text-base font-bold text-white transition active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Creating...' : `Create ${selected} Game`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateScreen;
