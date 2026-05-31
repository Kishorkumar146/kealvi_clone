import { NextResponse } from "next/server";
import type { Question } from "@/lib/seed";
import { supabase } from "@/lib/supabase";

// In-memory store — the fallback when Supabase isn't configured. Survives
// page reloads (kept in memory between requests) but wiped on server restart.
let questions: Question[] = [];

// Always read the live data; never serve a cached snapshot.
export const dynamic = "force-dynamic";

export async function GET() {
  if (supabase) {
    const { data, error } = await supabase
      .from("questions")
      .select("id, body, author, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data ?? []);
  }

  // Fallback: in-memory array.
  return NextResponse.json(questions);
}

export async function POST(req: Request) {
  const { body, author } = await req.json();

  if (supabase) {
    const { data, error } = await supabase
      .from("questions")
      .insert({ body, author: author ?? "Anonymous" })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  }

  // Fallback: in-memory array.
  const question: Question = {
    id: crypto.randomUUID(),
    body,
    author: author ?? "Anonymous",
  };
  questions = [question, ...questions];
  return NextResponse.json(question);
}
