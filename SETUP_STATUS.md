# JEV Resume Analyzer — Setup & Phase Status

**Current Status**: Phase 0, Phase 1, Phase 2, Phase 3, and Phase 4 Complete ✓  
**Next Active Phase**: **Phase 5 — JEV Engine (Isolated Module)**

---

## 📊 Phase Roadmap & Progress

| Phase | Description | Status | Verification |
|---|---|---|---|
| **Phase 0** | Monorepo & Environment Setup | ✅ Complete | Workspaces, TypeScript, Next.js, Express, Shared packages pass typecheck |
| **Phase 1** | Database Schema (Prisma + Neon) | ✅ Complete | Schema models (`User`, `Resume`, `JobDescription`, `Analysis`) & migration applied |
| **Phase 2** | Authentication API | ✅ Complete | JWT HTTP-only cookies, register/login/me/logout, `passwordHash` hidden, `test-auth.sh` |
| **Phase 3** | Resume Upload API | ✅ Complete | Multer PDF upload, text extraction, user scoping, ownership checks, `test-resume.sh` |
| **Phase 4** | Job Descriptions API | ✅ Complete | CRUD endpoints (`POST`, `GET`, `DELETE`), user scoping, ownership checks, `test-job.sh` |
| **Phase 5** | JEV Scoring Engine | ⏳ **Next Up** | Isolated pure scoring function, zero framework dependencies, unit tests |
| **Phase 6** | Analysis API | ⏳ Pending | `POST /api/analysis` (orchestrating resume + JD + engine), `GET /api/analysis` |
| **Phase 7** | Frontend: Auth & Dashboard | ⏳ Pending | Next.js UI following `DESIGN.md` (monospace, 0 border-radius, brutalist) |
| **Phase 8** | End-to-End Wiring Pass | ⏳ Pending | 14-step Definition of Done verification, end-to-end integration |
| **Phase 9** | Security & Error-Handling Pass | ⏳ Pending | Centralized error sanitization, leak checks, penetration & ownership audits |

---

## ✅ Phase 0 — Monorepo Skeleton

The monorepo structure is fully set up:

```
✓ apps/api/          — Express + TypeScript API (port 3001)
✓ apps/web/          — Next.js + Tailwind frontend (port 3000)
✓ packages/shared/   — Shared types
✓ Root workspaces    — npm workspaces configured
✓ TypeScript         — Base config + per-app configs
✓ .gitignore         — Proper exclusions (.env, node_modules, build info)
```

**Verified:**
- ✓ `npm install` succeeds across all workspaces
- ✓ `npm run typecheck` passes with 0 errors
- ✓ API health check works: `GET http://localhost:3001/api/health` → `{"status":"ok"}`
- ✓ `.env` is gitignored and `.env.example` is documented

---

## ✅ Phase 1 — Database Schema (Prisma + Neon)

**Prisma schema created** at `apps/api/prisma/schema.prisma` with four models:
- **User** (`users` table) — `id`, `email`, `passwordHash`, `createdAt`, `updatedAt`
- **Resume** (`resumes` table) — `id`, `userId`, `filename`, `rawText` (Text), `fileSize`, `createdAt`, `updatedAt`
- **JobDescription** (`job_descriptions` table) — `id`, `userId`, `title`, `company`, `description` (Text), `createdAt`, `updatedAt`
- **Analysis** (`analyses` table) — `id`, `userId`, `resumeId`, `jobDescriptionId`, `score` (0–100), `createdAt`, `updatedAt`

**Verified:**
- ✓ All foreign keys use `onDelete: Cascade` and indexed foreign keys/timestamps
- ✓ Initial migration `20260926125322_init` generated and applied to PostgreSQL database

---

## ✅ Phase 2 — Authentication

Implemented per `CLAUDE.md` sections 6 and 12:

**Endpoints:**
- `POST /api/auth/register` — Hashes password with bcrypt (10 rounds), checks for duplicate email, creates user
- `POST /api/auth/login` — Validates credentials, generates JWT signed with `JWT_SECRET` (7d expiry), sets HTTP-only cookie
- `GET /api/auth/me` — Protected by `authMiddleware`, returns `{ user: { id, email, createdAt } }`
- `POST /api/auth/logout` — Clears the JWT cookie

**Architecture & Security:**
- Controller -> Service -> Prisma architecture maintained
- `passwordHash` is never exposed in any API response
- `authMiddleware` validates JWT from cookies and sets `req.user = { id }`
- Centralized error handler produces `{ error: { message } }`
- Comprehensive test script at `apps/api/test-auth.sh` passes 100%

---

## ✅ Phase 3 — Resume Upload

Implemented per `CLAUDE.md` section 7 and verified:

**Endpoints:**
- `POST /api/resumes` — Protected by `authMiddleware`, parses multipart form-data via Multer (field: `resume`), validates PDF mime/extension and 5MB limit, extracts raw text via `pdf-parse`, stores resume scoped to `req.user.id`
- `GET /api/resumes` — Lists all resumes owned by authenticated user
- `GET /api/resumes/:id` — Retrieves a single resume with strict user ownership validation (returns 404 if not found or owned by another user)
- `DELETE /api/resumes/:id` — Deletes a single resume ensuring user ownership

**Architecture & Security:**
- Text extraction logic kept isolated in `apps/api/src/utils/pdf.ts` (not in JEV engine folder)
- Multer file size limit enforced (max 5MB) and rejects non-PDF files with HTTP 400
- Comprehensive ownership isolation test script at `apps/api/test-resume.sh` passes 100%

---

## ✅ Phase 4 — Job Descriptions

Implemented per `CLAUDE.md` section 8 and verified:

**Endpoints:**
- `POST /api/jobs` — Protected by `authMiddleware`, validates payload with Zod (`title`, optional `company`, `description`), creates job description scoped to `req.user.id` (returns HTTP 201)
- `GET /api/jobs` — Lists all job descriptions owned by authenticated user ordered by `createdAt` descending (returns HTTP 200)
- `GET /api/jobs/:id` — Retrieves a single job description by ID with strict ownership check (returns HTTP 200 or HTTP 404)
- `DELETE /api/jobs/:id` — Deletes a job description with strict ownership check (returns HTTP 200 or HTTP 404)

**Architecture & Security:**
- Controller -> Service -> Prisma architecture maintained (`job.controller.ts`, `job.service.ts`, `job.routes.ts`)
- Validation schema created in `apps/api/src/utils/validation.ts` (`createJobDescriptionSchema`)
- Shared TypeScript types added to `packages/shared/src/index.ts` (`JobDescriptionDto`, `JobDescriptionSummaryDto`, `CreateJobDescriptionInput`)
- Strict ownership isolation enforced: all queries are filtered by `userId: req.user.id`
- Comprehensive test scripts at `apps/api/test-phase4.sh` / `apps/api/test-job.sh` pass 100% (validates creation, listing, individual retrieval, cross-user isolation, cross-user delete prevention, input validation, unauthenticated rejection, deletion verification)

---

## ⏳ NEXT STEP — Phase 5: JEV Engine (Isolated Module)

**Goal:** Implement a pure, deterministic, framework-free scoring function.

### Requirements per CLAUDE.md:
1. **Location**: `apps/api/src/engine/jev/` (`index.ts`, `scorer.ts`, `types.ts`, `utils.ts`)
2. **Contract**: `analyzeResume({ resume, jobDescription }) -> { score }` (returns score 0–100)
3. **Hard Isolation Constraint**: Must not import Express, Prisma, HTTP types, auth, cookies, or frontend code. Takes plain strings and returns a number.
4. **Scoring Logic**: Keyword/skill matching, experience matching, etc.
5. **Unit Tests**: Standalone unit tests running against `analyzeResume()` in total isolation (no database or running API needed).
