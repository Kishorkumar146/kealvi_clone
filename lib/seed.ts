export type Question = {
  id: string;
  body: string;
  author: string;
  votes: number;
};

// Hardcoded placeholder data — intentionally fake. Submissions made through
// the form are NOT stored here; a refresh resets the list to exactly this.
export const SEED: Question[] = [];
