import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import Skeleton from "../components/ui/Skeleton";
import { useToast } from "../components/ui/ToastProvider";
import { apiFetch } from "../api";

function formatDashboardError(message) {
  const normalized = String(message || "").toLowerCase();
  if (normalized.includes("invalid or expired token") || normalized.includes("jwt") || normalized.includes("unauthorized")) {
    return "Authorization failed. Sign out and sign in again. If this continues, verify web and API use the same Supabase project keys.";
  }
  return message || "Failed to load sessions";
}

export default function DashboardPage({ session }) {
  const { pushToast } = useToast();
  const token = session?.access_token;
  const lastToastMessageRef = useRef("");
  const [sessions, setSessions] = useState([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const showError = useCallback(
    (message) => {
      setError(message);
      if (lastToastMessageRef.current !== message) {
        pushToast(message, "error");
        lastToastMessageRef.current = message;
      }
    },
    [pushToast],
  );

  const clearError = useCallback(() => {
    setError("");
    lastToastMessageRef.current = "";
  }, []);

  const loadSessions = useCallback(async () => {
    if (!token) {
      return;
    }
    clearError();
    setLoading(true);
    try {
      const data = await apiFetch("/api/sessions", token);
      setSessions(data.sessions || []);
    } catch (err) {
      const message = formatDashboardError(err.message);
      showError(message);
    } finally {
      setLoading(false);
    }
  }, [clearError, showError, token]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  async function createSession(event) {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }

    setSubmitting(true);
    clearError();
    try {
      await apiFetch("/api/sessions", token, {
        method: "POST",
        body: { title: title.trim() },
      });
      setTitle("");
      pushToast("Session created", "success");
      await loadSessions();
    } catch (err) {
      const message = formatDashboardError(err.message || "Failed to create session");
      showError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="panel">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Dashboard</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">Welcome, {session?.user?.email}</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">Create sessions, record chunks, and monitor processing status.</p>
      </section>

      <section className="panel space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Create Session</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Start a new meeting workspace for chunked transcription.</p>
        </div>
        <form onSubmit={createSession} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Weekly product sync"
            required
            className="input-base"
          />
          <button type="submit" disabled={submitting} className="btn-primary sm:w-auto">
            {submitting ? "Creating..." : "Create"}
          </button>
        </form>
        {error ? <div className="alert-error">{error}</div> : null}
      </section>

      <section id="sessions" className="panel space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Your Sessions</h3>
          <button type="button" onClick={loadSessions} className="btn-secondary">
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        ) : null}

        {!loading && sessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
            No sessions yet. Create your first session above.
          </div>
        ) : null}

        {!loading && sessions.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sessions.map((item) => (
              <Link
                key={item.id}
                to={`/sessions/${item.id}`}
                className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:bg-slate-900"
              >
                <h4 className="text-base font-semibold text-slate-900 dark:text-white">{item.title}</h4>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-300">Chunks: {item.chunk_count}</p>
                <p className="text-xs text-slate-500 dark:text-slate-300">Summarized: {item.summarized_chunk_count}</p>
              </Link>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
