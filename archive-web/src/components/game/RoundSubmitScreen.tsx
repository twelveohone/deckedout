import React, { useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { VIBE_THEMES, Vibe } from '@/lib/gameData';
import { Clock, Send, X, Loader2 } from 'lucide-react';

const RoundSubmitScreen: React.FC = () => {
  const { game, hand, currentRound, players, submissions, me, submitAnswer, resetGame } = useGame();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!game || !currentRound || !me) return null;
  const theme = VIBE_THEMES[game.vibe];
  const iSubmitted = !!submissions.find((s) => s.player_id === me.id);
  const submittedCount = submissions.length;
  const submittedPlayerIds = new Set(submissions.map((s) => s.player_id));

  const submit = async () => {
    if (!selectedId) return;
    const card = hand.find((c) => c.card_id === selectedId);
    if (!card) return;
    setSubmitting(true);
    try {
      await submitAnswer(card.card_id, card.card_text, card.card_vibe as Vibe);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.from} ${theme.to}`}>
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-4 pt-6">
        <div className="flex items-center justify-between text-white">
          <button
            onClick={resetGame}
            className="rounded-full bg-white/20 p-2 backdrop-blur active:bg-white/30"
            aria-label="Leave"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur">
            Round {currentRound.round_number} / 10
          </div>
          <div className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur">
            <Clock className="h-3 w-3" /> 7h 42m
          </div>
        </div>

        {/* Players status */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {players.map((p) => {
            const submitted = submittedPlayerIds.has(p.id);
            return (
              <div
                key={p.id}
                className={`relative flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white ring-2 ${p.color} ${
                  submitted ? 'ring-emerald-300' : 'ring-white/40'
                }`}
                title={`${p.name} ${submitted ? '(submitted)' : '(thinking...)'}`}
              >
                {p.name.charAt(0).toUpperCase()}
                {submitted && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white" />
                )}
              </div>
            );
          })}
          <div className="ml-auto self-center text-xs font-medium text-white/90">
            {submittedCount} / {players.length} submitted
          </div>
        </div>

        {/* Prompt card */}
        <div className="mt-6 rounded-3xl bg-slate-900 p-7 text-white shadow-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/50">Prompt</p>
          <p className="mt-3 text-2xl font-bold leading-snug">{currentRound.prompt_text}</p>
        </div>

        {iSubmitted ? (
          <div className="mt-8 rounded-3xl bg-white/15 p-8 text-center text-white backdrop-blur">
            <Loader2 className="mx-auto h-8 w-8 animate-spin" />
            <p className="mt-4 text-lg font-bold">Answer locked in</p>
            <p className="mt-1 text-sm text-white/80">
              Waiting on {players.length - submittedCount} other{players.length - submittedCount === 1 ? '' : 's'}.
            </p>
            <p className="mt-1 text-xs text-white/70">
              Close the app — we'll notify you when reactions are ready.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-5 mb-2">
              <p className="text-sm font-bold text-white drop-shadow">
                {selectedId ? 'Tap "Submit" to lock it in' : 'Pick your best answer'}
              </p>
              <p className="text-xs text-white/70">Answers stay anonymous until everyone reacts.</p>
            </div>

            <div className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto pb-32">
              {hand.length === 0 && (
                <div className="rounded-2xl bg-white/20 p-4 text-center text-sm text-white">
                  Dealing cards...
                </div>
              )}
              {hand.map((card) => {
                const isSel = selectedId === card.card_id;
                return (
                  <button
                    key={card.id}
                    onClick={() => setSelectedId(card.card_id)}
                    className={`relative rounded-2xl bg-white p-5 text-left shadow-lg transition active:scale-[0.98] ${
                      isSel ? 'ring-4 ring-amber-300 ring-offset-2 ring-offset-transparent' : ''
                    }`}
                  >
                    <p className="text-base font-semibold leading-snug text-slate-900">{card.card_text}</p>
                    {isSel && (
                      <div className="absolute right-3 top-3 rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-900">
                        Selected
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {!iSubmitted && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/20 bg-black/30 p-4 pb-6 backdrop-blur-lg">
          <div className="mx-auto max-w-md">
            <button
              disabled={!selectedId || submitting}
              onClick={submit}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-4 text-base font-bold text-slate-900 transition active:scale-95 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
              {submitting ? 'Submitting...' : 'Submit Answer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoundSubmitScreen;
