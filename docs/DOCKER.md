# Docker Deployment Guide

This guide runs the full stack with Docker:

- `web` (React app served by Nginx)
- `api` (FastAPI)
- `worker` (job processor with `faster-whisper` + ffmpeg)
- optional `ollama` service for local summarization

Supabase remains external (Auth, Postgres, Storage).

## 1) Prepare Environment

From repo root:

```bash
cp .env.docker.example .env.docker
```

Fill all values in `.env.docker`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Choose Ollama mode:

- Local container Ollama: keep `OLLAMA_URL=http://ollama:11434`
- External Ollama endpoint: set `OLLAMA_URL` accordingly

## 2) Build and Run

### With local Ollama container

```bash
docker compose --env-file .env.docker --profile ollama up --build -d
```

Pull model once (example `llama3.1:8b`):

```bash
docker compose --env-file .env.docker --profile ollama exec ollama ollama pull llama3.1:8b
```

### Without local Ollama container (external Ollama)

```bash
docker compose --env-file .env.docker up --build -d
```

Open app at `http://localhost:8080`.

## 3) Container Access

Check status:

```bash
docker compose ps
```

Tail logs:

```bash
docker compose logs -f api
docker compose logs -f worker
docker compose logs -f web
```

Stop:

```bash
docker compose down
```

Stop and remove caches/models:

```bash
docker compose down -v
```

## 4) How Networking Works

- Browser -> `web` (`localhost:8080`)
- Nginx proxies `/api/*` -> `api:8000`
- `worker` reads/writes jobs directly via Supabase Postgres
- `worker` calls Ollama via `OLLAMA_URL`

## 5) Performance Recommendations

Use these defaults first:

1. `API_WORKERS=2` in `.env.docker` for moderate concurrency.
2. Keep `hf_cache` volume mounted (already in compose) so Whisper model cache persists across restarts.
3. Use `WHISPER_MODEL=large-v3` for better accuracy; switch to `large-v3-turbo` if throughput is more important.
4. Scale worker replicas for higher job throughput:

```bash
docker compose up -d --scale worker=2
```

5. Keep web as static Nginx delivery (already configured with gzip + SPA fallback + `/api` reverse proxy).

## 6) Troubleshooting

- API unhealthy:
  - Check `docker compose logs api`
  - Verify `SUPABASE_DB_URL` connectivity and credentials.

- Worker not processing:
  - Check `docker compose logs worker`
  - Confirm `OLLAMA_URL` is reachable from inside container.
  - If using local Ollama service, run with `--profile ollama`.

- Frontend auth/API errors:
  - Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
  - Verify API has matching Supabase project values.
