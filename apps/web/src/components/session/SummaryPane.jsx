import { useMemo } from "react";

import EmptyState from "../ui/EmptyState";
import { useToast } from "../ui/ToastProvider";

const TABS = [
  { id: "transcript", label: "Transcript" },
  { id: "chunk", label: "Chunk Summary" },
  { id: "final", label: "Final Summary" },
];

function SummarySection({ title, values }) {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }
  return (
    <section>
      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h4>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
        {values.map((value, index) => (
          <li key={`${title}-${index}`}>{typeof value === "string" ? value : JSON.stringify(value)}</li>
        ))}
      </ul>
    </section>
  );
}

function SummaryCardList({ title, values }) {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h4>
      <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
        {values.map((value, index) => (
          <li key={`${title}-${index}`} className="flex gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-500" />
            <span>{typeof value === "string" ? value : JSON.stringify(value)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TopicTimelineSection({ values }) {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Topic Timeline</h4>
      <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
        {values.map((value, index) => {
          if (typeof value === "string") {
            return (
              <li key={`topic-${index}`} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-500" />
                <span>{value}</span>
              </li>
            );
          }

          const topic = value?.topic || "Topic";
          const chunkIndex = value?.chunk_index;
          return (
            <li key={`topic-${index}`} className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-500" />
              <span>{chunkIndex === undefined || chunkIndex === null ? topic : `Chunk ${chunkIndex}: ${topic}`}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function stripCodeFence(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  const lines = trimmed.split("\n");
  if (lines.length <= 2) {
    return trimmed.replace(/```/g, "").trim();
  }

  const withoutFirst = lines.slice(1);
  const withoutLast = withoutFirst[withoutFirst.length - 1].trim() === "```" ? withoutFirst.slice(0, -1) : withoutFirst;
  return withoutLast.join("\n").trim();
}

function parseJsonCandidate(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "object") {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const raw = stripCodeFence(value);
  const candidates = [raw];

  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(raw.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (typeof parsed === "string") {
        const nested = parseJsonCandidate(parsed);
        if (nested && typeof nested === "object") {
          return nested;
        }
      }
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch {
      // ignore parse attempts
    }
  }

  return null;
}

function normalizeFinalSummary(summary, fallbackMarkdown) {
  const base = summary && typeof summary === "object" ? { ...summary } : null;

  if (base?.overall_summary && typeof base.overall_summary === "string") {
    const parsedFromOverall = parseJsonCandidate(base.overall_summary);
    if (parsedFromOverall) {
      return {
        ...base,
        ...parsedFromOverall,
      };
    }
  }

  if (base) {
    return base;
  }

  return parseJsonCandidate(fallbackMarkdown);
}

function chunkSummaryMarkdown(summary) {
  if (!summary) {
    return "# Chunk Summary\n\nNo summary available.";
  }

  const lines = ["# Chunk Summary", "", summary.summary || "", ""];
  const listSections = [
    ["Key Points", summary.key_points],
    ["Action Items", summary.action_items],
    ["Decisions", summary.decisions],
    ["Open Questions", summary.open_questions],
    ["Topics", summary.topics],
  ];

  listSections.forEach(([title, items]) => {
    if (!Array.isArray(items) || items.length === 0) {
      return;
    }
    lines.push(`## ${title}`);
    items.forEach((item) => lines.push(`- ${item}`));
    lines.push("");
  });

  return lines.join("\n").trim();
}

function finalSummaryMarkdown(summary, fallbackMarkdown) {
  if (fallbackMarkdown) {
    return fallbackMarkdown;
  }

  if (!summary) {
    return "# Final Summary\n\nNo final summary available.";
  }

  const lines = ["# Final Summary", "", summary.overall_summary || "", ""];
  const listSections = [
    ["Key Takeaways", summary.key_takeaways],
    ["Action Items", summary.action_items],
    ["Decisions", summary.decisions],
    ["Risks", summary.risks],
    ["Open Questions", summary.open_questions],
  ];

  listSections.forEach(([title, items]) => {
    if (!Array.isArray(items) || items.length === 0) {
      return;
    }
    lines.push(`## ${title}`);
    items.forEach((item) => lines.push(`- ${item}`));
    lines.push("");
  });

  return lines.join("\n").trim();
}

function downloadMarkdown(fileName, markdown) {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export default function SummaryPane({ activeTab, onTabChange, selectedChunk, sessionRow }) {
  const { pushToast } = useToast();

  const transcriptText = selectedChunk?.transcript?.text || "";
  const chunkSummary = selectedChunk?.chunk_summary || null;
  const finalSummary = sessionRow?.final_summary || null;
  const finalSummaryMd = sessionRow?.final_summary_md || "";

  const transcriptSegments = useMemo(() => selectedChunk?.transcript?.segments || [], [selectedChunk]);
  const normalizedFinalSummary = useMemo(
    () => normalizeFinalSummary(finalSummary, finalSummaryMd),
    [finalSummary, finalSummaryMd]
  );
  const activeTabIndex = Math.max(0, TABS.findIndex((tab) => tab.id === activeTab));

  async function copyContent(text, label) {
    try {
      await navigator.clipboard.writeText(text);
      pushToast(`${label} copied`, "success");
    } catch {
      pushToast(`Failed to copy ${label.toLowerCase()}`, "error");
    }
  }

  function renderTranscript() {
    if (!selectedChunk) {
      return <EmptyState title="No chunk selected" description="Select a chunk from the left column to view transcript data." />;
    }

    if (!transcriptText) {
      return <EmptyState title="Transcript not ready" description="This chunk is still being transcribed." />;
    }

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-500 dark:text-slate-300">Chunk {selectedChunk.idx} transcript</p>
          <button type="button" className="btn-secondary" onClick={() => copyContent(transcriptText, "Transcript")}>Copy</button>
        </div>
        <div className="readable-block">
          {transcriptText}
        </div>
        {transcriptSegments.length > 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Timestamped Segments</h4>
            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto text-sm">
              {transcriptSegments.map((segment, index) => (
                <p key={`segment-${index}`} className="transcript-segment">
                  [{segment.start}s - {segment.end}s] {segment.text}
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  function renderChunkSummary() {
    if (!selectedChunk) {
      return <EmptyState title="No chunk selected" description="Choose a chunk to inspect summary details." />;
    }

    if (!chunkSummary) {
      return <EmptyState title="Summary not ready" description="Chunk summary will appear after processing completes." />;
    }

    const markdown = chunkSummaryMarkdown(chunkSummary);

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-500 dark:text-slate-300">Chunk {selectedChunk.idx} summary</p>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={() => copyContent(JSON.stringify(chunkSummary, null, 2), "Chunk summary JSON")}>
              Copy
            </button>
            <button type="button" className="btn-secondary" onClick={() => downloadMarkdown(`chunk-${selectedChunk.idx}-summary.md`, markdown)}>
              Export Markdown
            </button>
          </div>
        </div>

        <div className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <section>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Summary</h4>
            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-200">{chunkSummary.summary || "-"}</p>
          </section>
          <SummarySection title="Key Points" values={chunkSummary.key_points} />
          <SummarySection title="Action Items" values={chunkSummary.action_items} />
          <SummarySection title="Decisions" values={chunkSummary.decisions} />
          <SummarySection title="Open Questions" values={chunkSummary.open_questions} />
          <SummarySection title="Topics" values={chunkSummary.topics} />
        </div>
      </div>
    );
  }

  function renderFinalSummary() {
    if (!finalSummary && !finalSummaryMd) {
      return <EmptyState title="Final summary not ready" description="Finalize the session to generate a combined summary." />;
    }

    const markdown = finalSummaryMarkdown(normalizedFinalSummary || finalSummary, finalSummaryMd);

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-500 dark:text-slate-300">Session-level summary</p>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={() => copyContent(markdown, "Final summary")}>Copy</button>
            <button type="button" className="btn-secondary" onClick={() => downloadMarkdown("final-summary.md", markdown)}>
              Export Markdown
            </button>
          </div>
        </div>

        {normalizedFinalSummary ? (
          <div className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <section className="rounded-2xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-500/30 dark:bg-brand-900/20">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Overall Summary</h4>
              <p className="mt-2 text-sm leading-7 text-slate-700 dark:text-slate-100">{normalizedFinalSummary.overall_summary || "-"}</p>
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              <SummaryCardList title="Key Takeaways" values={normalizedFinalSummary.key_takeaways} />
              <SummaryCardList title="Action Items" values={normalizedFinalSummary.action_items} />
              <SummaryCardList title="Decisions" values={normalizedFinalSummary.decisions} />
              <SummaryCardList title="Risks" values={normalizedFinalSummary.risks} />
              <SummaryCardList title="Open Questions" values={normalizedFinalSummary.open_questions} />
              <TopicTimelineSection values={normalizedFinalSummary.topic_timeline} />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <pre className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 dark:text-slate-100">{markdown}</pre>
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="panel space-y-4">
      <div className="tabs-rail" style={{ "--tab-count": TABS.length, "--tab-index": activeTabIndex }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`tab-pill ${activeTab === tab.id ? "is-active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "transcript" ? renderTranscript() : null}
      {activeTab === "chunk" ? renderChunkSummary() : null}
      {activeTab === "final" ? renderFinalSummary() : null}
    </section>
  );
}
