import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { apiFetch } from "../api";
import { supabase } from "../supabase";

export default function DashboardPage({ session }) {
  const token = session?.access_token;
  const [sessions, setSessions] = useState([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadSessions = useCallback(async () => {
    if (!token) {
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch("/api/sessions", token);
      setSessions(data.sessions || []);
    } catch (err) {
      setError(err.message || "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  async function createSession(event) {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await apiFetch("/api/sessions", token, {
        method: "POST",
        body: { title: title.trim() },
      });
      setTitle("");
      await loadSessions();
    } catch (err) {
      setError(err.message || "Failed to create session");
    } finally {
      setSubmitting(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="page">
      <header className="header card">
        <div>
          <h1>Dashboard</h1>
          <p>Signed in as {session?.user?.email}</p>
        </div>
        <button className="secondary" onClick={signOut}>
          Sign Out
        </button>
      </header>

      <section className="card">
        <h2>Create Session</h2>
        <form className="inline-form" onSubmit={createSession}>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Weekly product sync"
            required
          />
          <button type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create"}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Your Sessions</h2>
        {error && <div className="error">{error}</div>}
        {loading ? <p>Loading sessions...</p> : null}
        {!loading && sessions.length === 0 ? <p>No sessions yet.</p> : null}
        <ul className="session-list">
          {sessions.map((item) => (
            <li key={item.id}>
              <Link to={`/sessions/${item.id}`}>{item.title}</Link>
              <span>
                Chunks: {item.chunk_count} | Summarized: {item.summarized_chunk_count}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}