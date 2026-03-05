import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Clock3, Search } from "lucide-react";

import { apiFetch } from "../api";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Skeleton from "../components/ui/Skeleton";
import { useToast } from "../components/ui/ToastProvider";

function formatError(message) {
  const normalized = String(message || "").toLowerCase();
  if (normalized.includes("invalid or expired token") || normalized.includes("jwt") || normalized.includes("unauthorized")) {
    return "Authorization failed. Sign out and sign in again. If this continues, verify web and API use the same Supabase project keys.";
  }
  return message || "Failed to load sessions";
}

export default function SessionsPage({ session }) {
  const token = session?.access_token;
  const { pushToast } = useToast();
  const lastToastMessageRef = useRef("");

  const [sessions, setSessions] = useState([]);
  const [search, setSearch] = useState("");
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
      showError(formatError(err.message));
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
      showError(formatError(err.message || "Failed to create session"));
    } finally {
      setSubmitting(false);
    }
  }

  const filteredSessions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return sessions;
    }
    return sessions.filter((item) => item.title.toLowerCase().includes(query) || item.id.toLowerCase().includes(query));
  }, [search, sessions]);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge tone="brand">Sessions</Badge>
            <h1 className="mt-3 text-3xl">Meeting library</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">Create and browse sessions. Open any session to record chunks and read transcript summaries.</p>
          </div>
          <Button variant="secondary" onClick={loadSessions}>Refresh</Button>
        </div>
      </Card>

      <Card className="space-y-4 p-6">
        <h3>Create a new session</h3>
        <form onSubmit={createSession} className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Architecture review"
            required
          />
          <Button type="submit" disabled={submitting} className="sm:min-w-[128px]">
            {submitting ? "Creating..." : "Create"}
          </Button>
        </form>
      </Card>

      <Card className="space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3>All sessions</h3>
          <div className="relative w-full sm:w-[280px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title or id"
              className="pl-9"
            />
          </div>
        </div>

        {error ? <div className="alert-error">{error}</div> : null}

        {loading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : null}

        {!loading && filteredSessions.length === 0 ? (
          <Card variant="glass" className="border-dashed p-7 text-center">
            <p className="text-sm text-muted">No matching sessions found.</p>
          </Card>
        ) : null}

        {!loading && filteredSessions.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredSessions.map((item) => (
              <Link key={item.id} to={`/sessions/${item.id}`}>
                <Card className="h-full p-5">
                  <h4 className="text-base font-semibold text-foreground">{item.title}</h4>
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted">
                    <Clock3 className="h-4 w-4" />
                    {item.chunk_count} chunks
                  </div>
                  <p className="mt-1 text-sm text-muted">{item.summarized_chunk_count} summarized</p>
                  <p className="mt-3 line-clamp-1 text-xs text-muted">{item.id}</p>
                </Card>
              </Link>
            ))}
          </div>
        ) : null}
      </Card>
    </div>
  );
}