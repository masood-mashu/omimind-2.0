# OMIMIND

**Meeting & Lecture Intelligence** — voice-first capture, searchable meeting memory, and grounded answers.

OMIMIND receives Omi conversation webhooks or browser speech transcripts, embeds each spoken segment locally, persists user-scoped vectors in Qdrant, and retrieves relevant evidence before asking Lyzr to answer or analyze a meeting. The React dashboard shows meeting history, action items, and grounded memory context. Supabase Auth verifies the signed-in user before dashboard data is accessed.

```mermaid
flowchart LR
    O[Omi app or device] -->|HTTPS transcript webhook| F[FastAPI]
    M[Browser microphone] -->|Speech transcript| F
    S[Supabase Auth] -->|Verified access token| F
    F -->|FastEmbed, 384 dimensions| Q[(Qdrant)]
    U[React dashboard] -->|Authenticated question or meeting analysis| F
    F -->|user-scoped semantic search| Q
    Q -->|meeting snippets| F
    F -->|grounded recall or action extraction| L[Lyzr Studio agents]
    L -->|answer, summary, decisions, actions| F
    F --> U
```

## Start locally on Windows

Requirements: Python 3.10+, Node.js 20+, and a Lyzr Studio agent. Qdrant can run embedded on disk locally; Qdrant Cloud is recommended for a deployed demo. The first embedding request downloads `BAAI/bge-small-en-v1.5`.

1. Create `.env` from `.env.example` and set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `OMI_WEBHOOK_TOKEN`, `LYZR_API_KEY`, and `LYZR_AGENT_ID`. Supabase Auth must allow the user to sign in (and sign up if needed). The Lyzr ID and key are available from the agent's API details. Leave `QDRANT_URL` blank for local storage.

   ```powershell
   Copy-Item .env.example .env
   ```

2. Install the backend and frontend dependencies.

   ```powershell
   py -3.11 -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r server\requirements.txt
   npm install --prefix frontend
   ```

3. Start the API from the project root.

   ```powershell
   uvicorn server.app:app --reload --port 8000
   ```

4. In a second terminal, start the React dashboard.

   ```powershell
   npm run dev
   ```

   Open the Vite URL printed in the terminal. The dashboard uses `/api` routes through the local Vite proxy.

## Connect Omi

Sign in to OMIMIND and copy the **Verified workspace ID** from Settings. Set `OMI_WEBHOOK_UID` to that ID and restart the backend. Expose port 8000 with an HTTPS tunnel, then configure these webhook URLs in the Omi app's Developer Mode, replacing the token and workspace ID:

- Completed conversation: `https://YOUR-TUNNEL/api/omi/conversation/YOUR_OMI_WEBHOOK_TOKEN?uid=YOUR_WORKSPACE_ID`
- Realtime transcript: `https://YOUR-TUNNEL/api/omi/realtime/YOUR_OMI_WEBHOOK_TOKEN?uid=YOUR_WORKSPACE_ID&session_id=YOUR_SESSION_ID`

The token must exactly match `OMI_WEBHOOK_TOKEN`, and the URL's `uid` must match `OMI_WEBHOOK_UID`. Dashboard API routes derive the workspace ID from a Supabase-verified bearer token; caller-supplied IDs are no longer accepted for reads or questions. The backend accepts Omi's `transcript_segments` (including `speaker_name`) and `structured.action_items` (including `due_at` and `completed`), plus `segments`, `transcript`, and `text` fallbacks. Omi's webhook settings vary by app version; inspect a sample payload on webhook.site if the field names differ.

The webhook token is in the endpoint path so Omi can call it without custom headers. Treat the webhook URL as a secret and rotate the token if it is exposed.

## Ask a question

The API retrieves matching snippets for the same Omi user ID and passes those snippets and the question to Lyzr. Answers explicitly fail if Lyzr is not configured or unavailable; local preview content is never returned as a Lyzr answer.

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/ask `
  -ContentType 'application/json' `
  -Headers @{ Authorization = 'Bearer YOUR_SUPABASE_ACCESS_TOKEN' } `
  -Body '{"question":"What action items did we agree on?"}'
```

Useful endpoints: public `GET /health` and `GET /api/auth/config`; authenticated `GET /api/me`, `GET /api/meetings`, `GET /api/memories`, `GET /api/actions`, `POST /api/ingest`, `POST /api/analyze`, and `POST /api/ask`.

## Deploy

### Replit

The project includes `.replit` to build the React app and run FastAPI as one service. Add `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `OMI_WEBHOOK_TOKEN`, `OMI_WEBHOOK_UID`, `LYZR_API_KEY`, `LYZR_AGENT_ID`, `LYZR_ACTION_EXTRACTOR_AGENT_ID`, `LYZR_MANAGED_AGENTS`, `QDRANT_URL`, and `QDRANT_API_KEY` in Replit's Secrets panel. For a Lyzr Manager Agent, set `LYZR_AGENT_ID` to the manager and `LYZR_MANAGED_AGENTS` to a JSON array of its sub-agents (`id`, `name`, `usage_description`); the backend includes these with inference requests so the manager can delegate. Use Qdrant Cloud for durable memory; local embedded Qdrant data may be lost when a deployment is replaced. Set `ALLOWED_ORIGINS` to the public app URL if the UI is hosted separately.

### Vercel frontend + Replit backend

Import this repository into Vercel with the **Root Directory** set to `frontend`. Set `VITE_API_BASE_URL` to the deployed Replit API base URL. Add that exact Vercel origin to the backend's `ALLOWED_ORIGINS`. Keep Lyzr and Qdrant secrets in the backend only. Vercel hosts the React UI; it does not host this FastAPI/Qdrant service through the included static Vite config.

## Current scope

- Omi completed and realtime transcript ingestion, bound to the configured workspace ID.
- Browser speech capture and authenticated transcript ingestion.
- Persistent Qdrant vectors with user-scoped retrieval.
- Supabase Auth sign-in and server-verified workspace identity.
- Lyzr-grounded memory Q&A plus meeting summaries, decisions, and action extraction.
- Omi structured and Lyzr-extracted action items in the React dashboard.
- Sample preview data is labeled in the UI and is not sent as real memory.
- A read-only demo workspace lets reviewers explore sample screens without creating an account; live capture and private-memory queries still require sign-in.

The dashboard's completion toggles are currently browser-local. Dashboard reads and questions require Supabase Auth; Omi ingestion is bound to one configured workspace ID and a private token. Browser speech recognition may be processed by the browser's speech service.

## Hackathon timing

The user reports the active submission portal deadline is **8:00 PM IST on 14 October 2026**. The public event listing may still show the earlier timeline, so follow the active portal status and retain its confirmation.
