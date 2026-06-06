import { supabase } from "@/lib/supabase";

// POST — create a poll for a question
export async function POST(req: Request) {
  const { questionId, options } = await req.json();

  if (!questionId || !Array.isArray(options) || options.length < 2) {
    return Response.json({ error: "invalid request" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("polls")
    .insert({ question_id: questionId, options })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}