import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowRight, FileText, FolderOpenDot } from "lucide-react";

import { apiFetch } from "../api";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Skeleton from "../components/ui/Skeleton";
import { useToast } from "../components/ui/ToastProvider";

function formatDashboardError(message) {
  const normalized = String(message || "").toLowerCase();
  if (normalized.includes("invalid or expired token") || normalized.includes("jwt") || normalized.includes("unauthorized")) {
    return "Authorization failed. Sign out and sign in again. If this continues, verify web and API use the same Supabase project keys.";
  }
  return message || "Failed to load sessions";
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <Card variant="bento" className="p-5">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </Card>
  );
}

export default function DashboardPage({ session }) {
  const { pushToast } = useToast();
  const token = session?.access_token;
  const lastToastMessageRef = useRef("");

  const [sessions, setSessions] = useState([]);
  const [notesCount, setNotesCount] = useState(0);
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

  const loadWorkspaceData = useCallback(async () => {
    if (!token) {
      return;
    }
    clearError();
    setLoading(true);

    try {
      const [sessionsResult, notesResult] = await Promise.allSettled([
        apiFetch("/api/sessions", token),
        apiFetch("/api/notes", token),
      ]);

      if (sessionsResult.status === "rejected") {
        throw sessionsResult.reason;
      }

      setSessions(sessionsResult.value.sessions || []);

      if (notesResult.status === "fulfilled") {
        setNotesCount((notesResult.value.notes || []).length);
      } else {
        setNotesCount(0);
      }
    } catch (err) {
      showError(formatDashboardError(err.message));
    } finally {
      setLoading(false);
    }
  }, [clearError, showError, token]);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

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
      await loadWorkspaceData();
    } catch (err) {
      showError(formatDashboardError(err.message || "Failed to create session"));
    } finally {
      setSubmitting(false);
    }
  }

  const summarizedCount = useMemo(
    () => sessions.reduce((sum, item) => sum + Number(item.summarized_chunk_count || 0), 0),
    [sessions],
  );

  return (
    <div className="space-y-6">
      <Card variant="panel" className="aurora-block p-7">
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge tone="brand">Workspace</Badge>
            <h1 className="mt-4 text-3xl">Welcome, {session?.user?.email}</h1>
            <p className="mt-3 max-w-2xl text-sm text-muted">
              Create sessions, record chunked audio, and track transcript and summary progress in one calm workflow.
            </p>
          </div>
          <Link to="/sessions">
            <Button variant="secondary">
              View all sessions
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={FolderOpenDot} label="Sessions" value={sessions.length} />
        <StatCard icon={Activity} label="Summaries" value={summarizedCount} />
        <StatCard icon={FileText} label="Notes" value={notesCount} />
      </div>

      <Card className="space-y-4 p-6">
        <div>
          <h3>Create Session</h3>
          <p className="mt-2 text-sm text-muted">Start a new meeting workspace for chunked transcription and summaries.</p>
        </div>

        <form onSubmit={createSession} className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Weekly product sync"
            required
          />
          <Button type="submit" disabled={submitting} className="sm:min-w-[128px]">
            {submitting ? "Creating..." : "Create"}
          </Button>
        </form>

        {error ? <div className="alert-error">{error}</div> : null}
      </Card>

      <Card className="space-y-4 p-6" id="sessions">
        <div className="flex items-center justify-between gap-3">
          <h3>Recent sessions</h3>
          <Button variant="secondary" size="sm" onClick={loadWorkspaceData}>
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : null}

        {!loading && sessions.length === 0 ? (
          <Card variant="glass" className="border-dashed p-8 text-center">
            <p className="text-sm text-muted">No sessions yet. Create your first session above.</p>
          </Card>
        ) : null}

        {!loading && sessions.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sessions.slice(0, 6).map((item) => (
              <Link key={item.id} to={`/sessions/${item.id}`}>
                <Card className="h-full p-5">
                  <p className="text-base font-semibold text-foreground">{item.title}</p>
                  <p className="mt-2 text-sm text-muted">Chunks: {item.chunk_count}</p>
                  <p className="text-sm text-muted">Summarized: {item.summarized_chunk_count}</p>
                </Card>
              </Link>
            ))}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
