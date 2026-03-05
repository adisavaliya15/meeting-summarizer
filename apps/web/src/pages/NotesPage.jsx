import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, RefreshCw, Sparkles, Trash2 } from "lucide-react";

import { apiFetch } from "../api";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Input from "../components/ui/Input";
import Skeleton from "../components/ui/Skeleton";
import Textarea from "../components/ui/Textarea";
import { useToast } from "../components/ui/ToastProvider";

const AUTOSAVE_DELAY_MS = 1200;
const DEFAULT_NOTE_TITLE = "Untitled note";

function formatSavedAt(value) {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toLocaleString();
}

function summaryFromNote(note) {
  const value = note?.summary;
  return value && typeof value === "object" ? value : null;
}

function SummaryList({ title, items }) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <Card variant="glass" className="p-4">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <ul className="mt-3 space-y-2 text-sm text-muted">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-2">
            <span className="mt-1.5 inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            <span>{String(item || "").trim() || "-"}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function NotesPage({ session }) {
  const token = session?.access_token;
  const { pushToast } = useToast();

  const [notes, setNotes] = useState([]);
  const [selectedNoteId, setSelectedNoteId] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");

  const autosaveTimerRef = useRef(null);
  const saveRequestSeqRef = useRef(0);
  const selectedNoteIdRef = useRef("");
  const titleRef = useRef("");
  const contentRef = useRef("");

  const selectedNote = useMemo(
    () => notes.find((item) => item.id === selectedNoteId) || null,
    [notes, selectedNoteId],
  );

  useEffect(() => {
    selectedNoteIdRef.current = selectedNoteId;
  }, [selectedNoteId]);

  function calculateDirty(nextTitle, nextContent, baseNote) {
    if (!baseNote) {
      return false;
    }
    return nextTitle !== (baseNote.title || "") || nextContent !== (baseNote.content || "");
  }

  function applySelectedDraft(note) {
    const title = note?.title || "";
    const content = note?.content || "";
    setDraftTitle(title);
    setDraftContent(content);
    titleRef.current = title;
    contentRef.current = content;
    setIsDirty(false);
    setSaveError("");
  }

  const createNote = useCallback(
    async (title = DEFAULT_NOTE_TITLE) => {
      if (!token) {
        return null;
      }
      const payloadTitle = String(title || "").trim() || DEFAULT_NOTE_TITLE;
      const data = await apiFetch("/api/notes", token, {
        method: "POST",
        body: { title: payloadTitle },
      });
      return data.note || null;
    },
    [token],
  );

  const loadNotes = useCallback(
    async ({ allowAutoCreate = true } = {}) => {
      if (!token) {
        return;
      }

      setLoading(true);
      setError("");
      try {
        const data = await apiFetch("/api/notes", token);
        let rows = data.notes || [];

        if (rows.length === 0 && allowAutoCreate) {
          const created = await createNote(DEFAULT_NOTE_TITLE);
          rows = created ? [created] : [];
        }

        setNotes(rows);

        const preferredId = rows.some((row) => row.id === selectedNoteIdRef.current)
          ? selectedNoteIdRef.current
          : rows[0]?.id || "";
        setSelectedNoteId(preferredId);

        const selected = rows.find((row) => row.id === preferredId) || null;
        applySelectedDraft(selected);
      } catch (err) {
        setError(err.message || "Failed to load notes");
      } finally {
        setLoading(false);
      }
    },
    [createNote, token],
  );

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const persistNote = useCallback(
    async (noteId, title, content) => {
      if (!token || !noteId) {
        return null;
      }
      const requestSeq = ++saveRequestSeqRef.current;
      setIsSaving(true);

      try {
        const data = await apiFetch(`/api/notes/${noteId}`, token, {
          method: "PUT",
          body: { title, content },
        });
        if (requestSeq !== saveRequestSeqRef.current) {
          return data.note || null;
        }

        const row = data.note || null;
        if (!row) {
          return null;
        }

        setNotes((previous) => {
          const next = previous.map((item) => (item.id === row.id ? row : item));
          next.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
          return next;
        });

        if (row.id === selectedNoteIdRef.current) {
          applySelectedDraft(row);
        }

        return row;
      } catch (err) {
        if (requestSeq === saveRequestSeqRef.current) {
          setSaveError(err.message || "Autosave failed");
        }
        throw err;
      } finally {
        if (requestSeq === saveRequestSeqRef.current) {
          setIsSaving(false);
        }
      }
    },
    [token],
  );

  useEffect(() => {
    if (loading || !isDirty || !selectedNoteId) {
      return undefined;
    }

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      persistNote(selectedNoteId, titleRef.current, contentRef.current).catch(() => undefined);
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [draftContent, draftTitle, isDirty, loading, persistNote, selectedNoteId]);

  useEffect(
    () => () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    },
    [],
  );

  async function flushCurrentNote() {
    if (!isDirty || !selectedNoteId) {
      return null;
    }
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    return persistNote(selectedNoteId, titleRef.current, contentRef.current);
  }

  function handleTitleChange(event) {
    const nextTitle = event.target.value;
    titleRef.current = nextTitle;
    setDraftTitle(nextTitle);
    setSaveError("");
    setError("");
    setIsDirty(calculateDirty(nextTitle, contentRef.current, selectedNote));
  }

  function handleContentChange(event) {
    const nextContent = event.target.value;
    contentRef.current = nextContent;
    setDraftContent(nextContent);
    setSaveError("");
    setError("");
    setIsDirty(calculateDirty(titleRef.current, nextContent, selectedNote));
  }

  function handleBlur() {
    flushCurrentNote().catch(() => undefined);
  }

  async function selectNote(nextNoteId) {
    if (!nextNoteId || nextNoteId === selectedNoteId) {
      return;
    }

    try {
      await flushCurrentNote();
    } catch {
      return;
    }

    const next = notes.find((item) => item.id === nextNoteId) || null;
    setSelectedNoteId(nextNoteId);
    applySelectedDraft(next);
  }

  async function handleCreateNote() {
    if (!token || isCreating) {
      return;
    }

    try {
      await flushCurrentNote();
      setIsCreating(true);
      setError("");
      const created = await createNote(DEFAULT_NOTE_TITLE);
      if (!created) {
        return;
      }
      setNotes((previous) => [created, ...previous]);
      setSelectedNoteId(created.id);
      applySelectedDraft(created);
      pushToast("Note created", "success");
    } catch (err) {
      const message = err.message || "Failed to create note";
      setError(message);
      pushToast(message, "error");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDeleteNote() {
    if (!token || !selectedNoteId || isDeleting) {
      return;
    }

    try {
      setIsDeleting(true);
      setError("");
      await apiFetch(`/api/notes/${selectedNoteId}`, token, { method: "DELETE" });

      const remaining = notes.filter((item) => item.id !== selectedNoteId);
      if (remaining.length === 0) {
        const created = await createNote(DEFAULT_NOTE_TITLE);
        const rows = created ? [created] : [];
        setNotes(rows);
        setSelectedNoteId(rows[0]?.id || "");
        applySelectedDraft(rows[0] || null);
      } else {
        setNotes(remaining);
        setSelectedNoteId(remaining[0].id);
        applySelectedDraft(remaining[0]);
      }

      pushToast("Note deleted", "success");
    } catch (err) {
      const message = err.message || "Failed to delete note";
      setError(message);
      pushToast(message, "error");
    } finally {
      setIsDeleting(false);
    }
  }

  async function summarizeSelectedNote() {
    if (!token || !selectedNoteId || isSummarizing) {
      return;
    }
    setError("");

    if (!contentRef.current.trim()) {
      const message = "Write some content before summarizing.";
      setError(message);
      pushToast(message, "error");
      return;
    }

    try {
      await flushCurrentNote();
      setIsSummarizing(true);
      const data = await apiFetch(`/api/notes/${selectedNoteId}/summarize`, token, { method: "POST" });
      const row = data.note || null;
      if (!row) {
        return;
      }
      setNotes((previous) => {
        const next = previous.map((item) => (item.id === row.id ? row : item));
        next.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        return next;
      });
      if (row.id === selectedNoteId) {
        applySelectedDraft(row);
      }
      pushToast("Note summarized", "success");
    } catch (err) {
      const message = err.message || "Failed to summarize note";
      setError(message);
      pushToast(message, "error");
    } finally {
      setIsSummarizing(false);
    }
  }

  const saveStatus = useMemo(() => {
    if (loading) {
      return "Loading notes...";
    }
    if (!selectedNote) {
      return "No note selected";
    }
    if (isSummarizing) {
      return "Summarizing...";
    }
    if (isSaving) {
      return "Saving...";
    }
    if (saveError) {
      return "Save failed";
    }
    if (isDirty) {
      return "Unsaved changes";
    }
    const savedAt = formatSavedAt(selectedNote.updated_at);
    return savedAt ? `Saved ${savedAt}` : "Ready";
  }, [isDirty, isSaving, isSummarizing, loading, saveError, selectedNote]);

  const summary = summaryFromNote(selectedNote);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge tone="brand">Manual Notes</Badge>
            <h1 className="mt-3 text-3xl">Notes by topic</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Create multiple named notes, edit anytime, autosave continuously, and summarize only when needed.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={loadNotes} disabled={loading || isSaving || isSummarizing}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button variant="secondary" size="sm" onClick={handleCreateNote} disabled={loading || isCreating || isSaving || isSummarizing}>
              <Plus className="h-4 w-4" />
              {isCreating ? "Creating..." : "New Note"}
            </Button>
            <Button size="sm" onClick={summarizeSelectedNote} disabled={loading || !selectedNoteId || isSaving || isSummarizing || !draftContent.trim()}>
              <Sparkles className="h-4 w-4" />
              {isSummarizing ? "Summarizing..." : "Summarize"}
            </Button>
          </div>
        </div>
      </Card>

      {error ? <div className="alert-error">{error}</div> : null}
      {saveError ? <div className="alert-error">{saveError}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3>All Notes</h3>
            <Badge tone="neutral">{notes.length}</Badge>
          </div>

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : null}

          {!loading && notes.length === 0 ? (
            <EmptyState
              title="No notes yet"
              description="Create your first note to get started."
              action={
                <Button size="sm" onClick={handleCreateNote}>
                  <Plus className="h-4 w-4" />
                  New Note
                </Button>
              }
            />
          ) : null}

          {!loading && notes.length > 0 ? (
            <div className="max-h-[560px] space-y-2 overflow-auto pr-1">
              {notes.map((item) => {
                const isActive = item.id === selectedNoteId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectNote(item.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      isActive
                        ? "border-primary bg-primary-soft"
                        : "border-default bg-panel hover:bg-panel-2"
                    }`}
                  >
                    <p className="truncate text-sm font-semibold text-foreground">{item.title || DEFAULT_NOTE_TITLE}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted">{item.content || "No content yet."}</p>
                    <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-muted">{formatSavedAt(item.updated_at) || "Just now"}</p>
                  </button>
                );
              })}
            </div>
          ) : null}
        </Card>

        <div className="space-y-6">
          <Card className="space-y-3 p-6">
            <div className="flex items-center justify-between gap-3">
              <h3>Editor</h3>
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{saveStatus}</p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteNote}
                  disabled={!selectedNoteId || loading || isDeleting || isSaving || isSummarizing}
                >
                  <Trash2 className="h-4 w-4" />
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-10" />
                <Skeleton className="h-[420px]" />
              </div>
            ) : !selectedNote ? (
              <EmptyState title="No note selected" description="Choose or create a note." />
            ) : (
              <>
                <Input
                  value={draftTitle}
                  onChange={handleTitleChange}
                  onBlur={handleBlur}
                  maxLength={200}
                  placeholder="Note title"
                />
                <Textarea
                  value={draftContent}
                  onChange={handleContentChange}
                  onBlur={handleBlur}
                  placeholder="Type your note..."
                  className="min-h-[420px] text-sm leading-7"
                />
              </>
            )}
          </Card>

          <Card className="space-y-4 p-6">
            <h3>Summary</h3>

            {!selectedNote ? (
              <EmptyState title="No note selected" description="Select a note to see summary." />
            ) : !summary ? (
              <Card variant="glass" className="border-dashed p-6 text-center">
                <p className="text-sm text-muted">No summary yet. Click Summarize for this note.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card variant="glass" className="p-4">
                  <h4 className="text-sm font-semibold text-foreground">Overview</h4>
                  <p className="mt-2 text-sm leading-7 text-muted">{summary.summary || "-"}</p>
                </Card>

                <div className="grid gap-3 lg:grid-cols-2">
                  <SummaryList title="Key Points" items={summary.key_points} />
                  <SummaryList title="Action Items" items={summary.action_items} />
                  <SummaryList title="Open Questions" items={summary.open_questions} />
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
