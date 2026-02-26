function formatTime(totalSeconds) {
  const mins = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const secs = String(totalSeconds % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

function Indicator({ active, label, tone }) {
  const activeClass = {
    red: "border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-500/40 dark:bg-rose-900/30 dark:text-rose-200",
    blue: "border-sky-300 bg-sky-100 text-sky-700 dark:border-sky-500/40 dark:bg-sky-900/30 dark:text-sky-200",
    amber: "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-500/40 dark:bg-amber-900/30 dark:text-amber-200",
  };
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
        active
          ? activeClass[tone]
          : "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
      }`}
    >
      {label}
    </span>
  );
}

export default function RecorderCard({
  isRecording,
  isUploading,
  isProcessing,
  recordingSeconds,
  includeSystemAudio,
  onToggleIncludeSystemAudio,
  onStart,
  onStop,
  onFinalize,
  canFinalize,
  busy,
  captureNotice,
  lastAudioUrl,
}) {
  return (
    <section className="panel space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Recorder</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Capture microphone and optional system audio. Long runs auto-split into 15-minute chunks.</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Timer</p>
          <p className="text-2xl font-semibold tabular-nums">{formatTime(recordingSeconds)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Indicator active={isRecording} label="Recording" tone="red" />
        <Indicator active={isUploading} label="Uploading" tone="blue" />
        <Indicator active={isProcessing} label="Processing" tone="amber" />
      </div>

      <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium dark:border-slate-700 dark:bg-slate-900/40">
        <input
          type="checkbox"
          checked={includeSystemAudio}
          onChange={(event) => onToggleIncludeSystemAudio(event.target.checked)}
          disabled={isRecording || busy}
          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
        Include system/tab audio
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={isRecording ? onStop : onStart}
          disabled={busy && !isRecording}
          className="record-button group relative inline-flex h-28 w-28 items-center justify-center rounded-full bg-brand-600 text-white transition hover:scale-[1.02] hover:bg-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRecording ? <span className="relative z-10 h-7 w-7 rounded bg-white" /> : <span className="relative z-10 text-sm font-semibold">REC</span>}
          {isRecording ? <span className="record-pulse" /> : null}
        </button>

        <div className="flex-1 space-y-3">
          <p className="text-sm text-slate-500 dark:text-slate-300">
            {isRecording
              ? "Recording in progress. Chunks are uploaded every 15 minutes and once more when you stop."
              : "Ready for next chunk."}
          </p>
          <button type="button" onClick={onFinalize} disabled={!canFinalize || busy} className="btn-secondary">
            Finalize Session
          </button>
        </div>
      </div>

      {captureNotice ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
          {captureNotice}
        </p>
      ) : null}

      {lastAudioUrl ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Latest recording preview</p>
          <audio controls src={lastAudioUrl} className="w-full" />
        </div>
      ) : null}
    </section>
  );
}
