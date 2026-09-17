"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Participant } from "@/lib/types";
import { TEAM_OPTIONS, UNASSIGNED, teamOption } from "@/lib/types";

const QUICK_DELTAS = [-5, -1, 1, 5, 10];
const PAGE_SIZE = 25;

const SCORING_CRITERIA = [
  { points: 50, title: "Offline event attendance", detail: "Attend and participate in an offline CodeGeeks event." },
  { points: 10, title: "Team online meeting", detail: "Attend an online meeting with your full team." },
  { points: 20, title: "Team offline meeting", detail: "Attend an offline meeting with your full team." },
  { points: 10, title: "Individual team-meet summary", detail: "Submit a clear summary of an individual team meeting." },
  { points: 10, title: "Assigned work completed", detail: "Complete work assigned to you within the expected timeline." },
  { points: 20, title: "Exceptional work", detail: "Earn bonus points for work that goes above and beyond." },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Avatar({ name, team }: { name: string; team: string }) {
  const t = team ? teamOption(team) : UNASSIGNED;
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 font-display"
      style={{ backgroundColor: t.bg, color: t.text }}
    >
      {initials(name)}
    </div>
  );
}

function TeamBadge({ team }: { team: string }) {
  const t = team ? teamOption(team) : UNASSIGNED;
  return (
    <span
      className="text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ backgroundColor: t.bg, color: t.text }}
    >
      {t.label}
    </span>
  );
}

function CodeGeeksLogo() {
  return (
    <div className="codegeeks-logo" aria-label="CodeGeeks logo">
      <span className="codegeeks-logo-name">CodeGeeks</span>
    </div>
  );
}

function TeamSelect({
  value,
  onChange,
  compact,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  const team = value ? teamOption(value) : UNASSIGNED;

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={{ borderColor: team.bg, color: "#e8eef8" }}
      className={`rounded-lg border border-brand-200 bg-brand-950 text-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-400 ${
        compact ? "text-xs px-2 py-1" : "text-sm px-3 py-2"
      }`}
    >
      <option value="">No team</option>
      {TEAM_OPTIONS.map((t) => (
        <option key={t.id} value={t.id}>
          {t.label}
        </option>
      ))}
    </select>
  );
}

function FloatingBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10" aria-hidden>
      <div className="ambient-light ambient-light-blue float-a" />
      <div className="ambient-light ambient-light-pink float-b" />
      <div className="ambient-light ambient-light-green float-c" />
      <div className="ambient-grid" />
    </div>
  );
}

export default function Home() {
  const [participants, setParticipants] = useState<Participant[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterTeam, setFilterTeam] = useState("");
  const [page, setPage] = useState(1);

  const [addMode, setAddMode] = useState<"single" | "bulk">("single");
  const [singleName, setSingleName] = useState("");
  const [singleTeam, setSingleTeam] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [bulkTeam, setBulkTeam] = useState("");
  const [adding, setAdding] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [adminKeyInput, setAdminKeyInput] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const [customDelta, setCustomDelta] = useState<Record<string, string>>({});
  const [flash, setFlash] = useState<Record<string, "up" | "down" | undefined>>({});
  const flashTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const isEditor = Boolean(adminKey);

  const editorHeaders = (includeJson = false) => ({
    ...(includeJson ? { "Content-Type": "application/json" } : {}),
    "x-admin-key": adminKey,
  });

  const unlockEditor = async () => {
    const key = adminKeyInput.trim();
    if (!key) return;
    const res = await fetch("/api/participants", {
      headers: { "x-admin-key": key },
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || data?.canEdit !== true) {
      setUnlockError("That editor key is not valid.");
      return;
    }
    setAdminKey(key);
    setAdminKeyInput("");
    setUnlockError(null);
  };

  const fetchParticipants = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      const res = await fetch("/api/participants", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setParticipants(data.participants);
      if (!opts?.silent) setError(null);
    } catch {
      setError("Couldn't reach the leaderboard. Retrying…");
    }
  }, []);

  useEffect(() => {
    fetchParticipants();
    const interval = setInterval(() => fetchParticipants({ silent: true }), 5000);
    return () => clearInterval(interval);
  }, [fetchParticipants]);

  useEffect(() => {
    setPage(1);
  }, [search, filterTeam]);

  const triggerFlash = (id: string, direction: "up" | "down") => {
    setFlash((f) => ({ ...f, [id]: direction }));
    clearTimeout(flashTimers.current[id]);
    flashTimers.current[id] = setTimeout(() => {
      setFlash((f) => ({ ...f, [id]: undefined }));
    }, 900);
  };

  const adjustScore = async (id: string, delta: number) => {
    if (!delta) return;
    setParticipants((prev) =>
      prev
        ? prev
            .map((p) => (p.id === id ? { ...p, score: p.score + delta } : p))
            .sort((a, b) => b.score - a.score)
        : prev
    );
    triggerFlash(id, delta > 0 ? "up" : "down");
    try {
      const res = await fetch(`/api/participants/${id}`, {
        method: "PATCH",
        headers: editorHeaders(true),
        body: JSON.stringify({ delta }),
      });
      if (!res.ok) throw new Error();
      fetchParticipants({ silent: true });
    } catch {
      setError("Couldn't save that change. Reloading…");
      fetchParticipants();
    }
  };

  const changeTeam = async (id: string, team: string) => {
    setParticipants((prev) =>
      prev ? prev.map((p) => (p.id === id ? { ...p, team } : p)) : prev
    );
    try {
      await fetch(`/api/participants/${id}`, {
        method: "PATCH",
        headers: editorHeaders(true),
        body: JSON.stringify({ team }),
      });
    } catch {
      fetchParticipants();
    }
  };

  const applyCustom = (id: string) => {
    const raw = customDelta[id];
    const delta = parseInt(raw ?? "", 10);
    if (!Number.isFinite(delta) || delta === 0) return;
    adjustScore(id, delta);
    setCustomDelta((c) => ({ ...c, [id]: "" }));
  };

  const addSingle = async () => {
    const name = singleName.trim();
    if (!name || adding) return;
    setAdding(true);
    try {
      const res = await fetch("/api/participants", {
        method: "POST",
        headers: editorHeaders(true),
        body: JSON.stringify({ name, team: singleTeam }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Couldn't add that participant.");
      }
      setSingleName("");
      fetchParticipants();
    } catch (e: any) {
      setError(e.message || "Couldn't add that participant.");
    } finally {
      setAdding(false);
    }
  };

  const addBulk = async () => {
    const names = bulkText
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length === 0 || adding) return;
    setAdding(true);
    try {
      const res = await fetch("/api/participants", {
        method: "POST",
        headers: editorHeaders(true),
        body: JSON.stringify({ names, team: bulkTeam }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Couldn't add those participants.");
      }
      setBulkText("");
      fetchParticipants();
    } catch (e: any) {
      setError(e.message || "Couldn't add those participants.");
    } finally {
      setAdding(false);
    }
  };

  const removeParticipant = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from the leaderboard? This can't be undone.`)) return;
    setParticipants((prev) => (prev ? prev.filter((p) => p.id !== id) : prev));
    try {
      await fetch(`/api/participants/${id}`, { method: "DELETE", headers: editorHeaders() });
    } catch {
      fetchParticipants();
    }
  };

  const ranked = useMemo(
    () => (participants ?? []).map((p, i) => ({ ...p, rank: i + 1 })),
    [participants]
  );

  const podium = ranked.slice(0, 3);

  const totalScore = useMemo(
    () => (participants ?? []).reduce((total, participant) => total + participant.score, 0),
    [participants]
  );
  const activeTeams = useMemo(
    () => new Set((participants ?? []).map((participant) => participant.team).filter(Boolean)).size,
    [participants]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ranked.filter((p) => {
      const matchesSearch = !q || p.name.toLowerCase().includes(q);
      const matchesTeam = !filterTeam || p.team === filterTeam;
      return matchesSearch && matchesTeam;
    });
  }, [ranked, search, filterTeam]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const medalBorder = (rank: number) =>
    rank === 1
      ? "border-brand-gold"
      : rank === 2
      ? "border-brand-silver"
      : rank === 3
      ? "border-brand-bronze"
      : "border-brand-100";

  return (
    <main className="relative min-h-screen px-4 py-10 sm:py-14">
      <FloatingBackground />

      <div className="max-w-3xl mx-auto">
        {/* hero / branding */}
        <div className="hero-depth flex flex-col items-center text-center mb-10">
          <CodeGeeksLogo />
          <p className="mt-3 font-display text-3xl sm:text-4xl font-bold text-brand-900 tracking-tight">
            Leaderboard
          </p>
          <p className="text-brand-600 text-sm">
            Live leaderboard ·{" "}
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-600 animate-pulse" />
              updating in real time
            </span>
          </p>
        </div>

        <div className="stats-strip grid grid-cols-3 gap-2 sm:gap-3 mb-8">
          <div className="stat-card stat-card-blue">
            <span className="stat-label">Participants</span>
            <strong>{participants?.length ?? 0}</strong>
          </div>
          <div className="stat-card stat-card-pink">
            <span className="stat-label">Total points</span>
            <strong>{totalScore}</strong>
          </div>
          <div className="stat-card stat-card-green">
            <span className="stat-label">Active teams</span>
            <strong>{activeTeams}</strong>
          </div>
        </div>

        <section className="criteria-panel ui-depth bg-brand-950 rounded-2xl border border-brand-100 shadow-card p-4 sm:p-5 mb-8" aria-labelledby="criteria-title">
          <div className="flex items-end justify-between gap-3 mb-4">
            <div>
              <p className="section-kicker">How points are earned</p>
              <h2 id="criteria-title" className="font-display text-lg font-bold text-brand-900">
                Scoring criteria
              </h2>
            </div>
            <span className="criteria-total">130 max</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {SCORING_CRITERIA.map((criterion) => (
              <div key={criterion.title} className="criteria-item">
                <span className="criteria-points">+{criterion.points}</span>
                <div>
                  <p className="text-sm font-semibold text-brand-900">{criterion.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-brand-400">{criterion.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {error && (
          <p className="text-center text-sm text-red-300 mb-6 bg-red-950/50 border border-red-900 rounded-lg py-2 px-3">
            {error}
          </p>
        )}

        {participants === null && !error && (
            <p className="text-center text-brand-400 text-sm">Loading leaderboard…</p>
        )}

        {participants && participants.length === 0 && (
          <div className="text-center bg-brand-950 border border-brand-100 rounded-2xl py-10 px-6 shadow-card">
            <p className="text-brand-900 font-medium mb-1">No participants yet</p>
            <p className="text-brand-600 text-sm">
              Add your first participants below — paste all 100+ names at once with Bulk add.
            </p>
          </div>
        )}

        {/* podium */}
        {podium.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-8 items-end rise-in perspective-stage">
            {[podium[1], podium[0], podium[2]].map((p, idx) =>
              p ? (
                <div
                  key={p.id}
                  className={`bg-brand-950 rounded-2xl border-t-4 ${medalBorder(p.rank)} shadow-podium px-3 py-4 flex flex-col items-center text-center ${
                    idx === 1 ? "pb-6 -mt-3" : ""
                  }`}
                >
                  <span className="font-display text-xs font-bold text-brand-400 mb-1">
                    #{p.rank}
                  </span>
                  <Avatar name={p.name} team={p.team} />
                  <p className="mt-2 text-sm font-semibold text-brand-900 truncate max-w-full">
                    {p.name}
                  </p>
                  <div className="mt-1">
                    <TeamBadge team={p.team} />
                  </div>
                  <p className="mt-2 font-display text-xl font-bold text-brand-700">{p.score}</p>
                </div>
              ) : (
                <div key={idx} />
              )
            )}
          </div>
        )}

        {/* toolbar */}
        {participants && participants.length > 0 && (
          <div className="ui-depth bg-brand-950 rounded-2xl border border-brand-100 shadow-card p-4 mb-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search participants…"
                className="flex-1 text-sm px-3 py-2 rounded-lg border border-brand-200 bg-brand-50/50 text-brand-900 placeholder:text-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              <select
                value={filterTeam}
                onChange={(e) => setFilterTeam(e.target.value)}
                className="text-sm px-3 py-2 rounded-lg border border-brand-200 bg-brand-950 text-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                <option value="">All teams</option>
                {TEAM_OPTIONS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-brand-400 mt-2">
              {filtered.length} of {participants.length} participant
              {participants.length === 1 ? "" : "s"}
            </p>
          </div>
        )}

        {/* list */}
        {pageItems.length > 0 && (
          <div className="ui-depth leaderboard-panel bg-brand-950 rounded-2xl border border-brand-100 shadow-card overflow-hidden mb-4">
            <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
              <div>
                <p className="section-kicker">Live standings</p>
                <h2 className="font-display text-lg font-bold text-brand-900">Leaderboard</h2>
              </div>
              <span className="live-chip"><span /> Live</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-brand-50 border-b border-brand-100">
                  <tr className="text-[11px] uppercase tracking-wider text-brand-400">
                    <th className="px-4 py-3 font-semibold w-16 text-brand-400">Rank</th>
                    <th className="px-4 py-3 font-semibold text-white">Name</th>
                    <th className="px-4 py-3 font-semibold w-44 text-teal-300">Team</th>
                    <th className="px-4 py-3 font-semibold w-24 text-right text-amber-300">Score</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-50">
            {pageItems.map((p) => {
              const flashClass =
                flash[p.id] === "up" ? "flash-up" : flash[p.id] === "down" ? "flash-down" : "";
              return (
                <tr
                  key={p.id}
                  className={`group ${flashClass}`}
                >
                  <td
                    className={`px-4 py-3 font-display text-sm font-bold ${
                      p.rank === 1
                        ? "text-amber-300"
                        : p.rank === 2
                        ? "text-slate-300"
                        : p.rank === 3
                        ? "text-orange-300"
                        : "text-brand-400"
                    }`}
                  >
                    #{p.rank}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={p.name} team={p.team} />
                      <p className="text-sm font-semibold text-brand-900 truncate max-w-[12rem]">
                          {p.name}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <TeamSelect
                      value={p.team}
                      onChange={(v) => changeTeam(p.id, v)}
                      compact
                      disabled={!isEditor}
                    />
                  </td>
                  <td className="px-4 py-3 font-display text-lg font-bold text-brand-700 text-right">
                    {p.score}
                  </td>
                  <td className="px-4 py-3">
                    {isEditor ? (
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                    {QUICK_DELTAS.map((d) => (
                      <button
                        key={d}
                        onClick={() => adjustScore(p.id, d)}
                        className={`text-xs font-medium px-1.5 py-1 rounded-md border transition-colors ${
                          d > 0
                            ? "border-brand-100 text-brand-700 hover:bg-brand-50"
                            : "border-red-900 text-red-300 hover:bg-red-950"
                        }`}
                        aria-label={`${d > 0 ? "Add" : "Subtract"} ${Math.abs(d)} points to ${p.name}`}
                      >
                        {d > 0 ? `+${d}` : d}
                      </button>
                    ))}
                    <input
                      type="number"
                      value={customDelta[p.id] ?? ""}
                      onChange={(e) => setCustomDelta((c) => ({ ...c, [p.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && applyCustom(p.id)}
                      placeholder="±n"
                      className="w-12 text-xs px-1.5 py-1 rounded-md border border-brand-100 bg-brand-50 text-brand-900 placeholder:text-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-400"
                      aria-label={`Custom point change for ${p.name}`}
                    />
                    <button
                      onClick={() => applyCustom(p.id)}
                      className="text-xs font-medium px-2 py-1 rounded-md border border-brand-100 text-brand-600 hover:bg-brand-50"
                    >
                      apply
                    </button>
                    <button
                      onClick={() => removeParticipant(p.id, p.name)}
                      className="text-xs px-1.5 py-1 rounded-md text-brand-400 opacity-0 group-hover:opacity-100 hover:text-red-300 transition-all"
                      aria-label={`Remove ${p.name}`}
                      title="Remove participant"
                    >
                      ×
                    </button>
                      </div>
                    ) : (
                      <span className="text-xs text-brand-400">Editor access required</span>
                    )}
                  </td>
                </tr>
              );
            })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-center gap-3 mb-8 text-sm text-brand-600">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-brand-100 disabled:opacity-30 hover:bg-brand-50"
            >
              Prev
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-brand-100 disabled:opacity-30 hover:bg-brand-50"
            >
              Next
            </button>
          </div>
        )}

        {/* add participants */}
        {isEditor ? (
        <div className="ui-depth bg-brand-950 rounded-2xl border border-brand-100 shadow-card p-4 sm:p-5">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setAddMode("single")}
              className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                addMode === "single"
                  ? "bg-brand-600 text-white"
                  : "text-brand-600 hover:bg-brand-50"
              }`}
            >
              Add one
            </button>
            <button
              onClick={() => setAddMode("bulk")}
              className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                addMode === "bulk" ? "bg-brand-600 text-white" : "text-brand-600 hover:bg-brand-50"
              }`}
            >
              Bulk add (100+)
            </button>
          </div>

          {addMode === "single" ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={singleName}
                onChange={(e) => setSingleName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSingle()}
                placeholder="Participant name"
                className="flex-1 text-sm px-3 py-2 rounded-lg border border-brand-200 bg-brand-50/50 text-brand-900 placeholder:text-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              <TeamSelect value={singleTeam} onChange={setSingleTeam} />
              <button
                onClick={addSingle}
                disabled={adding || !singleName.trim()}
                className="text-sm font-medium px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Add
              </button>
            </div>
          ) : (
            <div>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={"One name per line, e.g.\nAarav Sharma\nDiya Patel\nRohan Mehta"}
                rows={6}
                className="w-full text-sm px-3 py-2 rounded-lg border border-brand-200 bg-brand-50/50 text-brand-900 placeholder:text-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400 mb-2"
              />
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <span className="text-xs text-brand-400">
                  {bulkText.split("\n").map((n) => n.trim()).filter(Boolean).length} name(s)
                  detected · assign them all to:
                </span>
                <TeamSelect value={bulkTeam} onChange={setBulkTeam} />
                <button
                  onClick={addBulk}
                  disabled={adding || !bulkText.trim()}
                  className="text-sm font-medium px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors sm:ml-auto"
                >
                  Add all
                </button>
              </div>
            </div>
          )}
        </div>
        ) : (
          <div className="ui-depth bg-brand-950 rounded-2xl border border-brand-100 shadow-card p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex-1">
                <p className="text-sm font-semibold text-brand-900">Editor access</p>
                <p className="text-xs text-brand-400 mt-1">
                  Viewing is public. Only approved coordinators can edit the leaderboard.
                </p>
              </div>
              <input
                type="password"
                value={adminKeyInput}
                onChange={(e) => setAdminKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && unlockEditor()}
                placeholder="Editor key"
                className="text-sm px-3 py-2 rounded-lg border border-brand-200 bg-brand-50/50 text-brand-900 placeholder:text-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
                aria-label="Editor key"
              />
              <button
                onClick={unlockEditor}
                disabled={!adminKeyInput.trim()}
                className="text-sm font-medium px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Unlock editing
              </button>
            </div>
            {unlockError && <p className="text-xs text-red-300 mt-3">{unlockError}</p>}
          </div>
        )}

        <p className="text-center text-xs text-brand-400 mt-6">
          CodeGeeks · {participants?.length ?? 0} participant
          {participants?.length === 1 ? "" : "s"} · open to anyone with this link
        </p>
      </div>
    </main>
  );
}
