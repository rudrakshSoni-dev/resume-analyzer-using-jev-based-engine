# JEV Resume Analyzer

A full-stack resume compatibility analyzer. Upload a resume, paste a job
description, and get a 0–100 ATS/compatibility score from the JEV scoring
engine.

## How it works

```
Register / Login
      ↓
Upload resume (PDF) + paste job description
      ↓
JEV engine scores the match
      ↓
Score + breakdown stored and shown on the dashboard
      ↓
Previous analyses viewable in history
```

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL (Neon) via Prisma ORM |
| Auth | Email/password, bcrypt/Argon2, JWT in HTTP-only cookies |
| Resume processing | Multer (upload) + PDF text extraction |
| Scoring | JEV engine — pure module, no knowledge of HTTP/DB/auth |

## Project structure

```
jev-resume-analyzer/
├── apps/
│   ├── web/            # Next.js frontend
│   │   ├── app/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── dashboard/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── hooks/
│   │   └── types/
│   │
│   └── api/             # Express backend
│       ├── src/
│       │   ├── config/
│       │   ├── controllers/
│       │   ├── services/
│       │   ├── routes/
│       │   ├── middleware/
│       │   ├── engine/jev/    # scoring logic lives here, isolated
│       │   ├── utils/
│       │   ├── types/
│       │   ├── app.ts
│       │   └── server.ts
│       └── prisma/
│           └── schema.prisma
│
├── packages/shared/
├── CLAUDE.md            # build spec / instructions for Claude Code
├── DESIGN.md            # visual design system
└── README.md
```

## Getting started

### Prerequisites

- Node.js
- A Neon PostgreSQL database

### Setup

```bash
# install dependencies
npm install

# set up environment variables (see below)

# run Prisma migrations
cd apps/api
npx prisma migrate dev

# start both apps in dev mode
npm run dev
```

### Environment variables

**`apps/api/.env`**
```env
DATABASE_URL="postgresql://<user>:<password>@<neon-host>/<db>?sslmode=require"
JWT_SECRET="<generate with: openssl rand -base64 32>"
PORT=5000
CLIENT_URL="http://localhost:3000"
```

**`apps/web/.env.local`**
```env
NEXT_PUBLIC_API_URL="http://localhost:5000"
```

Neither `.env` file should ever be committed — both are gitignored.

## API overview

| Endpoint | Description |
|---|---|
| `POST /api/auth/register` | Create an account |
| `POST /api/auth/login` | Log in |
| `GET /api/auth/me` | Current user |
| `POST /api/auth/logout` | Log out |
| `POST /api/resumes` | Upload a resume (multipart/form-data) |
| `POST /api/jobs` | Create a job description |
| `GET /api/jobs` | List job descriptions |
| `DELETE /api/jobs/:id` | Delete a job description |
| `POST /api/analysis` | Run JEV analysis on a resume + job description pair |

All resource endpoints are ownership-scoped to the authenticated user.

## Development principles

Simple, explicit, typed, modular, testable. This is an MVP — no
microservices, no Redis, no message queues, no unnecessary infrastructure
unless explicitly required.

<!-- 
## Status

Under active development. See `CLAUDE.md` for the full build plan and
`DESIGN.md` for the visual design system. -->