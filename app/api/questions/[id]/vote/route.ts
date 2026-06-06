import { supabase } from "@/lib/supabase";

// GET — return real net vote count for a single question
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: questionId } = await params;

  const { data, error } = await supabase
    .from("votes")
    .select("type")
    .eq("question_id", questionId);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const upvotes = (data ?? []).filter((v) => v.type === "up").length;
  const downvotes = (data ?? []).filter((v) => v.type === "down").length;

  return Response.json({ upvotes, downvotes, net_votes: upvotes - downvotes });
}

// POST — insert a new vote row on every click (no duplicate prevention)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: questionId } = await params;
  const { voterId, type } = await req.json();

  if (!voterId || !type || !["up", "down"].includes(type)) {
    return Response.json({ error: "invalid request" }, { status: 400 });
  }

  const { error } = await supabase
    .from("votes")
    .insert({ question_id: questionId, voter_id: voterId, type });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ action: "added", type });
}