"use client";

import { useEffect, useState } from "react";
import type { Question } from "@/lib/seed";

export default function Questions({ initial }: { initial: Question[] }) {
  const [questions, setQuestions] = useState<Question[]>(initial);
  const [body, setBody] = useState("");

  // On load, pull the server's current list so reloads show what's persisted.
  useEffect(() => {
    fetch("/api/questions", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: Question[]) => setQuestions(data))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return; // guard against empty body

    setBody("");

    // Send it to the server, then add the saved question to the list.
    const res = await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: trimmed, author: "Anonymous" }),
    });
    const saved: Question = await res.json();
    setQuestions((qs) => [saved, ...qs]);
  }

  async function upvote(id: string) {
    // optimistic: bump the count on screen right away
    setQuestions((qs) =>
      qs.map((q) => (q.id === id ? { ...q, votes: q.votes + 1 } : q))
    );

    const res = await fetch(`/api/questions/${id}/vote`, { method: "POST" });

    // server said no — roll the count back
    if (!res.ok) {
      setQuestions((qs) =>
        qs.map((q) => (q.id === id ? { ...q, votes: q.votes - 1 } : q))
      );
    }
  }

  const sorted = [...questions].sort((a, b) => b.votes - a.votes);

  return (
    <div className="space-y-6">
      {/* Submit card */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
      >
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type your question…"
          className="w-full rounded-lg bg-gray-50 px-4 py-3 outline-none placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-brand/40"
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            type="submit"
            disabled={!body.trim()}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </form>

      {/* Questions list, most-upvoted first */}
      <ul className="space-y-3">
        {sorted.map((q) => (
          <li
            key={q.id}
            className="flex items-start gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[15px] leading-relaxed">{q.body}</p>
              <p className="mt-2 text-xs font-medium text-gray-400">
                {q.author}
              </p>
            </div>
            <button
              onClick={() => upvote(q.id)}
              aria-label="Upvote"
              className="flex shrink-0 flex-col items-center rounded-xl border border-gray-200 px-3 py-1.5 text-brand transition-colors hover:border-brand hover:bg-brand/5"
            >
              <span className="text-sm leading-none">▲</span>
              <span className="text-sm font-semibold tabular-nums">
                {q.votes}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
