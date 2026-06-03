import { supabase } from "@/lib/supabase";

export async function getQuestionsPage(offset: number, limit: number) {
  const { data, error } = await supabase
    .from("questions")
    .select("id, body, author, created_at, vote_counts(net_votes)")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit + 1); // fetch limit+1 to detect next page

  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((q: any) => ({
    id: q.id,
    body: q.body,
    author: q.author,
    votes: q.vote_counts?.[0]?.net_votes ?? 0,
  }));

  const hasMore = rows.length > limit;
  return { questions: rows.slice(0, limit), hasMore };
}

export async function searchQuestions(q: string, limit: number) {
  const { data, error } = await supabase
    .from("questions")
    .select("id, body, author, created_at, vote_counts(net_votes)")
    .textSearch("body", q, { type: "websearch", config: "english" })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    body: row.body,
    author: row.author,
    votes: row.vote_counts?.[0]?.net_votes ?? 0,
  }));
}

// ── Vote helpers ─────────────────────────────────────────────────────────────

/**
 * Cast a vote on a question.
 * @param questionId - The question being voted on
 * @param voterId    - The voter's anonymous ID (from getVoterId())
 * @param type       - "up" or "down"
 *
 * Same vote again  → removes it (toggle off)
 * Opposite vote    → switches it (UPDATE)
 * No prior vote    → inserts a new one
 */
export async function voteQuestion(
  questionId: string,
  voterId: string,
  type: "up" | "down"
) {
  // 1. Check for an existing vote by this voter on this question
  const { data: existing, error: fetchError } = await supabase
    .from("votes")
    .select("id, type")
    .eq("question_id", questionId)
    .eq("voter_id", voterId)        // ← voter_id matches schema.sql
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);

  // 2a. Same vote already exists → remove it (toggle off)
  if (existing && existing.type === type) {
    const { error } = await supabase
      .from("votes")
      .delete()
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return { action: "removed", type };
  }

  // 2b. Opposite vote exists → switch it
  if (existing && existing.type !== type) {
    const { error } = await supabase
      .from("votes")
      .update({ type })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return { action: "switched", type };
  }

  // 2c. No prior vote → insert new
  const { error } = await supabase.from("votes").insert({
    question_id: questionId,
    voter_id: voterId,              // ← voter_id matches schema.sql
    type,
  });
  if (error) throw new Error(error.message);
  return { action: "added", type };
}

/**
 * Get the current voter's vote on a specific question.
 * Returns "up" | "down" | null
 */
export async function getUserVote(
  questionId: string,
  voterId: string
): Promise<"up" | "down" | null> {
  const { data, error } = await supabase
    .from("votes")
    .select("type")
    .eq("question_id", questionId)
    .eq("voter_id", voterId)        // ← voter_id matches schema.sql
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data?.type as "up" | "down") ?? null;
}

/**
 * Get net vote counts for a specific question directly.
 * Returns { upvotes, downvotes, net_votes }
 */
export async function getVoteCounts(questionId: string) {
  const { data, error } = await supabase
    .from("vote_counts")
    .select("upvotes, downvotes, net_votes")
    .eq("question_id", questionId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return {
    upvotes: data?.upvotes ?? 0,
    downvotes: data?.downvotes ?? 0,
    net_votes: data?.net_votes ?? 0,
  };
}