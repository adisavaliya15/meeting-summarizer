import EmptyState from "../ui/EmptyState";
import StatusBadge from "../ui/StatusBadge";

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

export default function ChunkList({ chunks, selectedChunkId, onSelect, onDeleteChunk, deletingChunkId, disableDelete }) {
  return (
    <section className="panel space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Chunks</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Select a chunk to inspect transcript and summary details.</p>
      </div>

      {chunks.length === 0 ? (
        <EmptyState title="No chunks yet" description="Start recording to create your first chunk." />
      ) : (
        <div className="space-y-3">
          {chunks.map((chunk) => {
            const isSelected = chunk.id === selectedChunkId;
            const uiStatus = mapChunkStatus(chunk.status);
            const isDeleting = deletingChunkId === chunk.id;

            return (
              <div
                key={chunk.id}
                className={`w-full rounded-2xl border p-4 transition ${
                  isSelected
                    ? "border-brand-400 bg-brand-50 shadow-soft dark:border-brand-500/60 dark:bg-brand-900/20"
                    : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-slate-600"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onSelect(chunk.id)}
                    className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Chunk {chunk.idx}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Raw state: {chunk.status}</p>
                  </button>

                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={uiStatus} />
                    <button
                      type="button"
                      onClick={() => onDeleteChunk(chunk.id, chunk.idx)}
                      disabled={disableDelete || isDeleting}
                      className="rounded-lg border border-rose-300 px-2.5 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500/40 dark:text-rose-200 dark:hover:bg-rose-900/30"
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-500 dark:text-slate-300">
                  Duration: {chunk.duration_sec ? `${chunk.duration_sec}s` : "-"} | MIME: {chunk.mime_type}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
