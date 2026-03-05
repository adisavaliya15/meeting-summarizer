import { Clock3, Trash2 } from "lucide-react";

import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import StatusBadge from "../ui/StatusBadge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/Tooltip";

function mapChunkStatus(status) {
  if (status === "COMPLETED") {
    return "SUMMARIZED";
  }
  if (status === "TRANSCRIBED") {
    return "TRANSCRIBED";
  }
  if (status === "ERROR") {
    return "FAILED";
  }
  return "UPLOADED";
}

function formatDuration(duration) {
  if (!duration) {
    return "-";
  }
  const total = Number(duration);
  const mins = Math.floor(total / 60);
  const secs = Math.round(total % 60)
    .toString()
    .padStart(2, "0");
  return mins > 0 ? `${mins}:${secs}` : `${Math.round(total)}s`;
}

export default function ChunkList({ chunks, selectedChunkId, onSelect, onDeleteChunk, deletingChunkId, disableDelete }) {
  return (
    <TooltipProvider delayDuration={100}>
      <Card variant="panel" className="space-y-4 p-6">
        <div>
          <h3>Chunk timeline</h3>
          <p className="mt-2 text-sm text-muted">Select a chunk to inspect transcript and summary details.</p>
        </div>

        {chunks.length === 0 ? (
          <EmptyState title="No chunks yet" description="Start recording to create your first chunk." />
        ) : (
          <div className="relative space-y-3">
            <div className="pointer-events-none absolute bottom-2 left-[14px] top-2 w-px bg-border" />

            {chunks.map((chunk) => {
              const isSelected = chunk.id === selectedChunkId;
              const uiStatus = mapChunkStatus(chunk.status);
              const isDeleting = deletingChunkId === chunk.id;

              return (
                <div key={chunk.id} className="relative pl-8">
                  <span className={`absolute left-[8px] top-5 h-3 w-3 rounded-full border ${isSelected ? "border-primary bg-primary" : "border-border bg-panel"}`} />

                  <button
                    type="button"
                    onClick={() => onSelect(chunk.id)}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      isSelected
                        ? "border-primary bg-primary-soft shadow-soft"
                        : "border-default bg-panel hover:border-primary"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Chunk {chunk.idx}</p>
                        <p className="mt-1 text-xs text-muted">Raw state: {chunk.status}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <StatusBadge status={uiStatus} />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                onDeleteChunk(chunk.id, chunk.idx);
                              }}
                              disabled={disableDelete || isDeleting}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-danger text-danger transition hover:bg-panel-2 disabled:opacity-50"
                              aria-label={`Delete chunk ${chunk.idx}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Delete chunk</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                      <Clock3 className="h-3.5 w-3.5" />
                      Duration: {formatDuration(chunk.duration_sec)}
                      <span>•</span>
                      MIME: {chunk.mime_type}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </TooltipProvider>
  );
}
