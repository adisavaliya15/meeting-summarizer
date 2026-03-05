import { CheckCircle2, CircleDot, LoaderCircle, Mic, StopCircle, Timer } from "lucide-react";

import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Card from "../ui/Card";

function formatTime(totalSeconds) {
  const mins = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const secs = String(totalSeconds % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

function Indicator({ active, label, tone }) {
  const colorMap = {
    danger: "danger",
    brand: "brand",
    warning: "warning",
  };

  if (!active) {
    return <Badge tone="neutral">{label}</Badge>;
  }

  return <Badge tone={colorMap[tone] || "brand"}>{label}</Badge>;
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
    <Card variant="panel" className="space-y-5 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3>Recorder</h3>
          <p className="mt-2 max-w-md text-sm text-muted">
            Capture microphone and optional system audio. Long runs auto-split into 10-minute chunks.
          </p>
        </div>

        <div className="rounded-2xl border border-default bg-panel-2 px-4 py-3 text-right">
          <p className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.16em] text-muted">
            <Timer className="h-3.5 w-3.5" />
            Timer
          </p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-foreground">{formatTime(recordingSeconds)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Indicator active={isRecording} label="Recording" tone="danger" />
        <Indicator active={isUploading} label="Uploading" tone="brand" />
        <Indicator active={isProcessing} label="Processing" tone="warning" />
      </div>

      <label className="flex items-center gap-2 rounded-xl border border-default bg-panel-2 px-3 py-2 text-sm font-medium text-foreground">
        <input
          type="checkbox"
          checked={includeSystemAudio}
          onChange={(event) => onToggleIncludeSystemAudio(event.target.checked)}
          disabled={isRecording || busy}
          className="h-4 w-4 rounded border-default accent-[var(--primary)]"
        />
        Include system/tab audio
      </label>

      <div className="flex flex-wrap items-center gap-5">
        <button
          type="button"
          onClick={isRecording ? onStop : onStart}
          disabled={busy && !isRecording}
          className={`relative inline-flex h-28 w-28 items-center justify-center rounded-full border border-default text-primary-foreground shadow-soft transition hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 ${
            isRecording ? "bg-danger" : "bg-primary"
          }`}
        >
          {isRecording ? (
            <>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white text-danger">
                <StopCircle className="h-5 w-5" />
              </span>
              <span className="recorder-ring absolute inset-0 rounded-full" />
            </>
          ) : (
            <span className="inline-flex items-center gap-1 text-sm font-semibold">
              <Mic className="h-4 w-4" />
              REC
            </span>
          )}
        </button>

        <div className="flex-1 space-y-3">
          <p className="text-sm text-muted">
            {isRecording
              ? "Recording in progress. Chunks upload every 10 minutes and once more when you stop."
              : "Ready for next chunk."}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" onClick={onFinalize} disabled={!canFinalize || busy}>
              <CheckCircle2 className="h-4 w-4" />
              Finalize Session
            </Button>
            {isUploading ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-default bg-panel-2 px-3 py-1 text-xs text-muted">
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                Upload in progress
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-default bg-panel-2 px-3 py-1 text-xs text-muted">
                <CircleDot className="h-3.5 w-3.5" />
                Idle
              </span>
            )}
          </div>
        </div>
      </div>

      {captureNotice ? <p className="rounded-xl border border-default bg-panel-2 px-3 py-2 text-sm text-muted">{captureNotice}</p> : null}

      {lastAudioUrl ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Latest recording preview</p>
          <audio controls src={lastAudioUrl} className="w-full" />
        </div>
      ) : null}
    </Card>
  );
}

