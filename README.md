# meeting-summarizer

Monorepo for browser-based meeting recording, chunk transcription, chunk summarization, and final session summarization.

## Project Structure

```text
meeting-summarizer/
  apps/web                # React (Vite, JS)
  services/api            # FastAPI service (Render-compatible)
  services/worker         # Local laptop Python worker
  supabase/schema.sql     # DB schema, enums, indexes, RLS policies
  docs/DOCKER.md          # Docker Compose deployment guide
  docs/DEPLOYMENT.md      # Production deployment options and runbook
```

## Docker Quick Start

For containerized deployment (web + api + worker + optional ollama), use:

- [docs/DOCKER.md](docs/DOCKER.md)
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

Quick command:

```bash
cp .env.docker.example .env.docker
docker compose --env-file .env.docker --profile ollama up --build -d
```

## Docker Run (Without Compose)

If you want direct `docker run` commands instead of Docker Compose:

```bash
# 1) Prepare shared network + volumes
docker network create meeting-net
docker volume create meeting-hf-cache
docker volume create meeting-ollama-data

# 2) Optional: run Ollama container (if using local Ollama)
docker run -d --name meeting-ollama --network meeting-net --network-alias ollama -p 11434:11434 -v meeting-ollama-data:/root/.ollama ollama/ollama:latest
docker exec -it meeting-ollama ollama pull llama3.2:3b

# 3) Build images
docker build -t meeting-summarizer-api -f services/api/Dockerfile .
docker build -t meeting-summarizer-worker -f services/worker/Dockerfile .
docker build -t meeting-summarizer-web -f apps/web/Dockerfile \
  --build-arg VITE_SUPABASE_URL=https://your-project-ref.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=your-anon-key \
  --build-arg VITE_API_URL=/ .

# 4) Run API (use your .env.docker values)
docker run -d --name meeting-api --network meeting-net --network-alias api --env-file .env.docker -p 8000:8000 meeting-summarizer-api

# 5) Run worker
docker run -d --name meeting-worker --network meeting-net --env-file .env.docker -e HF_HOME=/models/hf -v meeting-hf-cache:/models/hf meeting-summarizer-worker

# 6) Run web
docker run -d --name meeting-web --network meeting-net -p 8080:80 meeting-summarizer-web
```

Open `http://localhost:8080`.

## What This App Does

1. User logs in with Supabase Auth.
2. User creates a meeting session.
3. User records audio chunks in browser (`audio/webm;codecs=opus`).
4. Each chunk is uploaded to Supabase Storage (`recordings/...`).
5. Worker transcribes each chunk with `faster-whisper`.
6. Worker summarizes each transcript chunk using Ollama.
7. User clicks Finalize, worker generates one combined summary from all chunk summaries.
8. User can open global Manual Notes, create multiple named notes, autosave text, and optionally queue per-note summaries (processed by worker).

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
  "segments": [{ "start": 0.0, "end": 4.2, "text": "..." }]
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

## Manual Notes (Global Workspace)

Manual Notes is a user-level workspace available from the app sidebar (`/notes`).

- Users can create multiple notes (`title` + `content`) per account.
- Notes autosave in the background (debounced in UI).
- Notes can be edited at any time from anywhere in the app shell.
- `Summarize` is optional and user-triggered per note.
- Note summaries are queued as jobs and generated by the worker (API does not call Ollama directly).
- If note content changes after a summary exists, stored summary is cleared automatically to avoid stale summaries.

### Database objects used

- `manual_notes` table (many notes per user)
- Columns:
  - `title` (note name)
  - `content` (raw note text)
  - `summary` (JSON summary object)
  - `summary_md` (rendered markdown form)
  - `summarized_at`, `created_at`, `updated_at`
- RLS is enabled and forced; users can only access their own row.
- Trigger updates `updated_at` on every write.

### Notes API endpoints

- `GET /api/notes` (list notes)
- `POST /api/notes` (create note)
- `GET /api/notes/{note_id}` (fetch note)
- `PUT /api/notes/{note_id}` (save title/content)
- `DELETE /api/notes/{note_id}` (delete note)
- `POST /api/notes/{note_id}/summarize` (enqueue summary job; worker persists summary)

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
- `OLLAMA_URL` (default `http://localhost:11434`)
- `OLLAMA_MODEL` (default `llama3.2:3b`)
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
- `WHISPER_MODEL` (default `large-v3`, use `large-v3-turbo` for faster processing if available)
- `OLLAMA_MODEL` (model served by your Ollama endpoint)
- `OLLAMA_TIMEOUT_SEC` (default `1500`, increase for long notes/summaries)
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
- `GET /healthz`
- `GET /readyz`
- `GET /api/notes`
- `POST /api/notes`
- `GET /api/notes/{note_id}`
- `PUT /api/notes/{note_id}`
- `DELETE /api/notes/{note_id}`
- `POST /api/notes/{note_id}/summarize`
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

## Start All Services (One Command)

From repo root (`d:\Projects\meeting-summarizer`), run this in PowerShell to open three terminals:

```powershell
Start-Process powershell -ArgumentList '-NoExit', '-Command', 'cd "d:\Projects\meeting-summarizer\services\api"; .\.venv\Scripts\Activate.ps1; uvicorn app.main:app --reload --host 0.0.0.0 --port 8000'
Start-Process powershell -ArgumentList '-NoExit', '-Command', 'cd "d:\Projects\meeting-summarizer\services\worker"; .\.venv\Scripts\Activate.ps1; python worker.py'
Start-Process powershell -ArgumentList '-NoExit', '-Command', 'cd "d:\Projects\meeting-summarizer\apps\web"; npm run dev'
```

Manual equivalent (three terminals):

```powershell
# Terminal 1 (API)

# 1) API deps + run
cd d:\Projects\meeting-summarizer\services\api
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

cd d:\Projects\meeting-summarizer\services\api
.\.venv\Scripts\Activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 (Worker)
# 2) Worker deps + run
cd d:\Projects\meeting-summarizer\services\worker
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe worker.py

cd d:\Projects\meeting-summarizer\services\worker
.\.venv\Scripts\Activate
python worker.py

# Terminal 3 (Web)
# 3) npm install
cd d:\Projects\meeting-summarizer\apps\web
npm run dev -- --host
```

## New: Delete + Auto-Chunk Behavior

### Delete actions

- You can delete a single chunk from the Session page (`Delete` button on each chunk card).
- You can delete the whole session from the Session page (`Delete Session`).
- API routes added:
  - `DELETE /api/chunks/{chunk_id}`
  - `DELETE /api/sessions/{session_id}`
- Deleting a chunk/session removes related jobs and attempts to remove associated audio objects from Supabase Storage.

### Automatic 10-minute chunking

- Recording now uses a 10-minute rollover (`600000 ms = 10 minutes`) with `MediaRecorder.requestData()` while recording stays continuous.
- While recording, the browser emits and uploads one chunk every 10 minutes automatically.
- When you stop recording, the final partial chunk is emitted and uploaded too.
- Chunk indexes are assigned sequentially so long recordings are split into ordered chunks (`0, 1, 2, ...`).

### Manual audio upload with same chunk pipeline

- Session page supports manual audio upload in the Recorder panel (`Upload Audio`).
- Uploaded audio follows the same chunk sequence logic as recording:
  - If chunk `0` and `1` exist, next uploaded audio starts at chunk `2`.
- If uploaded audio is longer than 10 minutes, browser splits it into multiple chunks before upload.
- Each uploaded chunk uses the same backend flow (`/chunks/init` -> signed upload -> `/uploaded` -> worker transcribe/summarize).

## Frontend UI Revamp Libraries (apps/web)

Installed UI/UX libraries used for the production SaaS revamp:

- `framer-motion`
- `lucide-react`
- `@radix-ui/react-dialog`
- `@radix-ui/react-tabs`
- `@radix-ui/react-dropdown-menu`
- `@radix-ui/react-tooltip`
- `class-variance-authority`
- `tailwind-merge`
- `tailwindcss-animate`
- `embla-carousel-react`
- `react-hot-toast`

Install command (already applied in this repo):

```bash
cd apps/web
npm install framer-motion lucide-react @radix-ui/react-dialog @radix-ui/react-tabs @radix-ui/react-dropdown-menu @radix-ui/react-tooltip class-variance-authority tailwind-merge tailwindcss-animate embla-carousel-react react-hot-toast
```
