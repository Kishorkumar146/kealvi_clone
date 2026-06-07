"use client";
import { useEffect, useRef, useState } from "react";

export default function AIAnswerModal({
  question,
  onClose,
}: {
  question: string;
  onClose: () => void;
}) {
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/ai-answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setAnswer(data.answer);
      })
      .catch(() => setError("Something went wrong."))
      .finally(() => setLoading(false));
  }, [question]);

  // Close on backdrop click
  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <div className="relative w-full max-w-lg rounded-2xl border bg-surface shadow-xl p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-brand uppercase tracking-wide">
              ✨ AI Answer
            </p>
            <p className="text-sm font-semibold leading-snug">{question}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border px-2 py-1 text-xs text-muted hover:border-brand hover:text-brand transition-colors"
          >
            ✕ Close
          </button>
        </div>

        <hr className="border-border" />

        {/* Body */}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <span className="animate-spin">⏳</span>
            <span>Generating answer…</span>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-500">❌ {error}</p>
        )}

        {answer && (
          <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap max-h-96 overflow-y-auto pr-1">
            {answer}
          </div>
        )}

        {/* Footer */}
        <p className="text-xs text-muted text-right">
          Powered by Gemini 1.5 Flash
        </p>
      </div>
    </div>
  );
}