import type { Question } from "@/lib/seed";

// The in-memory fallback store, shared by the list route and the vote route.
// Used only when Supabase isn't configured. Wiped on server restart.
let questions: Question[] = [];

export function getQuestions(): Question[] {
  return questions;
}

export function addQuestion(q: Question): Question {
  questions = [q, ...questions];
  return q;
}

export function voteQuestion(id: string): Question | null {
  const q = questions.find((x) => x.id === id);
  if (!q) return null;
  q.votes += 1; // naive bump — no record of who voted (that's the flaw we'll fix)
  return q;
}
