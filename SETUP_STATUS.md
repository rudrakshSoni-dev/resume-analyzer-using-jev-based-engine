# JEV Resume Analyzer — Setup & Phase Status

**Current Status**: Phase 0, Phase 1, and Phase 2 Complete ✓  
**Next Active Phase**: **Phase 3 — Resume Upload**

---

## 📊 Phase Roadmap & Progress

| Phase | Description | Status | Verification |
|---|---|---|---|
| **Phase 0** | Monorepo & Environment Setup | ✅ Complete | Workspaces, TypeScript, Next.js, Express, Shared packages pass typecheck |
| **Phase 1** | Database Schema (Prisma + Neon) | ✅ Complete | Schema models (`User`, `Resume`, `JobDescription`, `Analysis`) & migration applied |
| **Phase 2** | Authentication API | ✅ Complete | JWT HTTP-only cookies, register/login/me/logout, `passwordHash` hidden, `test-auth.sh` |
| **Phase 3** | Resume Upload API | ⏳ **Next Up** | Multer PDF upload, text extraction, user scoping, ownership checks |
| **Phase 4** | Job Descriptions API | ⏳ Pending | CRUD endpoints (`POST`, `GET`, `DELETE`), user scoping |
| **Phase 5** | JEV Scoring Engine | ⏳ Pending | Isolated pure scoring function, zero framework dependencies, unit tests |
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
- Comprehensive test script created at `apps/api/test-auth.sh`

---

## ⏳ NEXT STEP — Phase 3: Resume Upload

**Goal:** Allow authenticated users to upload PDF resumes, extract the raw text, and store it scoped to their `userId`.

### Requirements per CLAUDE.md:
1. **POST /api/resumes**
   - Multer middleware with `multipart/form-data` and field name `"resume"`
   - File validation: PDF only (`application/pdf`) and enforce size limit (max 5MB)
   - Extract raw text from PDF and save in `Resume.rawText`
   - Scoped strictly to `req.user.id`
2. **GET /api/resumes**
   - List resumes owned by the authenticated user
3. **Hard Constraint**:
   - Do not place any PDF parsing or extraction logic into the future JEV engine folder (`apps/api/src/engine/jev/`).
4. **Ownership Verification**:
   - Ensure users cannot access or view another user's uploaded resumes.
