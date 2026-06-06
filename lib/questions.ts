import { supabase } from "@/lib/supabase";

export async function getQuestionsPage(offset: number, limit: number) {
  const { data, error } = await supabase.rpc("get_questions_with_votes", {
    p_offset: offset,
    p_limit: limit,
  });

  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((q: any) => ({
    id: q.id,
    body: q.body,
    author: q.author,
    votes: Number(q.net_votes ?? 0),
  }));

  const hasMore = rows.length > limit;
  return { questions: rows.slice(0, limit), hasMore };
}

export async function searchQuestions(q: string, limit: number) {
  const { data, error } = await supabase.rpc("search_questions_with_votes", {
    p_query: q,
    p_limit: limit,
  });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    body: row.body,
    author: row.author,
    votes: Number(row.net_votes ?? 0),
  }));
}

export async function voteQuestion(
  questionId: string,
  voterId: string,
  type: "up" | "down"
) {
  const { error } = await supabase
    .from("votes")
    .insert({ question_id: questionId, voter_id: voterId, type });

  if (error) throw new Error(error.message);
  return { action: "added", type };
}

export async function getUserVote(
  questionId: string,
  voterId: string
): Promise<"up" | "down" | null> {
  const { data, error } = await supabase
    .from("votes")
    .select("type")
    .eq("question_id", questionId)
    .eq("voter_id", voterId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data?.type as "up" | "down") ?? null;
}

export async function getVoteCounts(questionId: string) {
  const { data, error } = await supabase
    .from("votes")
    .select("type")
    .eq("question_id", questionId);

  if (error) throw new Error(error.message);

  const upvotes = (data ?? []).filter((v) => v.type === "up").length;
  const downvotes = (data ?? []).filter((v) => v.type === "down").length;
  return { upvotes, downvotes, net_votes: upvotes - downvotes };
}