import { AnimatePresence, motion } from "framer-motion";
import { Copy, Download, Search } from "lucide-react";
import { useMemo, useState } from "react";

import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/Tabs";
import { useToast } from "../ui/ToastProvider";

const TABS = [
  { id: "transcript", label: "Transcript" },
  { id: "chunk", label: "Chunk Summary" },
  { id: "final", label: "Final Summary" },
];

const sectionLabels = {
  key_points: "Key Points",
  action_items: "Action Items",
  decisions: "Decisions",
  open_questions: "Open Questions",
  topics: "Topics",
  key_takeaways: "Key Takeaways",
  risks: "Risks",
  topic_timeline: "Topic Timeline",
};

function listToMarkdown(title, values) {
  if (!Array.isArray(values) || values.length === 0) {
    return "";
  }

  const lines = [`## ${title}`];
  values.forEach((item) => {
    if (typeof item === "string") {
      lines.push(`- ${item}`);
      return;
    }
    const topic = item?.topic || "Topic";
    const chunkIndex = item?.chunk_index;
    lines.push(`- ${chunkIndex === undefined || chunkIndex === null ? topic : `Chunk ${chunkIndex}: ${topic}`}`);
  });
  lines.push("");
  return lines.join("\n");
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
  ["key_points", "action_items", "decisions", "open_questions", "topics"].forEach((key) => {
    lines.push(listToMarkdown(sectionLabels[key], summary[key]));
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
  ["key_takeaways", "action_items", "decisions", "risks", "open_questions", "topic_timeline"].forEach((key) => {
    lines.push(listToMarkdown(sectionLabels[key], summary[key]));
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

function SectionList({ title, values }) {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  return (
    <Card variant="glass" className="p-4">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <ul className="mt-3 space-y-2 text-sm text-muted">
        {values.map((value, index) => {
          const text = typeof value === "string"
            ? value
            : `${value?.chunk_index === undefined || value?.chunk_index === null ? "" : `Chunk ${value.chunk_index}: `}${value?.topic || JSON.stringify(value)}`;
          return (
            <li key={`${title}-${index}`} className="flex gap-2">
              <span className="mt-1.5 inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              <span>{text}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function MotionWrap({ children, value }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={value}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2, ease: [0.2, 0.7, 0.2, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export default function SummaryPane({ activeTab, onTabChange, selectedChunk, sessionRow }) {
  const { pushToast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  const transcriptText = selectedChunk?.transcript?.text || "";
  const chunkSummary = selectedChunk?.chunk_summary || null;
  const finalSummary = sessionRow?.final_summary || null;
  const finalSummaryMd = sessionRow?.final_summary_md || "";

  const transcriptSegments = useMemo(() => selectedChunk?.transcript?.segments || [], [selectedChunk]);
  const normalizedFinalSummary = useMemo(
    () => normalizeFinalSummary(finalSummary, finalSummaryMd),
    [finalSummary, finalSummaryMd],
  );

  const filteredSegments = useMemo(() => {
    if (!searchQuery.trim()) {
      return transcriptSegments;
    }
    const query = searchQuery.trim().toLowerCase();
    return transcriptSegments.filter((segment) => String(segment.text || "").toLowerCase().includes(query));
  }, [searchQuery, transcriptSegments]);

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
      return <EmptyState title="No chunk selected" description="Select a chunk on the left to inspect transcript data." />;
    }

    if (!transcriptText) {
      return <EmptyState title="Transcript pending" description="This chunk is still being transcribed." />;
    }

    return (
      <div className="space-y-4">
        <div className="summary-sticky flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted">Chunk {selectedChunk.idx} transcript</p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search transcript"
                className="h-9 pl-9"
              />
            </div>
            <Button variant="secondary" size="sm" onClick={() => copyContent(transcriptText, "Transcript")}>
              <Copy className="h-4 w-4" />
              Copy
            </Button>
          </div>
        </div>

        <div className="transcript-reading">{transcriptText}</div>

        <Card variant="glass" className="space-y-3 p-4">
          <h4 className="text-sm font-semibold text-foreground">Timestamped segments</h4>
          {filteredSegments.length === 0 ? (
            <p className="text-sm text-muted">No segments match your search.</p>
          ) : (
            <div className="max-h-[340px] space-y-2 overflow-auto">
              {filteredSegments.map((segment, index) => (
                <div key={`segment-${index}`} className="transcript-segment text-sm text-muted">
                  <p className="font-medium text-foreground">[{segment.start}s - {segment.end}s]</p>
                  <p className="mt-1">{segment.text}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  }

  function renderChunkSummary() {
    if (!selectedChunk) {
      return <EmptyState title="No chunk selected" description="Choose a chunk to inspect summary details." />;
    }

    if (!chunkSummary) {
      return <EmptyState title="Summary pending" description="Chunk summary appears after processing completes." />;
    }

    const markdown = chunkSummaryMarkdown(chunkSummary);

    return (
      <div className="space-y-4">
        <div className="summary-sticky flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted">Chunk {selectedChunk.idx} summary</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => copyContent(JSON.stringify(chunkSummary, null, 2), "Chunk summary JSON")}
            >
              <Copy className="h-4 w-4" />
              Copy
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => downloadMarkdown(`chunk-${selectedChunk.idx}-summary.md`, markdown)}
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        <Card className="space-y-5 p-5">
          <Card variant="glass" className="p-4">
            <h4 className="text-sm font-semibold text-foreground">Summary</h4>
            <p className="mt-2 text-sm leading-7 text-muted">{chunkSummary.summary || "-"}</p>
          </Card>

          <div className="grid gap-3 lg:grid-cols-2">
            <SectionList title="Key Points" values={chunkSummary.key_points} />
            <SectionList title="Action Items" values={chunkSummary.action_items} />
            <SectionList title="Decisions" values={chunkSummary.decisions} />
            <SectionList title="Open Questions" values={chunkSummary.open_questions} />
            <SectionList title="Topics" values={chunkSummary.topics} />
          </div>
        </Card>
      </div>
    );
  }

  function renderFinalSummary() {
    if (!finalSummary && !finalSummaryMd) {
      return <EmptyState title="Final summary not ready" description="Finalize the session to generate the combined summary." />;
    }

    const markdown = finalSummaryMarkdown(normalizedFinalSummary || finalSummary, finalSummaryMd);

    return (
      <div className="space-y-4">
        <div className="summary-sticky flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted">Session-level summary</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => copyContent(markdown, "Final summary")}>
              <Copy className="h-4 w-4" />
              Copy
            </Button>
            <Button variant="secondary" size="sm" onClick={() => downloadMarkdown("final-summary.md", markdown)}>
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {normalizedFinalSummary ? (
          <Card className="space-y-5 p-5">
            <Card variant="glass" className="p-4">
              <h4 className="text-sm font-semibold text-foreground">Overall Summary</h4>
              <p className="mt-2 text-sm leading-7 text-muted">{normalizedFinalSummary.overall_summary || "-"}</p>
            </Card>

            <div className="grid gap-3 lg:grid-cols-2">
              <SectionList title="Key Takeaways" values={normalizedFinalSummary.key_takeaways} />
              <SectionList title="Action Items" values={normalizedFinalSummary.action_items} />
              <SectionList title="Decisions" values={normalizedFinalSummary.decisions} />
              <SectionList title="Risks" values={normalizedFinalSummary.risks} />
              <SectionList title="Open Questions" values={normalizedFinalSummary.open_questions} />
              <SectionList title="Topic Timeline" values={normalizedFinalSummary.topic_timeline} />
            </div>
          </Card>
        ) : (
          <Card className="p-5">
            <pre className="whitespace-pre-wrap break-words text-sm leading-7 text-muted">{markdown}</pre>
          </Card>
        )}
      </div>
    );
  }

  return (
    <Card variant="panel" className="space-y-4 p-6">
      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="transcript">
          <MotionWrap value="transcript">{renderTranscript()}</MotionWrap>
        </TabsContent>

        <TabsContent value="chunk">
          <MotionWrap value="chunk">{renderChunkSummary()}</MotionWrap>
        </TabsContent>

        <TabsContent value="final">
          <MotionWrap value="final">{renderFinalSummary()}</MotionWrap>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
