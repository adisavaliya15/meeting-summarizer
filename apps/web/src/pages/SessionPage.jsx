import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Trash2 } from "lucide-react";

import { apiFetch } from "../api";
import ChunkList from "../components/session/ChunkList";
import RecorderCard from "../components/session/RecorderCard";
import SummaryPane from "../components/session/SummaryPane";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/Dialog";
import Skeleton from "../components/ui/Skeleton";
import { useToast } from "../components/ui/ToastProvider";

const ACTIVE_CHUNK_STATUSES = new Set([
  "WAITING_UPLOAD",
  "UPLOADED",
  "TRANSCRIBING",
  "TRANSCRIBED",
  "SUMMARIZING",
]);

const ACTIVE_JOB_STATUSES = new Set(["PENDING", "RUNNING"]);
const AUTO_CHUNK_MS = 10 * 60 * 1000;

export default function SessionPage({ session }) {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const token = session?.access_token;

  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [includeSystemAudio, setIncludeSystemAudio] = useState(true);
  const [captureNotice, setCaptureNotice] = useState("");
  const [error, setError] = useState("");
  const [selectedChunkId, setSelectedChunkId] = useState(null);
  const [activeTab, setActiveTab] = useState("transcript");
  const [lastAudioUrl, setLastAudioUrl] = useState("");
  const [deletingChunkId, setDeletingChunkId] = useState("");
  const [deletingSession, setDeletingSession] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const micStreamRef = useRef(null);
  const systemStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const startedAtRef = useRef(0);
  const chunkStartedAtRef = useRef(0);
  const timerRef = useRef(null);
  const chunkFlushTimerRef = useRef(null);
  const manualStopRef = useRef(false);
  const nextChunkIdxRef = useRef(0);
  const uploadQueueRef = useRef(Promise.resolve());
  const pendingUploadCountRef = useRef(0);

  const sessionRow = sessionData?.session || null;
  const chunks = sessionData?.chunks || [];

  const selectedChunk = useMemo(
    () => chunks.find((chunk) => chunk.id === selectedChunkId) || null,
    [chunks, selectedChunkId],
  );

  const hasActiveProcessing =
    chunks.some((chunk) => ACTIVE_CHUNK_STATUSES.has(chunk.status)) ||
    (sessionData?.jobs || []).some((job) => ACTIVE_JOB_STATUSES.has(job.status));

  const allChunksSummarized = chunks.length > 0 && chunks.every((chunk) => Boolean(chunk.chunk_summary));
  const busy = isUploading || isFinalizing || deletingSession || Boolean(deletingChunkId);
  const isDeleteInFlight = deletingSession || Boolean(deletingChunkId);

  const loadSession = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const data = await apiFetch(`/api/sessions/${sessionId}`, token);
      setSessionData(data);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load session");
    } finally {
      setLoading(false);
    }
  }, [sessionId, token]);

  useEffect(() => {
    setLoading(true);
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (!hasActiveProcessing) {
      return undefined;
    }
    const intervalId = setInterval(() => {
      loadSession();
    }, 5000);
    return () => clearInterval(intervalId);
  }, [hasActiveProcessing, loadSession]);

  useEffect(() => {
    if (chunks.length === 0) {
      setSelectedChunkId(null);
      return;
    }
    if (!selectedChunkId || !chunks.some((chunk) => chunk.id === selectedChunkId)) {
      setSelectedChunkId(chunks[chunks.length - 1].id);
    }
  }, [chunks, selectedChunkId]);

  useEffect(() => {
    const fromServer = chunks.length ? Math.max(...chunks.map((chunk) => chunk.idx)) + 1 : 0;
    nextChunkIdxRef.current = Math.max(nextChunkIdxRef.current, fromServer);
  }, [chunks]);

  function clearTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function clearChunkFlushTimer() {
    if (chunkFlushTimerRef.current) {
      clearInterval(chunkFlushTimerRef.current);
      chunkFlushTimerRef.current = null;
    }
  }

  function stopStream(streamRef) {
    const stream = streamRef.current;
    if (!stream) {
      return;
    }
    stream.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function cleanupCaptureResources() {
    stopStream(mediaStreamRef);
    stopStream(micStreamRef);
    stopStream(systemStreamRef);
    if (audioContextRef.current) {
      try {
        await audioContextRef.current.close();
      } catch {
        // no-op
      }
      audioContextRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      clearTimer();
      clearChunkFlushTimer();
      cleanupCaptureResources();
      if (lastAudioUrl) {
        URL.revokeObjectURL(lastAudioUrl);
      }
    };
  }, [lastAudioUrl]);

  async function uploadChunkBlob(blob, durationSec, idx) {
    setError("");

    try {
      const init = await apiFetch(`/api/sessions/${sessionId}/chunks/init`, token, {
        method: "POST",
        body: {
          idx,
          mime_type: blob.type || "audio/webm",
        },
      });

      if (!init.signed_upload_url) {
        throw new Error("Backend did not return a signed upload URL");
      }

      const uploadRes = await fetch(init.signed_upload_url, {
        method: "PUT",
        headers: {
          "Content-Type": blob.type || "audio/webm",
        },
        body: blob,
      });

      if (!uploadRes.ok) {
        throw new Error(`Signed upload failed (${uploadRes.status})`);
      }

      await apiFetch(`/api/chunks/${init.chunk_id}/uploaded`, token, {
        method: "POST",
        body: {
          duration_sec: Number(durationSec.toFixed(2)),
        },
      });

      pushToast(`Chunk ${idx} uploaded. Processing started.`, "success");
      await loadSession();
    } catch (err) {
      const message = err.message || "Chunk upload failed";
      setError(message);
      pushToast(message, "error");
    }
  }

  function enqueueChunkUpload(blob, durationSec) {
    const idx = nextChunkIdxRef.current;
    nextChunkIdxRef.current += 1;

    pendingUploadCountRef.current += 1;
    setIsUploading(true);

    uploadQueueRef.current = uploadQueueRef.current
      .catch(() => undefined)
      .then(() => uploadChunkBlob(blob, durationSec, idx))
      .finally(() => {
        pendingUploadCountRef.current = Math.max(0, pendingUploadCountRef.current - 1);
        if (pendingUploadCountRef.current === 0) {
          setIsUploading(false);
        }
      });
  }

  async function buildCaptureStream() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("This browser does not support microphone recording.");
    }

    const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micStreamRef.current = micStream;

    if (!includeSystemAudio) {
      return { stream: micStream, notice: "Recording microphone only." };
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      return {
        stream: micStream,
        notice: "System audio capture is unavailable in this browser. Recording microphone only.",
      };
    }

    let displayStream;
    try {
      displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      systemStreamRef.current = displayStream;
    } catch {
      return {
        stream: micStream,
        notice: "System audio permission was denied. Recording microphone only.",
      };
    }

    const systemAudioTracks = displayStream.getAudioTracks();
    if (systemAudioTracks.length === 0) {
      return {
        stream: micStream,
        notice: "No system audio was shared. Enable tab audio and retry for speaker capture.",
      };
    }

    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) {
      return {
        stream: micStream,
        notice: "Audio mixing is unavailable in this browser. Recording microphone only.",
      };
    }

    const audioContext = new AudioContextCtor();
    audioContextRef.current = audioContext;
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    const destination = audioContext.createMediaStreamDestination();

    const micSource = audioContext.createMediaStreamSource(new MediaStream(micStream.getAudioTracks()));
    micSource.connect(destination);

    const systemSource = audioContext.createMediaStreamSource(new MediaStream(systemAudioTracks));
    systemSource.connect(destination);

    return {
      stream: destination.stream,
      notice: "Recording microphone + system audio.",
    };
  }

  async function startRecording() {
    setError("");
    setCaptureNotice("");

    try {
      const capture = await buildCaptureStream();
      const stream = capture.stream;

      mediaStreamRef.current = stream;

      let options = { mimeType: "audio/webm;codecs=opus" };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = {};
      }

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      startedAtRef.current = Date.now();
      chunkStartedAtRef.current = Date.now();
      nextChunkIdxRef.current = chunks.length ? Math.max(...chunks.map((chunk) => chunk.idx)) + 1 : 0;
      setCaptureNotice(`${capture.notice || "Recording started."} Chunks auto-upload every 10 minutes in background while recording stays live.`);
      setRecordingSeconds(0);
      manualStopRef.current = false;

      clearTimer();
      clearChunkFlushTimer();
      timerRef.current = setInterval(() => {
        setRecordingSeconds(Math.max(1, Math.floor((Date.now() - startedAtRef.current) / 1000)));
      }, 1000);

      stream.getTracks().forEach((track) => {
        track.onended = () => {
          if (manualStopRef.current) {
            return;
          }
          const activeRecorder = mediaRecorderRef.current;
          if (activeRecorder && activeRecorder.state !== "inactive") {
            setCaptureNotice("Capture stream ended unexpectedly. Recording stopped.");
            setIsRecording(false);
            pushToast("Capture stream ended. Recording stopped.", "error");
            activeRecorder.stop();
          }
        };
      });

      recorder.ondataavailable = (event) => {
        if (!event.data || event.data.size === 0) {
          return;
        }

        const now = Date.now();
        const durationSec = Math.max(1, (now - chunkStartedAtRef.current) / 1000);
        chunkStartedAtRef.current = now;

        const blob = new Blob([event.data], {
          type: recorder.mimeType || event.data.type || "audio/webm",
        });

        setLastAudioUrl((previousUrl) => {
          if (previousUrl) {
            URL.revokeObjectURL(previousUrl);
          }
          return URL.createObjectURL(blob);
        });

        enqueueChunkUpload(blob, durationSec);
      };

      recorder.onstop = async () => {
        clearTimer();
        clearChunkFlushTimer();
        setIsRecording(false);
        manualStopRef.current = false;
        await cleanupCaptureResources();
        await uploadQueueRef.current;
      };

      recorder.start();
      chunkFlushTimerRef.current = setInterval(() => {
        const activeRecorder = mediaRecorderRef.current;
        if (!activeRecorder || activeRecorder.state !== "recording") {
          return;
        }
        try {
          activeRecorder.requestData();
        } catch {
          // no-op
        }
      }, AUTO_CHUNK_MS);
      setIsRecording(true);
      pushToast("Recording started", "info");
    } catch (err) {
      clearTimer();
      clearChunkFlushTimer();
      manualStopRef.current = false;
      await cleanupCaptureResources();
      const message = err.message || "Unable to start recording";
      setError(message);
      pushToast(message, "error");
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      return;
    }
    if (recorder.state !== "inactive") {
      manualStopRef.current = true;
      recorder.stop();
    }
    setIsRecording(false);
    pushToast("Recording stopped", "info");
  }

  function openDeleteChunkPrompt(chunkId, chunkIdx) {
    setConfirmDialog({
      type: "chunk",
      chunkId,
      chunkIdx,
      title: `Delete Chunk ${chunkIdx}?`,
      message: "This will permanently remove this chunk audio, transcript, and summary.",
      confirmText: "Delete Chunk",
    });
  }

  function openDeleteSessionPrompt() {
    setConfirmDialog({
      type: "session",
      title: "Delete Session?",
      message: "This will permanently remove the session and all chunks. This action cannot be undone.",
      confirmText: "Delete Session",
    });
  }

  function closeConfirmDialog() {
    if (isDeleteInFlight) {
      return;
    }
    setConfirmDialog(null);
  }

  async function performDeleteChunk(chunkId, chunkIdx) {
    setDeletingChunkId(chunkId);
    setError("");
    try {
      await apiFetch(`/api/chunks/${chunkId}`, token, { method: "DELETE" });
      if (selectedChunkId === chunkId) {
        setSelectedChunkId(null);
      }
      pushToast(`Chunk ${chunkIdx} deleted`, "success");
      await loadSession();
    } catch (err) {
      const message = err.message || "Failed to delete chunk";
      setError(message);
      pushToast(message, "error");
    } finally {
      setDeletingChunkId("");
    }
  }

  async function performDeleteSession() {
    setDeletingSession(true);
    setError("");
    try {
      await apiFetch(`/api/sessions/${sessionId}`, token, { method: "DELETE" });
      pushToast("Session deleted", "success");
      navigate("/sessions");
    } catch (err) {
      const message = err.message || "Failed to delete session";
      setError(message);
      pushToast(message, "error");
    } finally {
      setDeletingSession(false);
    }
  }

  async function confirmDelete() {
    if (!confirmDialog || isDeleteInFlight) {
      return;
    }

    const target = confirmDialog;
    setConfirmDialog(null);

    if (target.type === "chunk") {
      await performDeleteChunk(target.chunkId, target.chunkIdx);
      return;
    }

    await performDeleteSession();
  }

  async function finalizeSession() {
    setIsFinalizing(true);
    setError("");
    try {
      await apiFetch(`/api/sessions/${sessionId}/finalize`, token, { method: "POST" });
      pushToast("Finalize started", "success");
      setActiveTab("final");
      await loadSession();
    } catch (err) {
      const message = err.message || "Finalize failed";
      setError(message);
      pushToast(message, "error");
    } finally {
      setIsFinalizing(false);
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/sessions">
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4" />
              Back to Sessions
            </Button>
          </Link>

          <div className="flex items-center gap-2">
            <Badge tone={hasActiveProcessing ? "warning" : "success"}>
              {hasActiveProcessing ? "Processing" : "Up to date"}
            </Badge>
            <Button
              variant="destructive"
              onClick={openDeleteSessionPrompt}
              disabled={busy || isRecording}
            >
              <Trash2 className="h-4 w-4" />
              {deletingSession ? "Deleting..." : "Delete Session"}
            </Button>
          </div>
        </div>

        {error ? <div className="alert-error">{error}</div> : null}

        {loading ? (
          <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
            <div className="space-y-6">
              <Skeleton className="h-[390px]" />
              <Skeleton className="h-[420px]" />
            </div>
            <Skeleton className="h-[820px]" />
          </div>
        ) : null}

        {!loading && sessionRow ? (
          <>
            <section className="panel p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Session</p>
              <h1 className="mt-3 text-4xl">{sessionRow.title}</h1>
              <p className="mt-2 text-sm text-muted">ID: {sessionRow.id}</p>
            </section>

            <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
              <div className="space-y-6">
                <RecorderCard
                  isRecording={isRecording}
                  isUploading={isUploading}
                  isProcessing={hasActiveProcessing || isFinalizing}
                  recordingSeconds={recordingSeconds}
                  includeSystemAudio={includeSystemAudio}
                  onToggleIncludeSystemAudio={setIncludeSystemAudio}
                  onStart={startRecording}
                  onStop={stopRecording}
                  onFinalize={finalizeSession}
                  canFinalize={allChunksSummarized}
                  busy={busy}
                  captureNotice={captureNotice}
                  lastAudioUrl={lastAudioUrl}
                />

                <ChunkList
                  chunks={chunks}
                  selectedChunkId={selectedChunkId}
                  onSelect={setSelectedChunkId}
                  onDeleteChunk={openDeleteChunkPrompt}
                  deletingChunkId={deletingChunkId}
                  disableDelete={isRecording || deletingSession}
                />
              </div>

              <SummaryPane
                activeTab={activeTab}
                onTabChange={setActiveTab}
                selectedChunk={selectedChunk}
                sessionRow={sessionRow}
              />
            </div>
          </>
        ) : null}
      </div>

      <Dialog open={Boolean(confirmDialog)} onOpenChange={(open) => (!open ? closeConfirmDialog() : undefined)}>
        {confirmDialog ? (
          <DialogContent showClose={!isDeleteInFlight}>
            <DialogHeader>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-danger">
                <AlertTriangle className="h-3.5 w-3.5" />
                Confirm delete
              </p>
              <DialogTitle>{confirmDialog.title}</DialogTitle>
              <DialogDescription>{confirmDialog.message}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="secondary" onClick={closeConfirmDialog} disabled={isDeleteInFlight}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={isDeleteInFlight}>
                {isDeleteInFlight ? "Deleting..." : confirmDialog.confirmText}
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}



