// Game data: prompts, answers, vibes, closing lines

export type Vibe = 'Playful' | 'Clever' | 'Spicy' | 'Dark';

export const VIBES: Vibe[] = ['Playful', 'Clever', 'Spicy', 'Dark'];

export const VIBE_ELIGIBILITY: Record<Vibe, Vibe[]> = {
  Playful: ['Playful'],
  Clever: ['Playful', 'Clever'],
  Spicy: ['Playful', 'Clever', 'Spicy'],
  Dark: ['Playful', 'Clever', 'Spicy', 'Dark'],
};

export const VIBE_THEMES: Record<Vibe, { from: string; to: string; accent: string; text: string; emoji: string; desc: string }> = {
  Playful: { from: 'from-amber-300', to: 'to-pink-400', accent: 'bg-amber-400', text: 'text-amber-900', emoji: '🌈', desc: 'Sunny, silly, family-safe-ish' },
  Clever: { from: 'from-sky-400', to: 'to-indigo-500', accent: 'bg-sky-500', text: 'text-sky-50', emoji: '🧠', desc: 'Witty, cerebral, a little smug' },
  Spicy: { from: 'from-rose-500', to: 'to-orange-500', accent: 'bg-rose-500', text: 'text-rose-50', emoji: '🌶️', desc: 'Mischievous, edgy, adults only' },
  Dark: { from: 'from-slate-800', to: 'to-purple-900', accent: 'bg-purple-700', text: 'text-purple-50', emoji: '🖤', desc: 'No survivors. You were warned.' },
};

export interface Card {
  id: string;
  text: string;
  vibe: Vibe;
}

export const PROMPTS: Card[] = [
  // Playful
  { id: 'p1', text: 'The real reason my dog won\'t look me in the eye is ___.', vibe: 'Playful' },
  { id: 'p2', text: 'My new morning routine includes 30 minutes of ___.', vibe: 'Playful' },
  { id: 'p3', text: 'The school talent show was ruined by ___.', vibe: 'Playful' },
  { id: 'p4', text: 'I would trade my left sock for ___.', vibe: 'Playful' },
  { id: 'p5', text: 'Grandma\'s secret cookie ingredient turned out to be ___.', vibe: 'Playful' },
  { id: 'p6', text: 'The next big TikTok trend is definitely ___.', vibe: 'Playful' },
  { id: 'p7', text: 'My superpower is mildly inconveniencing people with ___.', vibe: 'Playful' },
  { id: 'p8', text: 'On my tombstone, please write: "Here lies someone who really loved ___."', vibe: 'Playful' },
  // Clever
  { id: 'c1', text: 'The 11th commandment, lost to history, was simply: "Thou shalt not ___."', vibe: 'Clever' },
  { id: 'c2', text: 'My therapist gently suggested I stop ___.', vibe: 'Clever' },
  { id: 'c3', text: 'In the dystopian sequel, the rebels are organized around ___.', vibe: 'Clever' },
  { id: 'c4', text: 'The footnote in the history book reads: "And then, inexplicably, ___."', vibe: 'Clever' },
  { id: 'c5', text: 'The most aggressive form of self-care is ___.', vibe: 'Clever' },
  { id: 'c6', text: 'My LinkedIn headline is now "Thought leader in ___."', vibe: 'Clever' },
  { id: 'c7', text: 'The one thing the Roman Empire didn\'t see coming: ___.', vibe: 'Clever' },
  { id: 'c8', text: 'A surprisingly effective negotiating tactic: ___.', vibe: 'Clever' },
  // Spicy
  { id: 's1', text: 'My ex still texts me about ___.', vibe: 'Spicy' },
  { id: 's2', text: 'The HR complaint specifically mentioned ___.', vibe: 'Spicy' },
  { id: 's3', text: 'What I do in the parking lot before any family event: ___.', vibe: 'Spicy' },
  { id: 's4', text: 'The Tinder bio that finally worked: "Looking for someone to ___ with."', vibe: 'Spicy' },
  { id: 's5', text: 'My villain origin story began the day someone said ___.', vibe: 'Spicy' },
  { id: 's6', text: 'I will absolutely judge you for ___.', vibe: 'Spicy' },
  // Dark
  { id: 'd1', text: 'My will leaves everything to ___.', vibe: 'Dark' },
  { id: 'd2', text: 'The cult\'s only rule was "Never ___."', vibe: 'Dark' },
  { id: 'd3', text: 'In hindsight, the warning signs were ___.', vibe: 'Dark' },
  { id: 'd4', text: 'The last sound I want to hear is ___.', vibe: 'Dark' },
  { id: 'd5', text: 'My funeral playlist opens with ___.', vibe: 'Dark' },
];

export const ANSWERS: Card[] = [
  // Playful
  { id: 'a1', text: 'a suspicious amount of glitter', vibe: 'Playful' },
  { id: 'a2', text: 'an emotionally available raccoon', vibe: 'Playful' },
  { id: 'a3', text: 'wearing socks with sandals on purpose', vibe: 'Playful' },
  { id: 'a4', text: 'a goose that knows your name', vibe: 'Playful' },
  { id: 'a5', text: 'mild applause', vibe: 'Playful' },
  { id: 'a6', text: 'a slightly haunted Roomba', vibe: 'Playful' },
  { id: 'a7', text: 'aggressive recorder solos', vibe: 'Playful' },
  { id: 'a8', text: 'the smell of a new printer', vibe: 'Playful' },
  { id: 'a9', text: 'three pigeons in a trench coat', vibe: 'Playful' },
  { id: 'a10', text: 'a participation trophy', vibe: 'Playful' },
  { id: 'a11', text: 'unsolicited karaoke', vibe: 'Playful' },
  { id: 'a12', text: 'a pony named Brenda', vibe: 'Playful' },
  // Clever
  { id: 'a13', text: 'late-stage capitalism', vibe: 'Clever' },
  { id: 'a14', text: 'a really aggressive PowerPoint', vibe: 'Clever' },
  { id: 'a15', text: 'plausible deniability', vibe: 'Clever' },
  { id: 'a16', text: 'the slow death of the third place', vibe: 'Clever' },
  { id: 'a17', text: 'an ill-timed Wikipedia rabbit hole', vibe: 'Clever' },
  { id: 'a18', text: 'gentle, devastating sarcasm', vibe: 'Clever' },
  { id: 'a19', text: 'an MFA in passive aggression', vibe: 'Clever' },
  { id: 'a20', text: 'reading the terms and conditions out loud', vibe: 'Clever' },
  { id: 'a21', text: 'cognitive dissonance, smartly dressed', vibe: 'Clever' },
  { id: 'a22', text: 'a TED talk no one asked for', vibe: 'Clever' },
  { id: 'a23', text: 'the Dewey Decimal System', vibe: 'Clever' },
  { id: 'a24', text: 'one perfectly placed semicolon', vibe: 'Clever' },
  // Spicy
  { id: 'a25', text: 'my situationship\'s roommate', vibe: 'Spicy' },
  { id: 'a26', text: 'crying in the Whole Foods parking lot', vibe: 'Spicy' },
  { id: 'a27', text: 'a deeply unprofessional group chat', vibe: 'Spicy' },
  { id: 'a28', text: 'tequila and bad decisions', vibe: 'Spicy' },
  { id: 'a29', text: 'sending the screenshot', vibe: 'Spicy' },
  { id: 'a30', text: 'pretending to be on a call', vibe: 'Spicy' },
  { id: 'a31', text: 'a thirst trap with a typo', vibe: 'Spicy' },
  { id: 'a32', text: 'unhinged voice memos at 2 AM', vibe: 'Spicy' },
  { id: 'a33', text: 'subtweeting my mother', vibe: 'Spicy' },
  // Dark
  { id: 'a34', text: 'the void, but make it cozy', vibe: 'Dark' },
  { id: 'a35', text: 'an unread voicemail from 2019', vibe: 'Dark' },
  { id: 'a36', text: 'inherited generational trauma', vibe: 'Dark' },
  { id: 'a37', text: 'a clown at my funeral', vibe: 'Dark' },
  { id: 'a38', text: 'the slow, dawning realization', vibe: 'Dark' },
  { id: 'a39', text: 'a single, perfect tear', vibe: 'Dark' },
  { id: 'a40', text: 'the heat death of the universe', vibe: 'Dark' },
];

export const CLOSING_LINES: { text: string; vibe: Vibe }[] = [
  { text: 'Friendship: still intact. Mostly.', vibe: 'Playful' },
  { text: 'You all did so great. Mom would be proud.', vibe: 'Playful' },
  { text: 'A delightful waste of everyone\'s time. 10/10.', vibe: 'Playful' },
  { text: 'History will not remember this, and that\'s a gift.', vibe: 'Clever' },
  { text: 'You played a game. You learned nothing. Beautiful.', vibe: 'Clever' },
  { text: 'Somewhere, a sociologist is taking notes.', vibe: 'Clever' },
  { text: 'Group chat? Permanently changed.', vibe: 'Spicy' },
  { text: 'Several friendships are now under review.', vibe: 'Spicy' },
  { text: 'Nobody is okay. Nobody was ever okay.', vibe: 'Dark' },
  { text: 'The cards have spoken. The cards regret nothing.', vibe: 'Dark' },
];

export const REACTIONS = [
  { id: 'lol', emoji: '😂', label: 'Hilarious' },
  { id: 'love', emoji: '❤️', label: 'Love it' },
  { id: 'yikes', emoji: '😬', label: 'Yikes' },
  { id: 'mind', emoji: '🤯', label: 'Mind blown' },
] as const;

export type ReactionId = typeof REACTIONS[number]['id'];

export const TABLE_SKINS = [
  { id: 'classic', name: 'Classic Felt', preview: 'bg-gradient-to-br from-emerald-700 to-emerald-900' },
  { id: 'sunset', name: 'Sunset Diner', preview: 'bg-gradient-to-br from-orange-400 to-pink-500' },
  { id: 'midnight', name: 'Midnight Lounge', preview: 'bg-gradient-to-br from-slate-800 to-purple-900' },
  { id: 'paper', name: 'Old Paper', preview: 'bg-gradient-to-br from-amber-100 to-amber-300' },
];

export const CARD_BACKS = [
  { id: 'stripes', name: 'Confetti Stripes', preview: 'bg-gradient-to-br from-pink-400 via-yellow-300 to-purple-400' },
  { id: 'mono', name: 'Monochrome', preview: 'bg-gradient-to-br from-gray-800 to-gray-600' },
  { id: 'neon', name: 'Neon Grid', preview: 'bg-gradient-to-br from-fuchsia-500 to-cyan-400' },
];

export const FAKE_PLAYER_NAMES = ['Riley', 'Jordan', 'Sam', 'Avery', 'Casey', 'Morgan', 'Quinn', 'Taylor'];
export const AVATAR_COLORS = ['bg-rose-400', 'bg-sky-400', 'bg-emerald-400', 'bg-amber-400', 'bg-fuchsia-400', 'bg-indigo-400', 'bg-teal-400', 'bg-orange-400'];

export function eligibleCards<T extends Card>(cards: T[], vibe: Vibe): T[] {
  const allowed = VIBE_ELIGIBILITY[vibe];
  return cards.filter((c) => allowed.includes(c.vibe));
}

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function pickWeightedClosing(vibe: Vibe): string {
  const allowed = VIBE_ELIGIBILITY[vibe];
  const pool = CLOSING_LINES.filter((l) => allowed.includes(l.vibe));
  // Weight toward current vibe
  const weighted = pool.flatMap((l) => (l.vibe === vibe ? [l, l, l] : [l]));
  return pickRandom(weighted).text;
}
