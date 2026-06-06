"use client";
import { useState, useEffect } from "react";

type Comment = {
  id: string;
  body: string;
  created_at: string;
};

export default function CommentSection({ questionId }: { questionId: string }) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/questions/${questionId}/comments`)
      .then((r) => r.json())
      .then((data) => setComments(data.comments ?? []))
      .finally(() => setLoading(false));
  }, [open, questionId]);

  async function submitComment() {
    if (!draft.trim()) return;
    setSubmitting(true);
    setError(null);

    const res = await fetch(`/api/questions/${questionId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: draft }),
    });

    const data = await res.json();

    if (res.ok) {
      setComments((prev) => [...prev, data]);
      setDraft("");
    } else {
      setError(data.error ?? "Failed to post comment.");
    }

    setSubmitting(false);
  }

  return (
    <div className="mt-3">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs text-muted hover:text-brand transition-colors"
      >
        <span>{open ? "▲" : "▼"}</span>
        <span>
          {open
            ? "Hide comments"
            : comments.length > 0
            ? `💬 ${comments.length} comment${comments.length !== 1 ? "s" : ""}`
            : "💬 Comments"}
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {/* Comments list */}
          {loading ? (
            <p className="text-xs text-muted">Loading comments…</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-muted italic">
              No comments yet — be the first!
            </p>
          ) : (
            <ul className="space-y-2">
              {comments.map((c) => (
                <li
                  key={c.id}
                  className="rounded-xl border bg-background px-3 py-2 text-sm leading-snug"
                >
                  {c.body}
                </li>
              ))}
            </ul>
          )}

          {/* Comment input */}
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitComment()}
              placeholder="Write a comment…"
              className="flex-1 rounded-xl border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-brand"
            />
            <button
              type="button"
              onClick={submitComment}
              disabled={submitting || !draft.trim()}
              className="rounded-xl bg-brand px-4 py-2 text-xs font-medium text-white hover:bg-brand-strong disabled:opacity-50 transition-colors"
            >
              {submitting ? "Posting…" : "Post"}
            </button>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      )}
    </div>
  );
}