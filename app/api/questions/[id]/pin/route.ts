import { supabase } from "@/lib/supabase";

// POST — toggle pin on a question
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: questionId } = await params;

  // Get current pin state
  const { data: question, error: fetchError } = await supabase
    .from("questions")
    .select("pinned")
    .eq("id", questionId)
    .single();

  if (fetchError) return Response.json({ error: fetchError.message }, { status: 500 });

  const newPinned = !question.pinned;

  const { error } = await supabase
    .from("questions")
    .update({ pinned: newPinned })
    .eq("id", questionId);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ pinned: newPinned });
}