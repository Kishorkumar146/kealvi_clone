import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { voteQuestion } from "@/lib/memory-store";

export const dynamic = "force-dynamic";

// Naive voting: just bump a number on the question. There's no record of WHO
// voted, so nothing stops one person clicking 50 times. That flaw is exactly
// what motivates arcing to a separate `votes` table next.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (supabase) {
    // Atomic `votes = votes + 1` via a SQL function, so concurrent votes
    // can't clobber each other the way a read-then-write would.
    const { data, error } = await supabase.rpc("increment_question_votes", {
      q_id: id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ votes: data });
  }

  // Fallback: in-memory store.
  const q = voteQuestion(id);
  if (!q) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ votes: q.votes });
}
