import { supabase } from "@/lib/supabase";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: questionId } = await params;

  const { data, error } = await supabase
    .from("comments")
    .select("id, body, created_at")
    .eq("question_id", questionId)
    .order("created_at", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ comments: data ?? [] });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: questionId } = await params;
  const { body } = await req.json();

  if (!body?.trim()) {
    return Response.json({ error: "Comment cannot be empty" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({ question_id: questionId, body: body.trim() })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}