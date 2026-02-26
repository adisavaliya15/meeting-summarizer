# meeting-summarizer

Monorepo for browser-based meeting recording, chunk transcription, chunk summarization, and final session summarization.

## Project Structure

```text
meeting-summarizer/
  apps/web                # React (Vite, JS)
  services/api            # FastAPI service (Render-compatible)
  services/worker         # Local laptop Python worker
  supabase/schema.sql     # DB schema, enums, indexes, RLS policies
```

## What This App Does

1. User logs in with Supabase Auth.
2. User creates a meeting session.
3. User records audio chunks in browser (`audio/webm;codecs=opus`).
4. Each chunk is uploaded to Supabase Storage (`recordings/...`).
5. Worker transcribes each chunk with `faster-whisper`.
6. Worker summarizes each transcript chunk using Ollama.
7. User clicks Finalize, worker generates one combined summary from all chunk summaries.

System audio capture note:

- The web app can capture mic + system/tab audio by mixing both streams in browser.
- For system audio, browser prompts a display/tab picker. In Chrome/Edge, choose a tab/window/screen and enable audio sharing.
- On some mobile browsers, system audio capture is limited or unavailable; mic capture still works.

## End-to-End Processing Pipeline

This is the exact flow after clicking **Record Next Chunk** and then **Stop Recording**.

1. Browser captures microphone audio with `MediaRecorder`.
2. Browser creates a chunk row through `POST /api/sessions/{session_id}/chunks/init`.
3. API inserts `chunks` row with `status='WAITING_UPLOAD'`, returns signed upload URL.
4. Browser uploads blob directly to Supabase Storage signed URL.
5. Browser calls `POST /api/chunks/{chunk_id}/uploaded`.
6. API updates chunk to `status='UPLOADED'`, writes `duration_sec`, enqueues `TRANSCRIBE_CHUNK` job.
7. Worker claims job with `SELECT ... FOR UPDATE SKIP LOCKED`, sets job `RUNNING`.
8. Worker downloads chunk object from Storage and transcribes audio.
9. Worker stores transcript JSON in `chunks.transcript`, sets chunk `TRANSCRIBED`, enqueues `SUMMARIZE_CHUNK`.
10. Worker summarizes transcript via Ollama, stores JSON in `chunks.chunk_summary`, sets chunk `COMPLETED`.
11. User clicks Finalize.
12. API validates all chunks have `chunk_summary`, enqueues `FINALIZE_SESSION`.
13. Worker generates summary-of-summaries and stores `sessions.final_summary` + `sessions.final_summary_md`.

## How Audio Is Processed (Transcription Internals)

1. Browser records raw chunk as WebM/Opus.
2. Worker downloads raw bytes and writes a temporary `.webm` file.
3. `faster-whisper` reads that file and decodes audio (via ffmpeg backend).
4. Model returns:
- detected language
- full text
- timestamped segments (`start`, `end`, `text`)
5. Worker saves this structure to `chunks.transcript` (JSONB).

Example transcript JSON shape:

```json
{
  "language": "en",
  "language_probability": 0.99,
  "duration": 602.41,
  "text": "...full chunk text...",
  "segments": [
    { "start": 0.0, "end": 4.2, "text": "..." }
  ]
}
```

## How Summarization Works

### Chunk Summarization

For each chunk, worker sends transcript text to Ollama and expects structured JSON:

```json
{
  "summary": "...",
  "key_points": [],
  "action_items": [],
  "decisions": [],
  "open_questions": [],
  "topics": [],
  "timestamps": []
}
```

Saved to `chunks.chunk_summary`.

### Final Session Summarization

Worker reads all chunk summaries for one session and asks Ollama for a combined summary:

```json
{
  "overall_summary": "...",
  "key_takeaways": [],
  "action_items": [],
  "decisions": [],
  "risks": [],
  "open_questions": [],
  "topic_timeline": []
}
```

Saved to `sessions.final_summary` and rendered markdown in `sessions.final_summary_md`.

## Status Lifecycles

### Chunk status lifecycle

`INIT -> WAITING_UPLOAD -> UPLOADED -> TRANSCRIBING -> TRANSCRIBED -> SUMMARIZING -> COMPLETED`

Error state: `ERROR`

### Job status lifecycle

`PENDING -> RUNNING -> DONE`

Failure path: `RUNNING -> PENDING` (retry) or `RUNNING -> FAILED` (after max attempts)

Stale job recovery: any `RUNNING` job with `locked_at` older than 30 minutes is reset to `PENDING`.

## Storage Path Convention

- Bucket: `recordings`
- Object key format: `<owner_id>/<session_id>/<chunk_id>.webm`
- Full logical path: `recordings/<owner_id>/<session_id>/<chunk_id>.webm`

## 1) Supabase Setup

1. Create a Supabase project.
2. In SQL Editor, run `supabase/schema.sql`.
3. Create a **private** storage bucket named `recordings`.
4. Add Storage RLS policies so users can access only their own folder.

Use this SQL for `storage.objects` policies:

```sql
-- Read own recordings
create policy "recordings_select_own"
on storage.objects
for select
using (
  bucket_id = 'recordings'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Insert own recordings
create policy "recordings_insert_own"
on storage.objects
for insert
with check (
  bucket_id = 'recordings'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Update own recordings
create policy "recordings_update_own"
on storage.objects
for update
using (
  bucket_id = 'recordings'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'recordings'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Delete own recordings
create policy "recordings_delete_own"
on storage.objects
for delete
using (
  bucket_id = 'recordings'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);
```

## 2) API Setup (FastAPI)

```bash
cd services/api
python -m venv .venv
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Set `services/api/.env` values:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
- `CORS_ORIGINS` (for local web app: `http://localhost:5173`)

DB URL note:

- Prefer Supabase pooler URL for local/dev reliability: `postgresql://postgres.<project-ref>:<url-encoded-password>@aws-0-<region>.pooler.supabase.com:6543/postgres`
- URL-encode password special characters (`#`, `$`, `+`, `@`, etc.).

Run API:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 3) Worker Setup (local laptop)

Prerequisites:

- Python 3.11+
- `ffmpeg` installed and available in PATH
- Ollama server available at `OLLAMA_URL`

```bash
cd services/worker
python -m venv .venv
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Set `services/worker/.env` values:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL` (same format as API)
- `OLLAMA_URL` (default `http://localhost:11434`)
- `WHISPER_MODEL` (default `small`)
- `OLLAMA_MODEL` (model served by your Ollama endpoint)
- `POLL_INTERVAL_SEC`, `MAX_ATTEMPTS`, `WORKER_ID`

Run worker:

```bash
python worker.py
```

## 4) Web Setup (React + Vite)

```bash
cd apps/web
npm install
copy .env.example .env
```

Set `apps/web/.env` values:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL` (local API: `http://localhost:8000`)

Run web app:

```bash
npm run dev
```

Open `http://localhost:5173`.

## 5) Local Run Order (Recommended)

1. Start API.
2. Start worker.
3. Start web app.
4. Sign in.
5. Create session.
6. Record chunk and stop recording.
7. Wait until chunk status becomes `COMPLETED`.
8. Finalize session.

## How To Verify System Is Working

### Browser checks

1. On stop recording, network should show:
- `POST /api/sessions/{id}/chunks/init` -> 200
- `PUT <signed storage URL>` -> 200
- `POST /api/chunks/{id}/uploaded` -> 200

2. Session page status should progress to `COMPLETED`.

### Worker checks

You should see logs like:

- `Claimed job ... (TRANSCRIBE_CHUNK)`
- `Completed job ...`
- `Claimed job ... (SUMMARIZE_CHUNK)`
- `Completed job ...`

### Data checks

- `chunks.transcript` should be non-null.
- `chunks.chunk_summary` should be non-null.
- After finalize: `sessions.final_summary` and `sessions.final_summary_md` should be non-null.

## Common Issues

1. `WAITING_UPLOAD` stuck:
- signed upload URL failed or upload PUT failed.
- check browser network for init/upload/uploaded sequence.

2. Upload OPTIONS 404:
- signed URL missing `/storage/v1` path.
- restart API after latest code changes.

3. DB `getaddrinfo failed`:
- use Supabase pooler host (`...pooler.supabase.com:6543`) instead of direct `db.<project-ref>.supabase.co:5432`.

4. HuggingFace symlink warning on Windows:
- warning only; processing still works.
- optional: set `HF_HUB_DISABLE_SYMLINKS_WARNING=1`.

## API Route Reference

- `GET /api/health`
- `POST /api/sessions`
- `GET /api/sessions`
- `GET /api/sessions/{session_id}`
- `POST /api/sessions/{session_id}/finalize`
- `POST /api/sessions/{session_id}/chunks/init`
- `POST /api/chunks/{chunk_id}/uploaded`

## Render Deployment Notes (API)

- Deploy `services/api` as a Web Service on Render free tier.
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Add env vars from `.env.example`.
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret.

## Operational Notes

- Worker uses service-role credentials and bypasses RLS for internal processing.
- Clients cannot mutate `jobs` table by default; they can only read their own jobs.
- Jobs are durable in Postgres (no Redis required).
