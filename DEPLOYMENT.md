# Vercel Deployment Guide — JEV Resume Analyzer

This project is structured as a monorepo containing a **Next.js frontend** (`apps/web`) and an **Express API backend** (`apps/api`). On Vercel, the recommended architecture is deploying both as **two linked Vercel projects** from the same GitHub repository (`rudrakshSoni-dev/resume-analyzer-using-jev-based-engine.git`).

---

## Architecture Overview

```
                        ┌─────────────────────────────────┐
                        │      Client Web Browser         │
                        └────────────────┬────────────────┘
                                         │ Requests (/)
                                         ▼
                        ┌─────────────────────────────────┐
                        │     Vercel Project 1: Web       │
                        │    (Next.js 15 in apps/web)     │
                        └────────────────┬────────────────┘
                                         │ Proxies /api/*
                                         ▼ (via API_URL)
                        ┌─────────────────────────────────┐
                        │     Vercel Project 2: API       │
                        │    (Express in apps/api)        │
                        └────────────────┬────────────────┘
                                         │ Queries
                                         ▼
                        ┌─────────────────────────────────┐
                        │    PostgreSQL Database (Neon)   │
                        └─────────────────────────────────┘
```

---

## Step 1: Push Changes to GitHub

Commit the deployment configuration and push to GitHub:

```bash
git add .
git commit -m "feat: configure Vercel serverless deployment for API and Web monorepo"
git push origin main
```

---

## Step 2: Deploy Project 1 — API Backend (`apps/api`)

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New..." → "Project"**.
2. Select your repository: `resume-analyzer-using-jev-based-engine`.
3. Configure the project:
   - **Project Name**: `resume-analyzer-api` (or your choice)
   - **Framework Preset**: `Other`
   - **Root Directory**: Click *Edit* and select **`apps/api`**.
   - Check **"Include source files outside of the Root Directory in the Build Cache"** (checked by default for monorepos).
4. Configure **Build and Output Settings**:
   - **Build Command**: `npm run build` (runs `prisma generate && tsc`)
   - **Output Directory**: Leave empty / default
   - **Install Command**: Leave default (`npm install`)
5. Configure **Environment Variables**:
   | Variable | Value | Notes |
   |---|---|---|
   | `DATABASE_URL` | `postgresql://...` | Your Neon PostgreSQL connection string (`?sslmode=require`) |
   | `JWT_SECRET` | `<cryptographic-secret>` | Secret key for JWT signing |
   | `JWT_EXPIRES_IN` | `7d` | Optional (default: `7d`) |
   | `NODE_ENV` | `production` | Production mode |
   | `CORS_ORIGIN` | `*` (or your frontend URL) | Can update with frontend domain once deployed |
6. Click **Deploy**.
7. Once deployed, copy your API URL:  
   👉 E.g., `https://resume-analyzer-api.vercel.app`

---

## Step 3: Deploy Project 2 — Web Frontend (`apps/web`)

1. Go back to your [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New..." → "Project"**.
2. Select the same repository: `resume-analyzer-using-jev-based-engine`.
3. Configure the project:
   - **Project Name**: `resume-analyzer-web` (or your choice)
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Click *Edit* and select **`apps/web`**.
   - Check **"Include source files outside of the Root Directory in the Build Cache"** (checked by default).
4. Configure **Environment Variables**:
   | Variable | Value | Notes |
   |---|---|---|
   | `API_URL` | `https://resume-analyzer-api.vercel.app` | The backend URL from **Step 2** (without trailing slash) |
5. Click **Deploy**.
6. Once deployed, open your live frontend domain!

---

## Step 4: Finalize CORS (Optional & Recommended)

1. In the **`resume-analyzer-api`** project settings on Vercel:
   - Navigate to **Settings → Environment Variables**.
   - Set `CORS_ORIGIN` to your live frontend URL (e.g. `https://resume-analyzer-web.vercel.app`).
   - Redeploy or trigger a new deployment for the change to take effect.

---

## Verification Checklist

- [ ] Visit `https://<your-api-domain>/api/health` → returns `{"status":"ok"}`.
- [ ] Visit `https://<your-web-domain>/` → redirects to `/login`.
- [ ] Register a new user at `https://<your-web-domain>/register`.
- [ ] Upload a resume PDF and create a job description on `/dashboard`.
- [ ] Click **Analyze Resume** and verify the match score and dimensional breakdown render smoothly.
