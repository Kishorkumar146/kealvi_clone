import { supabase } from "@/lib/supabase";

export async function getRecentQuestions(limit = 20) {
  const { data, error } = await supabase
    .from("questions")
    .select("id, body, author, created_at, votes(count)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  // votes(count) comes back as votes: [{ count: N }] — flatten it.
  const rows = (data ?? []).map((q) => ({
    id: q.id,
    body: q.body,
    author: q.author,
    votes: q.votes?.[0]?.count ?? 0,
  }));
  return rows;
}
