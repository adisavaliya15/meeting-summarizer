import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { apiFetch } from "../api";

const ACTIVE_CHUNK_STATUSES = new Set([
  "WAITING_UPLOAD",
  "UPLOADED",
  "TRANSCRIBING",
  "TRANSCRIBED",
  "SUMMARIZING",
]);

const ACTIVE_JOB_STATUSES = new Set(["PENDING", "RUNNING"]);

export default function SessionPage({ session }) {
  const { sessionId } = useParams();
  const token = session?.access_token;

  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [includeSystemAudio, setIncludeSystemAudio] = useState(true);
  const [captureNotice, setCaptureNotice] = useState("");
  const [error, setError] = useState("");

  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const micStreamRef = useRef(null);
  const systemStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const recordedBlobsRef = useRef([]);
  const startedAtRef = useRef(0);

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

  const hasActiveProcessing =
    (sessionData?.chunks || []).some((chunk) => ACTIVE_CHUNK_STATUSES.has(chunk.status)) ||
    (sessionData?.jobs || []).some((job) => ACTIVE_JOB_STATUSES.has(job.status));

  useEffect(() => {
    if (!hasActiveProcessing) {
      return undefined;
    }
    const intervalId = setInterval(() => {
      loadSession();
    }, 5000);
    return () => clearInterval(intervalId);
  }, [hasActiveProcessing, loadSession]);

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
      cleanupCaptureResources();
    };
  }, []);

  function getNextChunkIdx() {
    const chunks = sessionData?.chunks || [];
    if (chunks.length === 0) {
      return 0;
    }
    return Math.max(...chunks.map((chunk) => chunk.idx)) + 1;
  }

  async function uploadChunkBlob(blob, durationSec) {
    setBusy(true);
    setError("");

    try {
      const init = await apiFetch(`/api/sessions/${sessionId}/chunks/init`, token, {
        method: "POST",
        body: {
          idx: getNextChunkIdx(),
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

      await loadSession();
    } catch (err) {
      setError(err.message || "Chunk upload failed");
    } finally {
      setBusy(false);
    }
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
        notice: "No system audio was shared. Enable 'Share tab audio' and try again for speaker capture.",
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
      recordedBlobsRef.current = [];

      let options = { mimeType: "audio/webm;codecs=opus" };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = {};
      }

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setCaptureNotice(capture.notice || "");

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedBlobsRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const elapsed = (Date.now() - startedAtRef.current) / 1000;
        const durationSec = Math.max(1, elapsed);
        const blob = new Blob(recordedBlobsRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        await cleanupCaptureResources();
        await uploadChunkBlob(blob, durationSec);
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      await cleanupCaptureResources();
      setError(err.message || "Unable to start recording");
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      return;
    }
    recorder.stop();
    setIsRecording(false);
  }

  async function finalizeSession() {
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/api/sessions/${sessionId}/finalize`, token, { method: "POST" });
      await loadSession();
    } catch (err) {
      setError(err.message || "Finalize failed");
    } finally {
      setBusy(false);
    }
  }

  const chunks = sessionData?.chunks || [];
  const sessionRow = sessionData?.session;
  const allChunksSummarized = chunks.length > 0 && chunks.every((chunk) => Boolean(chunk.chunk_summary));

  return (
    <div className="page">
      <div className="toolbar">
        <Link to="/" className="secondary link-button">
          Back
        </Link>
      </div>

      {loading ? <p>Loading session...</p> : null}
      {error && <div className="error">{error}</div>}

      {sessionRow ? (
        <>
          <section className="card">
            <h1>{sessionRow.title}</h1>
            <p>Session ID: {sessionRow.id}</p>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={includeSystemAudio}
                onChange={(event) => setIncludeSystemAudio(event.target.checked)}
                disabled={isRecording || busy}
              />
              Include system/tab audio (prompts screen-share picker)
            </label>
            <div className="inline-form">
              {!isRecording ? (
                <button onClick={startRecording} disabled={busy}>
                  Record Next Chunk
                </button>
              ) : (
                <button onClick={stopRecording} className="danger">
                  Stop Recording
                </button>
              )}
              <button onClick={finalizeSession} disabled={!allChunksSummarized || busy}>
                Finalize Session
              </button>
            </div>
            {captureNotice ? <p>{captureNotice}</p> : null}
            {!allChunksSummarized ? (
              <p>All chunks must be summarized before finalizing.</p>
            ) : null}
          </section>

          <section className="card">
            <h2>Chunks</h2>
            {chunks.length === 0 ? <p>No chunks yet.</p> : null}
            <div className="chunk-list">
              {chunks.map((chunk) => (
                <article key={chunk.id} className="chunk-item">
                  <h3>
                    Chunk {chunk.idx} <span className="status">{chunk.status}</span>
                  </h3>
                  <p>
                    Duration: {chunk.duration_sec ? `${chunk.duration_sec}s` : "-"} | MIME: {chunk.mime_type}
                  </p>
                  <details>
                    <summary>Transcript</summary>
                    <pre>{chunk.transcript?.text || "Not ready"}</pre>
                  </details>
                  <details>
                    <summary>Chunk Summary</summary>
                    <pre>{JSON.stringify(chunk.chunk_summary || { message: "Not ready" }, null, 2)}</pre>
                  </details>
                </article>
              ))}
            </div>
          </section>

          <section className="card">
            <h2>Final Summary</h2>
            {sessionRow.finalized_at ? <p>Finalized at: {new Date(sessionRow.finalized_at).toLocaleString()}</p> : null}
            <pre>{sessionRow.final_summary_md || "Not finalized yet"}</pre>
            <details>
              <summary>Final Summary JSON</summary>
              <pre>{JSON.stringify(sessionRow.final_summary || {}, null, 2)}</pre>
            </details>
          </section>
        </>
      ) : null}
    </div>
  );
}
