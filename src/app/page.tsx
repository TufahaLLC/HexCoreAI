"use client";
import { useState } from "react";
import type { FormEvent } from "react";

type MatchEnqueueResponse = {
  puuid: string;
  matchCount: number;
  enqueued: number;
  region: string;
  year: number;
  schemaVersion: number;
};

export default function Home() {
  const [gameName, setGameName] = useState("");
  const [tagLine, setTagLine] = useState("");
  const [region, setRegion] = useState("americas");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MatchEnqueueResponse | null>(null);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const params = new URLSearchParams({ gameName, tagLine, region });
      const res = await fetch(`/api/matches?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Request failed: ${res.status}`);
      }
      setResult(data as MatchEnqueueResponse);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <div className="w-full max-w-xl flex flex-col gap-3">
          <form
            onSubmit={handleSearch}
            className="flex flex-col sm:flex-row gap-3 w-full"
          >
            <input
              type="text"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              placeholder="Game Name (e.g. SomePlayer)"
              className="flex-1 rounded-md border border-black/10 dark:border-white/20 bg-transparent px-3 py-2"
              aria-label="Game Name"
            />
            <input
              type="text"
              value={tagLine}
              onChange={(e) => setTagLine(e.target.value)}
              placeholder="Tag Line (e.g. NA1)"
              className="w-full sm:w-40 rounded-md border border-black/10 dark:border-white/20 bg-transparent px-3 py-2"
              aria-label="Tag Line"
            />
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full sm:w-40 rounded-md border border-black/10 dark:border-white/20 bg-transparent px-3 py-2"
              aria-label="Region"
            >
              <option value="americas">Americas</option>
              <option value="europe">Europe</option>
              <option value="asia">Asia</option>
              <option value="sea">SEA</option>
            </select>
            <button
              type="submit"
              disabled={loading || !gameName || !tagLine}
              className="rounded-md border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 disabled:opacity-50"
            >
              {loading ? "Searching…" : "Search matches"}
            </button>
          </form>
          {error && (
            <p className="text-red-600 text-sm" role="alert">
              {error}
            </p>
          )}
          {result && (
            <div className="bg-black/[.04] dark:bg-white/[.06] border border-black/10 dark:border-white/10 rounded-md p-4 font-mono text-xs sm:text-sm whitespace-pre-wrap break-words">
              {JSON.stringify(result, null, 2)}
            </div>
          )}
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center"></footer>
    </div>
  );
}
