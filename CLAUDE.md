# JEV Resume Analyzer — Claude Code Build Plan

This turns your `CLAUDE.md` into an execution sequence: 10 phases, each scoped
to one Claude Code session, each ending in something you can actually verify
before moving on. Don't let Claude jump ahead to Phase 5 while Phase 2 is
still shaky — the ownership bugs in this app (leaking another user's resume)
come from skipping verification, not from bad code generation.

**Rule for every phase:** Plan Mode first (`Shift+Tab` twice, or `/plan`), review
the plan, approve, execute, then run typecheck + tests before starting the next
phase.

---

## Phase 0 — Repo & environment setup

**Goal:** monorepo skeleton exists, nothing functional yet.

Prompt:
```
Read CLAUDE.md fully before doing anything else.

Set up the monorepo skeleton exactly as described in section 4 (Repository
Structure). Initialize:
- apps/web as a Next.js + TypeScript + Tailwind app
- apps/api as a Node + Express + TypeScript app
- packages/shared for types shared between them
- Root package.json with workspaces configured for a monorepo

Do not add Prisma, auth, or any feature code yet. Do not add Docker, Redis,
or any infra beyond what section 18 (Development Principles) allows.
Create a .env.example in apps/api matching section 14.

When done, confirm the folder structure matches CLAUDE.md section 4 exactly.
```

**Verify:** folder tree matches section 4. `.env` is in `.gitignore`. Nothing
committed under `apps/api/.env`.

---

## Phase 1 — Database schema (Prisma + Neon)

**Goal:** schema exists and migrates cleanly. No API routes yet.

Prompt:
```
Implement prisma/schema.prisma in apps/api using the models and
relationships in CLAUDE.md section 5 exactly: User, Resume, JobDescription,
Analysis, with the relations listed there.

Do not add fields that aren't in the spec. Run prisma migrate dev and confirm
it succeeds against DATABASE_URL. Do not write any controllers, services, or
routes yet — schema only.
```

**Verify:** migration runs clean. Open Prisma Studio (or psql) and check the
four tables and their foreign keys exist as specified.

---

## Phase 2 — Authentication

**Goal:** register, login, logout, `/api/auth/me` — nothing else touches the
API yet.

Prompt:
```
Implement authentication per CLAUDE.md sections 6 and 12:
- POST /api/auth/register — hash password with bcrypt or Argon2, never store
  plaintext
- POST /api/auth/login — verify password, issue JWT in an HTTP-only cookie
- GET /api/auth/me — return the authenticated user (never passwordHash)
- POST /api/auth/logout — clear the cookie
- Auth middleware that attaches req.user.id

Controllers must stay thin (Controller -> Service -> Prisma, per section 20).
Validate request bodies. Never return passwordHash in any response.

Write a quick manual test plan (curl commands or a short script) I can run
to confirm register -> login -> me -> logout works end to end.
```

**Verify:** run the test plan Claude gives you. Specifically check the
response body from every auth endpoint for a leaked `passwordHash` field —
this is the single most common regression here.

---

## Phase 3 — Resume upload

**Goal:** authenticated users can upload a PDF and get text extracted and
stored.

Prompt:
```
Implement resume upload per CLAUDE.md section 7:
- POST /api/resumes using Multer, multipart/form-data, field name "resume"
- Restrict to PDF only, enforce a file size limit (section 13)
- Extract text on upload, store it in Resume.rawText
- Endpoint must require authentication and set userId from req.user.id

Add GET /api/resumes (list, scoped to the authenticated user only) so I can
confirm uploads worked.

Do not put any parsing logic in the JEV engine folder — that's section 7's
explicit rule.
```

**Verify:** upload a PDF as user A, then try `GET /api/resumes/:id` as user
B for that same resume ID — it must 403/404, not return the file. This is
the ownership check from section 5; test it now, not after Phase 6.

---

## Phase 4 — Job descriptions

**Goal:** CRUD for job descriptions, same ownership rules as resumes.

Prompt:
```
Implement the Job Description API per CLAUDE.md section 8:
POST /api/jobs, GET /api/jobs, DELETE /api/jobs/:id.

Same ownership-scoping pattern as resumes — every query filtered by
userId from req.user.id. Reuse the pattern from Phase 3's resume routes
rather than inventing a new one.
```

**Verify:** same cross-user ownership test as Phase 3, applied to jobs.

---

## Phase 5 — JEV engine (isolated module)

**Goal:** a pure, framework-free scoring function. This is the piece CLAUDE.md
is most protective of — keep it that way.

Prompt:
```
Implement the JEV engine per CLAUDE.md sections 3, 10, and 11.

Location: apps/api/src/engine/jev/ (index.ts, scorer.ts, types.ts, utils.ts)

Contract:
  analyzeResume({ resume, jobDescription }) -> { score }

Hard constraint: this module must not import Express, Prisma, HTTP types,
auth, cookies, or anything from the frontend. It takes two strings and
returns a number 0–100. If you find yourself importing any of those, stop
and use a plain string/number interface instead.

Start with a simple, deterministic scoring approach (keyword/skill match,
experience match, etc. — section 11). Write a few unit tests directly
against analyzeResume() with sample resume/JD strings, independent of the
API or database.
```

**Verify:** open the file and confirm the import list at the top has zero
framework/DB/auth imports. Run the unit tests in isolation (no server, no
DB needed) — if they need a running API to pass, the isolation failed.

---

## Phase 6 — Analysis API (wires everything together)

**Goal:** the actual product flow — resume + JD in, score out, stored.

Prompt:
```
Implement POST /api/analysis per CLAUDE.md section 9:
1. Authenticate the request
2. Validate the resume belongs to the authenticated user
3. Validate the job description belongs to the authenticated user
4. Fetch resume.rawText and job.description
5. Call analyzeResume() from the JEV engine — do not reimplement scoring
   logic here
6. Store the Analysis row
7. Return { id, score }

Also add GET /api/analysis (list past analyses for the authenticated user,
for the dashboard history view).
```

**Verify:** try running analysis on a resume/JD pair that belongs to a
*different* user than the one making the request — should fail ownership
validation before it ever reaches the JEV engine.

---

## Phase 7 — Frontend: auth + dashboard shell

**Goal:** login, register, and a dashboard that can actually call the API.

Prompt:
```
Implement the frontend pages per CLAUDE.md sections 15–16:
- /login, /register — forms calling the auth API, redirect to /dashboard
  on success
- /dashboard — resume upload control + job description input + "Analyze"
  button (section 16's flow), plus a list of previous analyses
- /dashboard/analysis/[id] — shows one analysis result

Keep the UI simple per section 16 — no animation work, no component
library rabbit holes. The score should be visually prominent (e.g. "82/100"
large and clear).
```

**Verify:** click through register → login → dashboard manually in the
browser. Don't just trust that the API contract matches — the field names
Claude's frontend expects and the field names the backend returns are a
classic mismatch point.

---

## Phase 8 — End-to-end wiring pass

**Goal:** close every gap between frontend and backend found in manual use.

Prompt:
```
I tested the app manually and found these issues: [paste your actual list
here after using the app end to end]. Fix them without introducing new
abstractions, and re-run through the flow in section 21 (Definition of
Done) after each fix.
```

**Verify:** run through all 14 steps in CLAUDE.md section 21 yourself, in
order, as a real user would — register, login, upload, paste JD, analyze,
see score, log out, log back in, confirm history persisted.

---

## Phase 9 — Security & error-handling pass

**Goal:** close the gaps that don't show up in happy-path testing.

Prompt:
```
Do a security and error-handling review against CLAUDE.md sections 12, 13,
and 17:
- Confirm no endpoint returns passwordHash, DATABASE_URL, or JWT_SECRET
- Confirm every resource-owning endpoint checks userId, not just resource ID
- Confirm centralized error handling returns the { error: { message } }
  shape from section 17, with no stack traces in production responses
- Confirm file upload validates type and size before processing

List anything you find, and fix it.
```

**Verify:** spot-check the actual HTTP responses (not just the code) for a
few endpoints in an error state — a 500 with a stack trace leaking to the
client is the failure mode to catch here.

---

## Notes on running this efficiently

- **Don't skip the ownership tests.** Every phase from 3 onward has one.
  This app's whole trust boundary is "can user A see user B's data,"
  and CLAUDE.md calls this out three separate times for a reason.
- **Keep JEV pure.** If a later phase asks Claude to "just quickly add
  the user's name to the score calculation for logging," that's the
  moment section 3's isolation rule gets violated. Push back on it.
- **One phase per session where possible.** It keeps the diff reviewable
  and keeps Claude's context focused on one contract instead of the
  whole app at once.
- **Use Plan Mode's output as your commit message scaffold** — the task
  list Claude proposes before executing is usually a good changelog for
  that phase once it's done.