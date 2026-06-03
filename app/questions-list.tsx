"use client";
import { useState, useEffect } from "react";
import { getVoterId } from "@/lib/voter";

type Question = {
  id: string;
  body: string;
  author: string | null;
  votes: number;
};

export default function QuestionsList({
  initialQuestions,
  initialHasMore,
}: {
  initialQuestions: Question[];
  initialHasMore: boolean;
}) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [userVotes, setUserVotes] = useState<Record<string, "up" | "down">>({});

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    const id = setTimeout(async () => {
      const url = query
        ? `/api/questions?q=${encodeURIComponent(query)}`
        : `/api/questions`;
      const res = await fetch(url);
      const data = await res.json();
      setQuestions(data.questions);
      setHasMore(data.hasMore);
    }, 300);

    return () => clearTimeout(id);
  }, [query]);

  async function submit() {
    if (!draft.trim()) return;

    const res = await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: draft }),
    });
    const created = await res.json();
    setQuestions((qs) => [{ ...created, votes: 0 }, ...qs]);
    setDraft("");
  }

  async function vote(id: string, type: "up" | "down") {
    const current = userVotes[id];
    const isToggle = current === type;
    const isSwitch = !!current && current !== type;

    // Optimistic UI update
    setQuestions((qs) =>
      qs.map((q) => {
        if (q.id !== id) return q;
        if (isToggle) return { ...q, votes: q.votes + (type === "up" ? -1 : 1) };
        if (isSwitch) return { ...q, votes: q.votes + (type === "up" ? 2 : -2) };
        return { ...q, votes: q.votes + (type === "up" ? 1 : -1) };
      })
    );

    // Optimistic vote state
    setUserVotes((prev) => {
      if (isToggle) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: type };
    });

    // API call — send type
    const res = await fetch(`/api/questions/${id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voterId: getVoterId(), type }),
    });

    // Roll back on failure
    if (!res.ok) {
      setQuestions((qs) =>
        qs.map((q) => {
          if (q.id !== id) return q;
          if (isToggle) return { ...q, votes: q.votes - (type === "up" ? -1 : 1) };
          if (isSwitch) return { ...q, votes: q.votes - (type === "up" ? 2 : -2) };
          return { ...q, votes: q.votes - (type === "up" ? 1 : -1) };
        })
      );
      setUserVotes((prev) => {
        const next = { ...prev };
        if (current) next[id] = current;
        else delete next[id];
        return next;
      });
    }
  }

  async function loadMore() {
    setLoading(true);
    const res = await fetch(`/api/questions?offset=${questions.length}`);
    const data = await res.json();
    setQuestions((qs) => [...qs, ...data.questions]);
    setHasMore(data.hasMore);
    setLoading(false);
  }

  return (
    <div className="space-y-5">
      {/* Ask box */}
      <div className="rounded-2xl border bg-surface p-4 shadow-sm">
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Ask a question…"
            className="flex-1 rounded-xl border bg-background px-4 py-2.5 text-sm outline-none placeholder:text-muted focus:border-brand"
          />
          <button
            onClick={submit}
            className="rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-strong"
          >
            Ask
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions…"
          className="w-full flex-1 rounded-xl border bg-surface px-4 py-2.5 text-sm outline-none placeholder:text-muted focus:border-brand"
        />
        <span className="shrink-0 text-xs text-muted">
          {hydrated ? "Interactive ✓" : "Loading interactivity…"}
        </span>
      </div>

      {/* Questions */}
      <ul className="space-y-3">
        {questions.map((q) => {
          const voted = userVotes[q.id];
          return (
            <li
              key={q.id}
              className="flex items-start gap-3 rounded-2xl border bg-surface p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Vote column */}
              <div className="flex shrink-0 flex-col items-center gap-1">

                {/* Upvote */}
                <button
                  onClick={() => vote(q.id, "up")}
                  title="Upvote"
                  className={`flex items-center justify-center rounded-xl border px-3.5 py-1.5 text-xs font-bold transition-colors
                    ${
                      voted === "up"
                        ? "border-brand bg-brand text-white"
                        : "border-current text-brand hover:border-brand hover:bg-brand-soft"
                    }`}
                >
                  ▲
                </button>

                {/* Net vote count */}
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    q.votes > 0
                      ? "text-brand"
                      : q.votes < 0
                      ? "text-red-400"
                      : "text-muted"
                  }`}
                >
                  {q.votes}
                </span>

                {/* Downvote */}
                <button
                  onClick={() => vote(q.id, "down")}
                  title="Downvote"
                  className={`flex items-center justify-center rounded-xl border px-3.5 py-1.5 text-xs font-bold transition-colors
                    ${
                      voted === "down"
                        ? "border-red-500 bg-red-500 text-white"
                        : "border-current text-red-400 hover:border-red-400 hover:bg-red-50"
                    }`}
                >
                  ▼
                </button>
              </div>

              {/* Question body */}
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="leading-snug">{q.body}</p>
                {q.author && (
                  <p className="mt-1.5 text-xs text-muted">{q.author}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {questions.length === 0 && (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted">
          No questions yet — be the first to ask.
        </p>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="rounded-xl border bg-surface px-5 py-2.5 text-sm font-medium transition-colors hover:border-brand hover:text-brand disabled:opacity-50"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}