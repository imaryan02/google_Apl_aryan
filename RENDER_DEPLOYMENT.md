# Deploy Backend on Render

Use this guide to deploy the FastAPI backend on Render after deploying the frontend on Vercel.

## What Is Already Configured

- `backend/Dockerfile` starts FastAPI with Uvicorn.
- The server binds to `0.0.0.0`.
- The server uses Render's `$PORT`.
- `render.yaml` is configured for the monorepo backend.
- The backend seeds demo data only when the database is empty.
- CORS can be configured with `CORS_ORIGINS`.

## Option A: Deploy Using `render.yaml`

1. Push this repository to GitHub.
2. Open Render.
3. Click **New**.
4. Select **Blueprint**.
5. Connect this repository.
6. Keep the blueprint path as:

```txt
render.yaml
```

7. Deploy the blueprint.

Render will build the Docker service from:

```txt
backend/Dockerfile
```

## Option B: Deploy Manually as a Web Service

1. Open Render.
2. Click **New**.
3. Select **Web Service**.
4. Connect your GitHub repository.
5. Use these settings:

```txt
Name: ai-stadium-command-center-api
Runtime: Docker
Root Directory: leave empty
Dockerfile Path: ./backend/Dockerfile
Docker Build Context Directory: ./backend
Health Check Path: /
```

No custom start command is required because the Dockerfile already has:

```txt
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

## Environment Variables

For the quickest demo, the backend can run with SQLite and no required environment variables.

Recommended production/demo variables:

```env
CORS_ORIGINS=https://your-vercel-app.vercel.app,http://localhost:5173
```

If you use PostgreSQL or Supabase:

```env
DATABASE_URL=postgresql://user:password@host:5432/database
```

If your AI routes need Gemini:

```env
GOOGLE_API_KEY=your_google_api_key
```

## Connect Vercel Frontend to Render Backend

After Render deploys, copy your backend URL. It will look like:

```txt
https://ai-stadium-command-center-api.onrender.com
```

In Vercel, set this environment variable for the frontend:

```env
VITE_API_BASE_URL=https://ai-stadium-command-center-api.onrender.com
```

Then redeploy the Vercel frontend.

## Test URLs

Open:

```txt
https://your-render-service.onrender.com/
```

Expected response:

```json
{
  "status": "online",
  "service": "AI Stadium Command Center API",
  "docs_url": "/docs"
}
```

Then test:

```txt
https://your-render-service.onrender.com/api/dashboard/init
```

You should receive zones, routes, alerts, VIP movements, and AI recommendations.

## Notes

- SQLite on Render is fine for a hackathon demo, but data can reset when the service is rebuilt.
- For more persistent data, use Render PostgreSQL or Supabase and set `DATABASE_URL`.
- Render free services can sleep when inactive, so the first request after inactivity may be slow.
