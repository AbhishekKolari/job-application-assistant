<!-- # JobFlow AI -->
<h1 align="center"> JobFlow AI: Tailored Job Studio</h1>

<div align="center">

JobFlow AI is a local full-stack assistant that streamlines every step of a modern job hunt: upload one resume, search live roles, score them with LLMs on demand, tailor documents, and track progress with a live dashboard. The app is built for power users who want human-grade polish with automatic guardrails around expensive AI calls.

![JobFlow AI screenshot](image.png)

</div>

## ✨ Highlights

- **On-demand scoring** – Jobs are only scored when you click "Score job", keeping LLM usage predictable.
- **Tailoring workspace** – Side-by-side editors generate resume + cover letter drafts seeded from your instructions.
- **Tracker dashboard** – Visual pipeline with weekly submissions, status trends, and cached scores.
- **Google Drive export** – Push tailored docs directly to a connected Drive using the user’s OAuth tokens.
- **Manual job sourcing** – Integrates with RapidAPI’s JSearch (or fallback sample data) with cached scores across views.

## 🧱 Tech Stack

| Layer      | Tools |
|------------|-------|
| Frontend   | React 18, TypeScript, Vite, Zustand, React Query, Recharts |
| Backend    | FastAPI, SQLModel, Async SQLAlchemy, PostgreSQL |
| AI layer   | Ollama (LLM inference through LangChain) |
| Auth / Drive | Google OAuth2, Drive API |

## 🔧 Prerequisites

- **Python 3.11+** and **Node 18+**
- **PostgreSQL** database (local or cloud)
- **Ollama** running locally with an available model (defaults to `qwen3:4b` – update `OLLAMA_MODEL` if needed)
- **Google Cloud project** with OAuth credentials (Web type) and Drive API enabled
- **RapidAPI JSearch key** (or another provider wired into `JOB_SEARCH_PROVIDER`)
- **JWT secret** – generate a 32–64 char random string (hex/base64) for `JWT_SECRET_KEY`

## 🚀 Quick Start

1. **Clone & install**

   ```bash
   git clone https://github.com/your-org/job-application-assistant.git
   cd job-application-assistant
   
   # Backend
   cd backend
   python -m venv .venv && .venv\Scripts\activate
   pip install -r requirements.txt
   
   # Frontend
   cd ../frontend
   npm install
   ```

2. **Configure environment** (backend `.env`)

   ```dotenv
   DATABASE_URL=postgresql+psycopg://username:password@localhost:5432/job_assistant
   JWT_SECRET_KEY=change-me
   OLLAMA_HOST=http://localhost:11434
   OLLAMA_MODEL=qwen3:4b
   JOB_SEARCH_PROVIDER=jsearch
   JOB_SEARCH_API_KEY=<rapidapi-key>
   GOOGLE_CLIENT_ID=<oauth-client-id>
   GOOGLE_CLIENT_SECRET=<oauth-client-secret>
   GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback
   FRONTEND_ORIGINS=["http://localhost:5173"]
   ```

   - Set authorized JavaScript origins / redirect URIs in Google Cloud to match `localhost:5173` and the redirect above.

3. **Run services**

   ```bash
   # backend
   cd backend
   uvicorn app.main:app --reload
   
   # frontend (new terminal)
   cd frontend
   npm run dev -- --host
   ```

4. **Connect Google & Ollama**
   - Visit the app, sign in with Google, and grant Drive scope so tailored docs can be saved/exported.
   - Ensure Ollama is running: `ollama pull qwen3:4b` (or any compatible model) before scoring/tailoring.

## 🔁 Workflow Overview

1. **Upload resumes** – Drag/drop PDFs on the home page; metadata and parsed text are stored securely.
2. **Define a search** – Select city + country, work mode, experience level, and optional keyword filters.
3. **Fetch roles** – Jobs load from JSearch (or fallback) and sync to the tracker state.
4. **Manual scoring** – Use the "Score job" button per card; cached scores populate the tailoring workspace & dashboard.
5. **Tailor & export** – Generate resume / cover-letter drafts, iterate, and push final docs to Google Drive.
6. **Track progress** – Update application status, watch weekly activity charts, and prune stale roles.

## 💡 Notes & Tips

- **Trying new job APIs**: Add a fetch helper (see `_fetch_from_jsearch`) and switch `JOB_SEARCH_PROVIDER` / API key in `.env`.
- **JWT secret hygiene**: regenerate periodically and avoid reusing across environments.
- **Google OAuth**: when running locally, ensure your Google project has `http://localhost:5173` and the callback URL in the allowed list or auth will silently fail.
- **First-time scoring**: keep Ollama running before hitting \"Score job\" to avoid timeouts.
- **Production deployment**: move credentials to a secret manager and use HTTPS for both backend + frontend origins.

Happy job hunting! 🎯
