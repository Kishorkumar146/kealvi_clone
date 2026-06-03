import { supabase } from "@/lib/supabase";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: questionId } = await params;
  const { voterId, type } = await req.json();

  if (!voterId || !type || !["up", "down"].includes(type)) {
    return Response.json({ error: "invalid request" }, { status: 400 });
  }

  // 1. Check for existing vote by this voter on this question
  const { data: existing, error: fetchError } = await supabase
    .from("votes")
    .select("id, type")
    .eq("question_id", questionId)
    .eq("voter_id", voterId)
    .maybeSingle();

  if (fetchError) {
    return Response.json({ error: fetchError.message }, { status: 500 });
  }

  // 2a. Same vote → toggle off (delete)
  if (existing && existing.type === type) {
    const { error } = await supabase
      .from("votes")
      .delete()
      .eq("id", existing.id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ action: "removed", type });
  }

  // 2b. Opposite vote → switch it (update)
  if (existing && existing.type !== type) {
    const { error } = await supabase
      .from("votes")
      .update({ type })
      .eq("id", existing.id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ action: "switched", type });
  }

  // 2c. No prior vote → insert new
  const { error } = await supabase
    .from("votes")
    .insert({ question_id: questionId, voter_id: voterId, type });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ action: "added", type });
}