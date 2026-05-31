import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getQuestions, addQuestion } from "@/lib/memory-store";

// Always read the live data; never serve a cached snapshot.
export const dynamic = "force-dynamic";

export async function GET() {
  if (supabase) {
    const { data, error } = await supabase
      .from("questions")
      .select("id, body, author, votes, created_at")
      .order("votes", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data ?? []);
  }

  // Fallback: in-memory store, sorted by votes.
  const list = [...getQuestions()].sort((a, b) => b.votes - a.votes);
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const { body, author } = await req.json();

  if (supabase) {
    const { data, error } = await supabase
      .from("questions")
      .insert({ body, author: author ?? "Anonymous" }) // votes defaults to 0
      .select("id, body, author, votes, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  }

  // Fallback: in-memory store.
  const question = addQuestion({
    id: crypto.randomUUID(),
    body,
    author: author ?? "Anonymous",
    votes: 0,
  });
  return NextResponse.json(question);
}
