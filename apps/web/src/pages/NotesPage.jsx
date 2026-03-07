import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlignJustify,
  Bold,
  CheckSquare,
  Clock3,
  Code2,
  Download,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Plus,
  Quote,
  Redo2,
  RefreshCw,
  Sparkles,
  Trash2,
  Undo2,
} from "lucide-react";

import { apiFetch } from "../api";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/DropdownMenu";
import EmptyState from "../components/ui/EmptyState";
import Input from "../components/ui/Input";
import Skeleton from "../components/ui/Skeleton";
import Textarea from "../components/ui/Textarea";
import { useToast } from "../components/ui/ToastProvider";

const AUTOSAVE_DELAY_MS = 1200;
const SUMMARY_POLL_INTERVAL_MS = 2500;
const SUMMARY_POLL_ATTEMPTS = 48;
const HISTORY_LIMIT = 100;
const DEFAULT_NOTE_TITLE = "Untitled note";
const STRUCTURED_LINE_RE =
  /^(#{1,6}\s|>\s|[-*+]\s|\d+[.)]\s|- \[[ xX]\]\s|```|~~~|\|.*\||={3,}|-{3,}|\*{3,}|_{3,})/;

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

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function countWords(text) {
  const normalized = String(text || "").trim();
  if (!normalized) {
    return 0;
  }
  return normalized.split(/\s+/).length;
}

function isStructuredLine(line) {
  const trimmed = String(line || "").trimStart();
  return STRUCTURED_LINE_RE.test(trimmed) || /^\s{4,}\S/.test(line || "");
}

function reflowPlainTextBlock(block) {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return block;
  }

  return lines.join(" ").replace(/\s+([,.;:!?])/g, "$1");
}

function normalizePastedText(text) {
  const normalized = String(text || "").replace(/\r\n?/g, "\n");
  if (!normalized.includes("\n")) {
    return normalized;
  }

  const blocks = normalized
    .split(/\n\s*\n/)
    .map((block) =>
      block
        .split("\n")
        .map((line) => line.replace(/[ \t]+$/g, ""))
        .join("\n"),
    );

  return blocks
    .map((block) => {
      const lines = block.split("\n").filter((line) => line.trim().length > 0);
      if (lines.length === 0) {
        return "";
      }
      if (lines.some((line) => isStructuredLine(line))) {
        return block;
      }
      return reflowPlainTextBlock(block);
    })
    .join("\n\n")
    .trim();
}

function sanitizeFileName(value) {
  const cleaned = String(value || DEFAULT_NOTE_TITLE)
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || "note";
}

function isSummaryStale(note, isDirty) {
  if (!note?.summary) {
    return false;
  }
  if (isDirty) {
    return true;
  }
  const updatedAtMs = note?.updated_at ? new Date(note.updated_at).getTime() : 0;
  const summarizedAtMs = note?.summarized_at ? new Date(note.summarized_at).getTime() : 0;
  return Boolean(updatedAtMs && summarizedAtMs && updatedAtMs > summarizedAtMs);
}

function buildSummaryText(summary) {
  if (!summary) {
    return "";
  }

  const sections = [];
  if (summary.summary) {
    sections.push(`Summary\n${summary.summary}`);
  }

  const lists = [
    ["Key Points", summary.key_points],
    ["Action Items", summary.action_items],
    ["Open Questions", summary.open_questions],
  ];

  lists.forEach(([title, items]) => {
    if (!Array.isArray(items) || items.length === 0) {
      return;
    }
    sections.push(`${title}\n${items.map((item) => `- ${item}`).join("\n")}`);
  });

  return sections.join("\n\n").trim();
}

function buildNoteExportText(title, content, summary, stale) {
  const parts = [
    `Title: ${title || DEFAULT_NOTE_TITLE}`,
    "",
    "Content",
    content || "",
  ];

  const summaryText = buildSummaryText(summary);
  if (summaryText) {
    parts.push("", `Summary${stale ? " (stale)" : ""}`, summaryText);
  }

  return parts.join("\n").trim();
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function createWordHtml(title, content, summaryText, stale) {
  const safeTitle = String(title || DEFAULT_NOTE_TITLE)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const safeContent = String(content || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br />");
  const safeSummary = String(summaryText || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br />");

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${safeTitle}</title>
  </head>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; padding: 24px;">
    <h1>${safeTitle}</h1>
    <h2>Content</h2>
    <p>${safeContent}</p>
    ${safeSummary ? `<h2>Summary${stale ? " (stale)" : ""}</h2><p>${safeSummary}</p>` : ""}
  </body>
</html>`;
}

function openPrintWindow(title, content, summaryText, stale) {
  const popup = window.open("", "_blank", "noopener,noreferrer,width=1024,height=768");
  if (!popup) {
    throw new Error("Popup blocked. Allow popups to export PDF.");
  }

  const html = createWordHtml(title, content, summaryText, stale);
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  setTimeout(() => {
    popup.print();
  }, 250);
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
  const [isJustified, setIsJustified] = useState(false);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");

  const autosaveTimerRef = useRef(null);
  const saveRequestSeqRef = useRef(0);
  const selectedNoteIdRef = useRef("");
  const titleRef = useRef("");
  const contentRef = useRef("");
  const editorRef = useRef(null);
  const historyRef = useRef({});

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

  function resetHistoryForNote(noteId, title, content) {
    if (!noteId) {
      return;
    }
    historyRef.current[noteId] = {
      past: [],
      present: { title, content },
      future: [],
    };
  }

  function getHistoryForNote(noteId) {
    if (!noteId) {
      return null;
    }
    if (!historyRef.current[noteId]) {
      resetHistoryForNote(noteId, titleRef.current, contentRef.current);
    }
    return historyRef.current[noteId];
  }

  function setDraftState(nextTitle, nextContent, options = {}) {
    const {
      baseNote = selectedNote,
      markClean = false,
      selectionStart,
      selectionEnd = selectionStart,
    } = options;

    titleRef.current = nextTitle;
    contentRef.current = nextContent;
    setDraftTitle(nextTitle);
    setDraftContent(nextContent);
    setSaveError("");
    setError("");
    setIsDirty(markClean ? false : calculateDirty(nextTitle, nextContent, baseNote));

    if (typeof selectionStart === "number") {
      requestAnimationFrame(() => {
        const editor = editorRef.current;
        if (!editor) {
          return;
        }
        editor.focus();
        editor.setSelectionRange(selectionStart, selectionEnd);
      });
    }
  }

  function loadNoteIntoEditor(note) {
    const title = note?.title || "";
    const content = note?.content || "";
    resetHistoryForNote(note?.id, title, content);
    setDraftState(title, content, { baseNote: note, markClean: true });
  }

  function pushHistorySnapshot(nextTitle, nextContent) {
    const noteId = selectedNoteIdRef.current;
    const history = getHistoryForNote(noteId);
    if (!history) {
      return;
    }

    const current = history.present || { title: titleRef.current, content: contentRef.current };
    if (current.title === nextTitle && current.content === nextContent) {
      return;
    }

    history.past = [...history.past.slice(-(HISTORY_LIMIT - 1)), current];
    history.present = { title: nextTitle, content: nextContent };
    history.future = [];
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

        const currentSelectedId = selectedNoteIdRef.current;
        const preferredId = rows.some((row) => row.id === currentSelectedId)
          ? currentSelectedId
          : rows[0]?.id || "";

        if (preferredId !== currentSelectedId) {
          selectedNoteIdRef.current = preferredId;
          setSelectedNoteId(preferredId);
          const selected = rows.find((row) => row.id === preferredId) || null;
          loadNoteIntoEditor(selected);
        } else if (!currentSelectedId && preferredId) {
          const selected = rows.find((row) => row.id === preferredId) || null;
          loadNoteIntoEditor(selected);
        }
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

        if (
          row.id === selectedNoteIdRef.current &&
          titleRef.current === (row.title || "") &&
          contentRef.current === (row.content || "")
        ) {
          const history = getHistoryForNote(row.id);
          if (history) {
            history.present = {
              title: row.title || "",
              content: row.content || "",
            };
          }
          setIsDirty(false);
          setSaveError("");
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
    pushHistorySnapshot(nextTitle, contentRef.current);
    setDraftState(nextTitle, contentRef.current);
  }

  function handleContentChange(event) {
    const nextContent = event.target.value;
    pushHistorySnapshot(titleRef.current, nextContent);
    setDraftState(titleRef.current, nextContent);
  }

  function handleBlur() {
    flushCurrentNote().catch(() => undefined);
  }

  function getEditorSelection() {
    const editor = editorRef.current;
    if (!editor) {
      const cursor = contentRef.current.length;
      return { start: cursor, end: cursor };
    }
    return {
      start: editor.selectionStart ?? 0,
      end: editor.selectionEnd ?? 0,
    };
  }

  function applyProgrammaticContent(nextContent, selectionStart, selectionEnd = selectionStart) {
    pushHistorySnapshot(titleRef.current, nextContent);
    setDraftState(titleRef.current, nextContent, { selectionStart, selectionEnd });
  }

  function replaceSelection(nextText) {
    const { start, end } = getEditorSelection();
    const text = contentRef.current;
    const nextContent = `${text.slice(0, start)}${nextText}${text.slice(end)}`;
    applyProgrammaticContent(nextContent, start, start + nextText.length);
  }

  function wrapSelection(prefix, suffix, placeholder) {
    if (!selectedNoteId) {
      return;
    }
    const { start, end } = getEditorSelection();
    const text = contentRef.current;
    const selected = text.slice(start, end);
    const insertValue = selected || placeholder;
    const before = text.slice(0, start);
    const after = text.slice(end);
    const next = `${before}${prefix}${insertValue}${suffix}${after}`;

    if (selected) {
      const nextStart = start + prefix.length;
      const nextEnd = nextStart + selected.length;
      applyProgrammaticContent(next, nextStart, nextEnd);
      return;
    }

    const nextStart = start + prefix.length;
    const nextEnd = nextStart + insertValue.length;
    applyProgrammaticContent(next, nextStart, nextEnd);
  }

  function prefixSelectedLines(prefix) {
    if (!selectedNoteId) {
      return;
    }
    const { start, end } = getEditorSelection();
    const text = contentRef.current;
    const blockStart = text.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const blockEndIdx = text.indexOf("\n", end);
    const blockEnd = blockEndIdx === -1 ? text.length : blockEndIdx;
    const block = text.slice(blockStart, blockEnd);
    const lines = block.split("\n").map((line) => `${prefix}${line}`);
    const replacedBlock = lines.join("\n");
    const next = `${text.slice(0, blockStart)}${replacedBlock}${text.slice(blockEnd)}`;
    applyProgrammaticContent(next, blockStart, blockStart + replacedBlock.length);
  }

  function numberSelectedLines() {
    if (!selectedNoteId) {
      return;
    }
    const { start, end } = getEditorSelection();
    const text = contentRef.current;
    const blockStart = text.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const blockEndIdx = text.indexOf("\n", end);
    const blockEnd = blockEndIdx === -1 ? text.length : blockEndIdx;
    const block = text.slice(blockStart, blockEnd);
    const lines = block.split("\n").map((line, index) => `${index + 1}. ${line}`);
    const replacedBlock = lines.join("\n");
    const next = `${text.slice(0, blockStart)}${replacedBlock}${text.slice(blockEnd)}`;
    applyProgrammaticContent(next, blockStart, blockStart + replacedBlock.length);
  }

  function insertLink() {
    if (!selectedNoteId) {
      return;
    }
    const { start, end } = getEditorSelection();
    const text = contentRef.current;
    const selected = text.slice(start, end);
    const label = selected || "link text";
    const snippet = `[${label}](https://)`;
    const before = text.slice(0, start);
    const after = text.slice(end);
    const next = `${before}${snippet}${after}`;
    const urlStart = before.length + label.length + 3;
    const urlEnd = urlStart + "https://".length;
    applyProgrammaticContent(next, urlStart, urlEnd);
  }

  function insertTimestamp() {
    if (!selectedNoteId) {
      return;
    }
    const { start, end } = getEditorSelection();
    const text = contentRef.current;
    const stamp = new Date().toLocaleString();
    const snippet = `[${stamp}] `;
    const next = `${text.slice(0, start)}${snippet}${text.slice(end)}`;
    const cursor = start + snippet.length;
    applyProgrammaticContent(next, cursor, cursor);
  }

  function insertMeetingTemplate() {
    if (!selectedNoteId) {
      return;
    }
    const template = [
      "## Agenda",
      "- ",
      "",
      "## Discussion Notes",
      "- ",
      "",
      "## Action Items",
      "- [ ] ",
      "",
      "## Open Questions",
      "- ",
      "",
    ].join("\n");
    const text = contentRef.current;
    const needsBreak = text.trim().length > 0 ? "\n\n" : "";
    const next = `${text}${needsBreak}${template}`;
    const start = text.length + needsBreak.length;
    applyProgrammaticContent(next, start, start + "## Agenda".length);
  }

  function reflowEditorText() {
    if (!selectedNoteId) {
      return;
    }

    const { start, end } = getEditorSelection();
    const text = contentRef.current;
    const hasSelection = end > start;
    const source = hasSelection ? text.slice(start, end) : text;
    const normalized = normalizePastedText(source);

    if (!normalized || normalized === source) {
      return;
    }

    if (hasSelection) {
      const next = `${text.slice(0, start)}${normalized}${text.slice(end)}`;
      applyProgrammaticContent(next, start, start + normalized.length);
      return;
    }

    applyProgrammaticContent(normalized, 0, normalized.length);
  }

  function handleContentPaste(event) {
    const pastedText = event.clipboardData?.getData("text/plain");
    if (!pastedText) {
      return;
    }

    const normalized = normalizePastedText(pastedText);
    if (!normalized || normalized === pastedText) {
      return;
    }

    event.preventDefault();
    replaceSelection(normalized);
  }

  function undoDraft() {
    const history = getHistoryForNote(selectedNoteIdRef.current);
    if (!history || history.past.length === 0) {
      return;
    }

    const previous = history.past[history.past.length - 1];
    history.past = history.past.slice(0, -1);
    history.future = [history.present, ...history.future].slice(0, HISTORY_LIMIT);
    history.present = previous;
    setDraftState(previous.title, previous.content, {
      selectionStart: previous.content.length,
      selectionEnd: previous.content.length,
    });
  }

  function redoDraft() {
    const history = getHistoryForNote(selectedNoteIdRef.current);
    if (!history || history.future.length === 0) {
      return;
    }

    const next = history.future[0];
    history.future = history.future.slice(1);
    history.past = [...history.past.slice(-(HISTORY_LIMIT - 1)), history.present];
    history.present = next;
    setDraftState(next.title, next.content, {
      selectionStart: next.content.length,
      selectionEnd: next.content.length,
    });
  }

  function handleEditorKeyDown(event) {
    if (!(event.ctrlKey || event.metaKey)) {
      return;
    }

    const key = event.key.toLowerCase();
    if (key === "z" && event.shiftKey) {
      event.preventDefault();
      redoDraft();
      return;
    }
    if (key === "z") {
      event.preventDefault();
      undoDraft();
      return;
    }
    if (key === "y") {
      event.preventDefault();
      redoDraft();
      return;
    }
    if (key === "b") {
      event.preventDefault();
      wrapSelection("**", "**", "bold text");
      return;
    }
    if (key === "i") {
      event.preventDefault();
      wrapSelection("_", "_", "italic text");
    }
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
    selectedNoteIdRef.current = nextNoteId;
    setSelectedNoteId(nextNoteId);
    loadNoteIntoEditor(next);
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
      selectedNoteIdRef.current = created.id;
      setSelectedNoteId(created.id);
      loadNoteIntoEditor(created);
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
      delete historyRef.current[selectedNoteId];

      if (remaining.length === 0) {
        const created = await createNote(DEFAULT_NOTE_TITLE);
        const rows = created ? [created] : [];
        setNotes(rows);
        const nextId = rows[0]?.id || "";
        selectedNoteIdRef.current = nextId;
        setSelectedNoteId(nextId);
        loadNoteIntoEditor(rows[0] || null);
      } else {
        setNotes(remaining);
        selectedNoteIdRef.current = remaining[0].id;
        setSelectedNoteId(remaining[0].id);
        loadNoteIntoEditor(remaining[0]);
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
      const noteId = selectedNoteId;
      await flushCurrentNote();
      setIsSummarizing(true);
      const requestStartedAtMs = Date.now();
      const data = await apiFetch(`/api/notes/${noteId}/summarize`, token, { method: "POST" });
      if (data?.already_queued) {
        pushToast("Summary is already in progress.", "info");
      } else {
        pushToast("Summary queued. Worker is processing it.", "info");
      }

      let summarizedNote = null;
      for (let attempt = 0; attempt < SUMMARY_POLL_ATTEMPTS; attempt += 1) {
        await delay(SUMMARY_POLL_INTERVAL_MS);
        const noteData = await apiFetch(`/api/notes/${noteId}`, token);
        const row = noteData.note || null;
        if (!row) {
          continue;
        }

        setNotes((previous) => {
          const exists = previous.some((item) => item.id === row.id);
          const next = exists
            ? previous.map((item) => (item.id === row.id ? row : item))
            : [row, ...previous];
          next.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
          return next;
        });

        const summarizedAtMs = row.summarized_at ? new Date(row.summarized_at).getTime() : 0;
        if (row.summary && summarizedAtMs >= requestStartedAtMs - 1000) {
          summarizedNote = row;
          break;
        }
      }

      if (summarizedNote) {
        pushToast("Note summarized", "success");
      } else {
        pushToast("Summary is still running. Refresh in a moment.", "info");
      }
    } catch (err) {
      const message = err.message || "Failed to summarize note";
      setError(message);
      pushToast(message, "error");
    } finally {
      setIsSummarizing(false);
    }
  }

  function exportAsTxt() {
    if (!selectedNoteId) {
      return;
    }
    const fileName = `${sanitizeFileName(draftTitle)}.txt`;
    const text = buildNoteExportText(draftTitle, draftContent, summaryFromNote(selectedNote), isSummaryStale(selectedNote, isDirty));
    downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), fileName);
    pushToast("TXT export created", "success");
  }

  function exportAsDoc() {
    if (!selectedNoteId) {
      return;
    }
    const summaryText = buildSummaryText(summaryFromNote(selectedNote));
    const html = createWordHtml(draftTitle, draftContent, summaryText, isSummaryStale(selectedNote, isDirty));
    downloadBlob(new Blob([html], { type: "application/msword;charset=utf-8" }), `${sanitizeFileName(draftTitle)}.doc`);
    pushToast("Word export created", "success");
  }

  function exportAsPdf() {
    if (!selectedNoteId) {
      return;
    }
    try {
      openPrintWindow(
        draftTitle,
        draftContent,
        buildSummaryText(summaryFromNote(selectedNote)),
        isSummaryStale(selectedNote, isDirty),
      );
      pushToast("Print dialog opened for PDF export", "info");
    } catch (err) {
      const message = err.message || "Failed to open PDF export";
      setError(message);
      pushToast(message, "error");
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
  const summaryStale = isSummaryStale(selectedNote, isDirty);
  const wordCount = useMemo(() => countWords(draftContent), [draftContent]);
  const lineCount = useMemo(() => (draftContent ? draftContent.split(/\r?\n/).length : 0), [draftContent]);
  const readingMinutes = useMemo(() => (wordCount > 0 ? Math.max(1, Math.ceil(wordCount / 200)) : 0), [wordCount]);
  const history = getHistoryForNote(selectedNoteId);
  const canUndo = Boolean(history?.past?.length);
  const canRedo = Boolean(history?.future?.length);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge tone="brand">Manual Notes</Badge>
            <h1 className="mt-3 text-3xl">Notes by topic</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Capture notes continuously, format quickly, export clean copies, and summarize only when needed.
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm" disabled={!selectedNoteId}>
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportAsTxt}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export as TXT
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportAsDoc}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export as Word
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={exportAsPdf}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" onClick={summarizeSelectedNote} disabled={loading || !selectedNoteId || isSaving || isSummarizing || !draftContent.trim()}>
              <Sparkles className="h-4 w-4" />
              {isSummarizing ? "Summarizing..." : "Summarize"}
            </Button>
          </div>
        </div>
      </Card>

      {error ? <div className="alert-error">{error}</div> : null}
      {saveError ? <div className="alert-error">{saveError}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
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
                const hasSummary = Boolean(item.summary);
                const stale = isSummaryStale(item, isActive ? isDirty : false);

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
                    <div className="flex items-start justify-between gap-3">
                      <p className="truncate text-sm font-semibold text-foreground">{item.title || DEFAULT_NOTE_TITLE}</p>
                      <div className="flex shrink-0 items-center gap-1">
                        {hasSummary ? <Badge tone={stale ? "warning" : "success"}>{stale ? "Stale" : "Summary"}</Badge> : null}
                      </div>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted">{item.content || "No content yet."}</p>
                    <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-muted">{formatSavedAt(item.updated_at) || "Just now"}</p>
                  </button>
                );
              })}
            </div>
          ) : null}
        </Card>

        <div className="space-y-6">
          <Card className="space-y-4 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <h3>Editor</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={saveError ? "danger" : isDirty ? "warning" : "success"}>{saveStatus}</Badge>
                  <Badge tone="neutral">{wordCount} words</Badge>
                  <Badge tone="neutral">{lineCount} lines</Badge>
                  <Badge tone="neutral">{draftContent.length} chars</Badge>
                  {readingMinutes ? <Badge tone="neutral">{readingMinutes} min read</Badge> : null}
                  {isJustified ? <Badge tone="brand">Justified</Badge> : null}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="ghost" size="sm" onClick={undoDraft} disabled={!selectedNoteId || !canUndo}>
                  <Undo2 className="h-4 w-4" />
                  Undo
                </Button>
                <Button variant="ghost" size="sm" onClick={redoDraft} disabled={!selectedNoteId || !canRedo}>
                  <Redo2 className="h-4 w-4" />
                  Redo
                </Button>
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

                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-default bg-panel-2 p-2">
                  <Button variant="ghost" size="sm" onClick={() => prefixSelectedLines("# ")} disabled={!selectedNoteId}>
                    <Heading1 className="h-4 w-4" />
                    H1
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => prefixSelectedLines("## ")} disabled={!selectedNoteId}>
                    <Heading2 className="h-4 w-4" />
                    H2
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => prefixSelectedLines("### ")} disabled={!selectedNoteId}>
                    <Heading3 className="h-4 w-4" />
                    H3
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => wrapSelection("**", "**", "bold text")} disabled={!selectedNoteId}>
                    <Bold className="h-4 w-4" />
                    Bold
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => wrapSelection("_", "_", "italic text")} disabled={!selectedNoteId}>
                    <Italic className="h-4 w-4" />
                    Italic
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => wrapSelection("`", "`", "inline code")} disabled={!selectedNoteId}>
                    <Code2 className="h-4 w-4" />
                    Inline
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => prefixSelectedLines("- ")} disabled={!selectedNoteId}>
                    <List className="h-4 w-4" />
                    Bullet
                  </Button>
                  <Button variant="ghost" size="sm" onClick={numberSelectedLines} disabled={!selectedNoteId}>
                    <ListOrdered className="h-4 w-4" />
                    Number
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => prefixSelectedLines("- [ ] ")} disabled={!selectedNoteId}>
                    <CheckSquare className="h-4 w-4" />
                    Task
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => prefixSelectedLines("- [x] ")} disabled={!selectedNoteId}>
                    <CheckSquare className="h-4 w-4" />
                    Done
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => prefixSelectedLines("> ")} disabled={!selectedNoteId}>
                    <Quote className="h-4 w-4" />
                    Quote
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => wrapSelection("```\n", "\n```", "code")} disabled={!selectedNoteId}>
                    <Code2 className="h-4 w-4" />
                    Code
                  </Button>
                  <Button variant="ghost" size="sm" onClick={insertLink} disabled={!selectedNoteId}>
                    <Link2 className="h-4 w-4" />
                    Link
                  </Button>
                  <Button variant="ghost" size="sm" onClick={insertTimestamp} disabled={!selectedNoteId}>
                    <Clock3 className="h-4 w-4" />
                    Time
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => wrapSelection("\n---\n", "", "")} disabled={!selectedNoteId}>
                    <Minus className="h-4 w-4" />
                    Divider
                  </Button>
                  <Button
                    variant={isJustified ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setIsJustified((current) => !current)}
                    disabled={!selectedNoteId}
                  >
                    <AlignJustify className="h-4 w-4" />
                    Justify
                  </Button>
                  <Button variant="ghost" size="sm" onClick={reflowEditorText} disabled={!selectedNoteId}>
                    Reflow
                  </Button>
                  <Button variant="secondary" size="sm" onClick={insertMeetingTemplate} disabled={!selectedNoteId}>
                    Template
                  </Button>
                </div>

                <Textarea
                  ref={editorRef}
                  value={draftContent}
                  onChange={handleContentChange}
                  onBlur={handleBlur}
                  onKeyDown={handleEditorKeyDown}
                  onPaste={handleContentPaste}
                  placeholder="Type your note..."
                  className={`min-h-[420px] text-sm leading-7 ${isJustified ? "text-justify" : ""}`}
                />
              </>
            )}
          </Card>

          <Card className="space-y-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3>Summary</h3>
              <div className="flex flex-wrap items-center gap-2">
                {summary ? <Badge tone={summaryStale ? "warning" : "success"}>{summaryStale ? "Outdated summary" : "Up to date"}</Badge> : null}
                {selectedNote?.summarized_at ? <Badge tone="neutral">Summarized {formatSavedAt(selectedNote.summarized_at)}</Badge> : null}
              </div>
            </div>

            {!selectedNote ? (
              <EmptyState title="No note selected" description="Select a note to see summary." />
            ) : !summary ? (
              <Card variant="glass" className="border-dashed p-6 text-center">
                <p className="text-sm text-muted">No summary yet. Click Summarize for this note.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {summaryStale ? (
                  <div className="alert-error">
                    This summary is from an older version of the note. Re-run summarize when you want it refreshed.
                  </div>
                ) : null}

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
