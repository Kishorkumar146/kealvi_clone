"use client";
import { useState, useEffect } from "react";
import { getVoterId } from "@/lib/voter";
import PollBlock from "@/components/PollBlock";

type Poll = {
  id: string;
  options: string[];
};

type Question = {
  id: string;
  body: string;
  author: string | null;
  votes: number;
  pinned: boolean;
  poll?: Poll | null;
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

  const [showPollFor, setShowPollFor] = useState<string | null>(null);
  const [pollOptions, setPollOptions] = useState(["", "", "", ""]);
  const [pollError, setPollError] = useState<string | null>(null);

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
      setHasMore(data.hasMore ?? false);
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  async function refreshVoteCount(id: string) {
    const res = await fetch(`/api/questions/${id}/vote`);
    if (!res.ok) return;
    const data = await res.json();
    setQuestions((qs) =>
      qs.map((q) => (q.id === id ? { ...q, votes: data.net_votes } : q))
    );
  }

  async function submit() {
    if (!draft.trim()) return;
    const res = await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: draft }),
    });
    const created = await res.json();
    setQuestions((qs) => [
      { ...created, votes: 0, pinned: false, poll: null },
      ...qs,
    ]);
    setDraft("");
  }

  async function vote(id: string, type: "up" | "down") {
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === id ? { ...q, votes: q.votes + (type === "up" ? 1 : -1) } : q
      )
    );
    setUserVotes((prev) => ({ ...prev, [id]: type }));

    const res = await fetch(`/api/questions/${id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voterId: getVoterId(), type }),
    });

    if (res.ok) {
      await refreshVoteCount(id);
    } else {
      setQuestions((qs) =>
        qs.map((q) =>
          q.id === id
            ? { ...q, votes: q.votes - (type === "up" ? 1 : -1) }
            : q
        )
      );
      setUserVotes((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  async function togglePin(id: string) {
    setQuestions((qs) =>
      qs.map((q) => (q.id === id ? { ...q, pinned: !q.pinned } : q))
    );
    const res = await fetch(`/api/questions/${id}/pin`, { method: "POST" });
    if (!res.ok) {
      setQuestions((qs) =>
        qs.map((q) => (q.id === id ? { ...q, pinned: !q.pinned } : q))
      );
    }
  }

  async function submitPoll(questionId: string) {
    const filled = pollOptions.filter((o) => o.trim());
    if (filled.length < 2) {
      setPollError("Please fill in at least 2 options.");
      return;
    }

    setPollError(null);

    const res = await fetch("/api/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, options: filled }),
    });

    const data = await res.json();

    if (res.ok) {
      setQuestions((qs) =>
        qs.map((q) =>
          q.id === questionId
            ? { ...q, poll: { id: data.id, options: data.options } }
            : q
        )
      );
      setShowPollFor(null);
      setPollOptions(["", "", "", ""]);
      setPollError(null);
    } else {
      setPollError(data.error ?? "Failed to create poll. Try again.");
      console.error("Poll creation failed:", data.error);
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

  const sorted = [...questions].sort((a, b) =>
    a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1
  );

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
            type="button"
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
        {sorted.map((q) => {
          const voted = userVotes[q.id];
          return (
            <li
              key={q.id}
              className={`rounded-2xl border bg-surface p-4 shadow-sm transition-shadow hover:shadow-md ${
                q.pinned ? "border-brand ring-1 ring-brand" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Vote column */}
                <div className="flex shrink-0 flex-col items-center gap-1">
                  <button
                    type="button"
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
                  <button
                    type="button"
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
                  <div className="flex items-start justify-between gap-2">
                    <p className="leading-snug">{q.body}</p>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {/* Pin button */}
                      <button
                        type="button"
                        onClick={() => togglePin(q.id)}
                        title={q.pinned ? "Unpin" : "Pin"}
                        className={`rounded-lg border px-2 py-1 text-xs transition-colors ${
                          q.pinned
                            ? "border-brand bg-brand text-white"
                            : "border-current text-muted hover:border-brand hover:text-brand"
                        }`}
                      >
                        {q.pinned ? "📌 Pinned" : "📌 Pin"}
                      </button>

                      {/* Poll button */}
                      {!q.poll && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowPollFor(
                              showPollFor === q.id ? null : q.id
                            );
                            setPollError(null);
                            setPollOptions(["", "", "", ""]);
                          }}
                          title="Add poll"
                          className="rounded-lg border border-current px-2 py-1 text-xs text-muted transition-colors hover:border-brand hover:text-brand"
                        >
                          📊 Poll
                        </button>
                      )}
                    </div>
                  </div>

                  {q.author && (
                    <p className="mt-1 text-xs text-muted">{q.author}</p>
                  )}

                  {/* Poll creation form */}
                  {showPollFor === q.id && (
                    <div className="mt-3 space-y-2 rounded-xl border bg-background p-3">
                      <p className="text-xs font-medium text-muted">
                        Add up to 4 options (min 2 required)
                      </p>
                      {pollOptions.map((opt, i) => (
                        <input
                          key={i}
                          value={opt}
                          onChange={(e) => {
                            const next = [...pollOptions];
                            next[i] = e.target.value;
                            setPollOptions(next);
                          }}
                          placeholder={`Option ${i + 1}${i < 2 ? " *" : ""}`}
                          className="w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-brand"
                        />
                      ))}

                      {pollError && (
                        <p className="text-xs text-red-500">{pollError}</p>
                      )}

                      <div className="flex flex-row gap-2 w-full">
                        <button
                          type="button"
                          onClick={() => submitPoll(q.id)}
                          className="rounded-lg bg-brand px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-strong"
                        >
                          Create Poll
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowPollFor(null);
                            setPollOptions(["", "", "", ""]);
                            setPollError(null);
                          }}
                          className="rounded-lg border px-4 py-1.5 text-xs text-muted hover:border-brand hover:text-brand"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Poll results */}
                  {q.poll && (
                    <PollBlock pollId={q.poll.id} options={q.poll.options} />
                  )}
                </div>
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
            type="button"
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