import { supabase } from "@/lib/supabase";

// GET — return vote counts for a poll
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: pollId } = await params;

  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select("options")
    .eq("id", pollId)
    .single();

  if (pollError) return Response.json({ error: pollError.message }, { status: 500 });

  const { data: votes, error: votesError } = await supabase
    .from("poll_votes")
    .select("option_idx")
    .eq("poll_id", pollId);

  if (votesError) return Response.json({ error: votesError.message }, { status: 500 });

  const total = votes?.length ?? 0;
  const counts = (poll.options as string[]).map((_: string, i: number) => {
    const count = (votes ?? []).filter((v) => v.option_idx === i).length;
    return { count, percent: total === 0 ? 0 : Math.round((count / total) * 100) };
  });

  return Response.json({ total, counts });
}

// POST — cast or switch a poll vote
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: pollId } = await params;
  const { voterId, optionIdx } = await req.json();

  if (!voterId || optionIdx === undefined) {
    return Response.json({ error: "invalid request" }, { status: 400 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from("poll_votes")
    .select("id, option_idx")
    .eq("poll_id", pollId)
    .eq("voter_id", voterId)
    .maybeSingle();

  if (fetchError) return Response.json({ error: fetchError.message }, { status: 500 });

  if (existing) {
    const { error } = await supabase
      .from("poll_votes")
      .update({ option_idx: optionIdx })
      .eq("id", existing.id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ action: "switched", optionIdx });
  }

  const { error } = await supabase
    .from("poll_votes")
    .insert({ poll_id: pollId, voter_id: voterId, option_idx: optionIdx });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ action: "added", optionIdx });
}

// DELETE — remove a poll and its votes
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: pollId } = await params;

  const { error: votesError } = await supabase
    .from("poll_votes")
    .delete()
    .eq("poll_id", pollId);

  if (votesError)
    return Response.json({ error: votesError.message }, { status: 500 });

  const { error } = await supabase
    .from("polls")
    .delete()
    .eq("id", pollId);

  if (error)
    return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true });
}