# JEV Resume Analyzer

A full-stack resume compatibility analyzer built as a high-performance monorepo. Upload a resume, paste a job description, and get a 0–100 ATS/compatibility match score and multi-dimensional breakdown computed by the isolated JEV scoring engine.

---

## How It Works

```
Register / Login
      ↓
Upload resume (PDF) + create job description
      ↓
JEV scoring engine evaluates compatibility (pure function)
      ↓
Score (0–100) + dimensional breakdown saved and displayed on dashboard
      ↓
Historical analyses preserved with strict user ownership isolation
```

---

## Tech Stack

| Layer | Stack |
|---|---|
| **Frontend** | Next.js 15 (React 19), TypeScript, Tailwind CSS, Monospace Brutalist UI (`DESIGN.md`) |
| **Backend** | Node.js, Express, TypeScript, Zod |
| **Database** | PostgreSQL (Neon) via Prisma ORM |
| **Auth** | Email/password, bcrypt (salt rounds: 10), signed JWT in `HttpOnly` `SameSite=Strict` cookies |
| **Resume Processing** | Multer (`application/pdf`, 5MB limit, `%PDF` magic bytes validation) + `pdf-parse` |
| **Scoring Engine** | JEV engine — pure, framework-free module (zero dependencies on HTTP, DB, or auth) |
| **Shared** | `@jev/shared` package for cross-app DTOs and type contracts |

---

## Project Structure

```
jev-resume-analyzer/
├── apps/
│   ├── web/                    # Next.js frontend (Port 3000)
│   │   ├── src/
│   │   │   ├── app/            # App router (/login, /register, /dashboard, /dashboard/analysis/[id])
│   │   │   ├── components/     # Monospace brutalist UI components (DESIGN.md)
│   │   │   ├── lib/            # API client and auth context
│   │   │   └── middleware.ts   # Route protection middleware
│   │   └── next.config.ts      # API proxy rewrite to port 3002
│   │
│   └── api/                    # Express backend (Port 3002)
│       ├── src/
│       │   ├── controllers/    # Thin HTTP request handlers
│       │   ├── services/       # Business logic and database access
│       │   ├── routes/         # Express route definitions
│       │   ├── middleware/     # Auth & Multer upload middlewares
│       │   ├── engine/jev/     # Pure JEV scoring engine (isolated)
│       │   ├── utils/          # PDF extraction and Zod validation
│       │   └── index.ts        # Express app entrypoint & error handler
│       └── prisma/
│           ├── schema.prisma   # User, Resume, JobDescription, Analysis models
│           └── migrations/     # Prisma migration history
│
├── packages/
│   └── shared/                 # Shared TypeScript interfaces & DTOs
├── test-security-phase9.sh     # Phase 9 automated security verification suite
├── test-e2e-phase8.sh          # Phase 8 14-step definition of done test suite
├── AGENTS.md                   # 10-phase build plan & coding reliability rules
├── DESIGN.md                   # Brutalist monospace design specification
├── SETUP_STATUS.md             # Detailed implementation & verification log
└── package.json                # Monorepo root workspaces config
```

---

## Getting Started

### Prerequisites

- Node.js (v18+)
- A Neon PostgreSQL database (or any PostgreSQL instance)

### Installation & Setup

```bash
# 1. Install dependencies across all monorepo workspaces
npm install

# 2. Configure environment variables in apps/api/.env
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your DATABASE_URL and JWT_SECRET

# 3. Run Prisma database migrations
cd apps/api
npx prisma migrate dev
cd ../..

# 4. Start both API (port 3002) and Web (port 3000) in dev mode
npm run dev
```

### Environment Variables

**`apps/api/.env`**
```env
DATABASE_URL="postgresql://<user>:<password>@<neon-host>/<db>?sslmode=require"
JWT_SECRET="<cryptographically-secure-random-string>"
PORT=3002
CORS_ORIGIN="http://localhost:3000"
NODE_ENV="development"
MAX_FILE_SIZE=5242880
PASSWORD_HASH_ROUNDS=10
```

**`apps/web/.env.local`** (Optional — defaults to `http://localhost:3002`)
```env
API_URL="http://localhost:3002"
```

*Note: Neither `.env` nor `.env.local` should ever be committed to source control.*

---

## API Overview

All resource endpoints are strictly ownership-scoped to the authenticated user via `req.user.id`.

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/health` | Health check endpoint | No |
| `POST` | `/api/auth/register` | Register user (`email`, `password`) | No |
| `POST` | `/api/auth/login` | Login and set `HttpOnly` JWT cookie | No |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | **Yes** |
| `POST` | `/api/auth/logout` | Clear auth cookie | No |
| `POST` | `/api/resumes` | Upload resume PDF (`multipart/form-data`) | **Yes** |
| `GET` | `/api/resumes` | List resumes owned by current user | **Yes** |
| `GET` | `/api/resumes/:id` | Get resume details & extracted text | **Yes** |
| `DELETE` | `/api/resumes/:id` | Delete user resume | **Yes** |
| `POST` | `/api/jobs` | Create job description (`title`, `company`, `description`) | **Yes** |
| `GET` | `/api/jobs` | List job descriptions owned by current user | **Yes** |
| `GET` | `/api/jobs/:id` | Get job description details | **Yes** |
| `DELETE` | `/api/jobs/:id` | Delete job description | **Yes** |
| `POST` | `/api/analysis` | Analyze user resume + job description pair | **Yes** |
| `GET` | `/api/analysis` | List analysis history for current user | **Yes** |
| `GET` | `/api/analysis/:id` | Get single analysis result & dimensional breakdown | **Yes** |
| `DELETE` | `/api/analysis/:id` | Delete analysis record | **Yes** |

---

## Verification & Testing

The codebase includes comprehensive test suites covering unit isolation, integration, security, and full end-to-end flows:

```bash
# Typecheck across all workspaces (@jev/api, @jev/web, @jev/shared)
npm run typecheck

# Run JEV scoring engine unit tests in isolation (no DB/network required)
npm test --workspace=@jev/api

# Run Phase 9 Security & Error-Handling verification suite
./test-security-phase9.sh

# Run Phase 8 End-to-End Definition of Done suite (14-step verification)
./test-e2e-phase8.sh

# Individual phase API integration tests:
./apps/api/test-auth.sh        # Phase 2: Auth verification
./apps/api/test-resume.sh      # Phase 3: Resume upload & user scoping
./apps/api/test-job.sh         # Phase 4: Job descriptions CRUD & scoping
./apps/api/test-analysis.sh    # Phase 6: Analysis orchestration & isolation
```

---

## Security & Architecture Highlights

- **Strict Resource Ownership**: Every query on resumes, job descriptions, and analyses enforces `where: { id, userId: req.user.id }`. Unauthorized access attempts are rejected with HTTP 404 to avoid leaking resource existence.
- **Zero Credential Leakage**: `passwordHash`, `DATABASE_URL`, and `JWT_SECRET` are never returned in responses or leaked in error handlers.
- **Centralized Error Handling**: Uniform `{ error: { message } }` format across all endpoints with zero stack trace exposure in production.
- **Upload Hardening**: Enforces MIME validation, file extension checks, 5MB limits, and `%PDF` magic bytes verification.
- **Isolated Scoring Core**: The JEV engine (`apps/api/src/engine/jev`) is a pure algorithm with zero framework, HTTP, or database dependencies.

---

## Status

✅ **All Phases (0 through 9) Complete**. Production-ready, fully hardened, and verified.  
See [`SETUP_STATUS.md`](./SETUP_STATUS.md) for full phase logs and [`AGENTS.md`](./AGENTS.md) for the project specification.