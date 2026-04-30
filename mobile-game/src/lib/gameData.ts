export type Vibe = "Playful" | "Clever" | "Spicy" | "Dark";

export interface Card {
  id: string;
  text: string;
  vibe: Vibe;
}

export const VIBE_ELIGIBILITY: Record<Vibe, Vibe[]> = {
  Playful: ["Playful"],
  Clever: ["Playful", "Clever"],
  Spicy: ["Playful", "Clever", "Spicy"],
  Dark: ["Playful", "Clever", "Spicy", "Dark"],
};

export const VIBES: Vibe[] = ["Playful", "Clever", "Spicy", "Dark"];

export const PROMPTS: Card[] = [
  { id: "p1", text: "The real reason my dog will not look me in the eye is ___.", vibe: "Playful" },
  { id: "p2", text: "My new morning routine includes 30 minutes of ___.", vibe: "Playful" },
  { id: "p3", text: "The school talent show was ruined by ___.", vibe: "Playful" },
  { id: "p4", text: "I would trade my left sock for ___.", vibe: "Playful" },
  { id: "c1", text: "My therapist gently suggested I stop ___.", vibe: "Clever" },
  { id: "c2", text: "A surprisingly effective negotiating tactic: ___.", vibe: "Clever" },
  { id: "c3", text: "The most aggressive form of self-care is ___.", vibe: "Clever" },
  { id: "s1", text: "My ex still texts me about ___.", vibe: "Spicy" },
  { id: "s2", text: "The HR complaint specifically mentioned ___.", vibe: "Spicy" },
  { id: "s3", text: "I will absolutely judge you for ___.", vibe: "Spicy" },
  { id: "d1", text: "My will leaves everything to ___.", vibe: "Dark" },
  { id: "d2", text: "In hindsight, the warning signs were ___.", vibe: "Dark" },
  { id: "d3", text: "My funeral playlist opens with ___.", vibe: "Dark" },
];

export const ANSWERS: Card[] = [
  { id: "a1", text: "a suspicious amount of glitter", vibe: "Playful" },
  { id: "a2", text: "an emotionally available raccoon", vibe: "Playful" },
  { id: "a3", text: "a goose that knows your name", vibe: "Playful" },
  { id: "a4", text: "a pony named Brenda", vibe: "Playful" },
  { id: "a5", text: "late-stage capitalism", vibe: "Clever" },
  { id: "a6", text: "plausible deniability", vibe: "Clever" },
  { id: "a7", text: "an MFA in passive aggression", vibe: "Clever" },
  { id: "a8", text: "one perfectly placed semicolon", vibe: "Clever" },
  { id: "a9", text: "tequila and bad decisions", vibe: "Spicy" },
  { id: "a10", text: "sending the screenshot", vibe: "Spicy" },
  { id: "a11", text: "a thirst trap with a typo", vibe: "Spicy" },
  { id: "a12", text: "subtweeting my mother", vibe: "Spicy" },
  { id: "a13", text: "the void, but make it cozy", vibe: "Dark" },
  { id: "a14", text: "inherited generational trauma", vibe: "Dark" },
  { id: "a15", text: "a clown at my funeral", vibe: "Dark" },
  { id: "a16", text: "the heat death of the universe", vibe: "Dark" },
];

export const REACTIONS = [
  { id: "lol", emoji: "😂", label: "Hilarious" },
  { id: "love", emoji: "❤️", label: "Love it" },
  { id: "yikes", emoji: "😬", label: "Yikes" },
  { id: "mind", emoji: "🤯", label: "Mind blown" },
] as const;

export function eligibleCards<T extends Card>(cards: T[], vibe: Vibe): T[] {
  const allowed = VIBE_ELIGIBILITY[vibe];
  return cards.filter((c) => allowed.includes(c.vibe));
}

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
