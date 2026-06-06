"use client";
import { useState, useEffect } from "react";
import { getVoterId } from "@/lib/voter";

type PollResult = { count: number; percent: number };

export default function PollBlock({
  pollId,
  options,
}: {
  pollId: string;
  options: string[];
}) {
  const [results, setResults] = useState<PollResult[]>(
    options.map(() => ({ count: 0, percent: 0 }))
  );
  const [total, setTotal] = useState(0);
  const [voted, setVoted] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchResults();
  }, [pollId]);

  async function fetchResults() {
    const res = await fetch(`/api/polls/${pollId}/vote`);
    if (!res.ok) return;
    const data = await res.json();
    setResults(data.counts);
    setTotal(data.total);
  }

  async function castVote(optionIdx: number) {
    if (loading) return;
    setLoading(true);

    // Optimistic
    setVoted(optionIdx);

    const res = await fetch(`/api/polls/${pollId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voterId: getVoterId(), optionIdx }),
    });

    if (res.ok) {
      await fetchResults();
    } else {
      setVoted(null);
    }
    setLoading(false);
  }

  return (
    <div className="mt-3 space-y-2">
      {options.map((option, i) => {
        const isVoted = voted === i;
        const percent = results[i]?.percent ?? 0;
        const count = results[i]?.count ?? 0;
        return (
          <button
            key={i}
            onClick={() => castVote(i)}
            disabled={loading}
            className="relative w-full overflow-hidden rounded-xl border text-left transition-colors
              hover:border-brand disabled:cursor-not-allowed"
          >
            {/* Progress bar fill */}
            <div
              className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                isVoted ? "bg-brand opacity-20" : "bg-brand opacity-10"
              }`}
              style={{ width: `${percent}%` }}
            />
            <div className="relative flex items-center justify-between px-4 py-2.5">
              <span
                className={`text-sm font-medium ${
                  isVoted ? "text-brand" : "text-foreground"
                }`}
              >
                {option}
              </span>
              <span className="ml-4 shrink-0 text-xs text-muted">
                {percent}% · {count}
              </span>
            </div>
          </button>
        );
      })}
      <p className="text-xs text-muted">{total} vote{total !== 1 ? "s" : ""} total</p>
    </div>
  );
}