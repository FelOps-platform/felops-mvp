# Felops MVP

The Arabic-first AI support agent that can act — with your approval.

Felops lets an Egyptian small business add its own pages, PDFs, and FAQs, then answer
customers in Arabic or English with citations. A human can take over a conversation at any
time, and sensitive HTTP actions (refunds, account changes) wait in an approval queue with a
full audit trail.

This repository implements the MVP described in [`docs/MVP-SCOPE.md`](docs/MVP-SCOPE.md).

---

## What is in the box

| Surface | What it does |
|---|---|
| Dashboard | Active agents, 24 h conversations, pending approvals, ready sources, recent audit activity, needs-attention list |
| Agents | Create, edit, activate/pause/delete. Three-step builder: Basics → Knowledge → Publish |
| Knowledge | Website crawl (same origin, max 25 pages), PDF/DOCX/TXT upload (max 10 MB), raw text. Status, retry, reindex |
| Playground | Real retrieval and streaming answers with citations |
| Conversations | Filterable inbox, thread view, execution trace, human takeover, close |
| Approvals | Pending queue, exact request/response, approve/reject, history |
| Actions | Generic HTTP action, JSON Schema parameters, encrypted headers, SSRF protection, approval gate |
| Channels | Shadow-DOM widget with origin allowlist and a public hosted page with Arabic RTL |
| Team & plans | Owner/admin/member roles, single-use invitations, Free/Starter/Growth quotas |
| Ops | Health endpoint, structured JSON logs, seed script, Docker Compose, Playwright E2E |

Customer-facing surfaces are Arabic/English. The dashboard is English in v1, by design.

---

## Architecture

```text
apps/
  web/        Next.js App Router: dashboard, REST, SSE, hosted chat page
  worker/     BullMQ consumers: ingestion and action execution
  widget/     Vite + Preact widget, built to apps/web/public/widget.js
packages/
  config/     Zod-validated environment and shared constants
  db/         Drizzle schema, migrations, tenant-scoped repositories
  core/       Domain services: workspaces, agents, knowledge, chat, actions, members, usage
  ai/         Parsing, crawling, Arabic normalization, chunking, embeddings, retrieval, prompts
```

Dependency direction is `apps → core → db` and `core → ai`. `core` never imports Next.js,
React, or `next/headers`, so the domain is testable without a browser. Every repository
function takes `workspaceId` first.

Postgres carries relational data, pgvector embeddings, and full-text indexes. Redis carries
BullMQ queues and rate limits only; losing Redis never loses a conversation or a source.

---

## Prerequisites

- Node 22 LTS
- pnpm 10+
- Docker (or Podman) with Compose
- An OpenAI-compatible API key for production-quality answers and embeddings

Local PostgreSQL is published on **5433** so it does not collide with a default Postgres on
5432. Change the mapping in `docker-compose.yml` and `DATABASE_URL` if you prefer 5432.

---

## Quickstart

```bash
pnpm install
docker compose up -d          # Postgres 16 + pgvector, Redis, MinIO
cp .env.example .env          # edit ENCRYPTION_KEY / BETTER_AUTH_SECRET for real use
pnpm db:migrate               # creates the vector extension, tables, HNSW/GIN indexes
pnpm seed                     # idempotent Cairo Threads demo tenant
pnpm dev                      # web :3000, worker, widget watch build
```

Open:

- Dashboard: <http://localhost:3000/sign-in>
- Demo login: `owner@cairothreads.test` / `demo-password`
- Hosted chat: <http://localhost:3000/chat/cairo-threads/support>
- Widget key: `pk_demo_cairo_threads`

The widget is built to `apps/web/public/widget.js` and is under 40 KB gzipped (~9 KB).

### Demo script

1. Sign in as Maya, owner of Cairo Threads.
2. Open **Agents → Support → Playground** and ask `الشحن بياخد كام يوم؟`.
   A streamed answer cites *Shipping and delivery*.
3. Ask `عايزة أرجّع الأوردر`. The agent proposes the **Request refund** action; a pending run
   appears.
4. Open **Approvals**, inspect the parameters and exact request, then approve. The worker
   executes the HTTP call once, appends a system message to the conversation, and writes audit
   events.
5. Open **Conversations**, take over a thread, and reply as a human. Further widget messages
   receive a human-controlled notice instead of an AI answer.
6. Open the hosted page at a phone viewport: Arabic RTL greeting and composer.
7. Show dashboard counters and the audit trail in Settings/Dashboard.

### Local AI mode

With `MOCK_AI=1` (the default in `.env.example`), embeddings are deterministic local vectors
and answers are an extractive fallback built from the top retrieved source. This lets the demo,
tests, and offline development work without spending tokens. Remove `MOCK_AI`, set a real
`OPENAI_API_KEY`, and use `text-embedding-3-small` + your chat model for production behavior.

---

## Environment

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Postgres 16+ with the `vector` extension |
| `REDIS_URL` | yes | BullMQ and rate limits |
| `BETTER_AUTH_SECRET` | yes | At least 32 characters |
| `BETTER_AUTH_URL` / `APP_URL` | yes | Public app origin |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | no | Google button appears only when both exist |
| `OPENAI_API_KEY` | yes | Embeddings and chat |
| `CHAT_MODEL` / `CHAT_MODEL_FALLBACK` | no | Defaults `gpt-4.1-mini` / `gpt-4.1` |
| `EMBEDDING_MODEL` / `EMBEDDING_DIMENSIONS` | no | Must stay `text-embedding-3-small` / `1536` |
| `S3_*` | yes | MinIO locally, R2/S3 in production |
| `ENCRYPTION_KEY` | yes | Base64-encoded 32-byte AES-256-GCM key |
| `RESEND_API_KEY` / `RESEND_FROM` | no | Without it, verification and invite emails are logged to the console |
| `MOCK_AI` | no | `1` enables deterministic offline embeddings/answers |

Generate a key:

```bash
openssl rand -base64 32
```

---

## Tests

```bash
pnpm test          # Vitest across config, ai, db, core, web
pnpm typecheck     # tsc --noEmit in every workspace
pnpm lint          # same static check, wired into CI
pnpm build         # widget + Next.js standalone + worker typecheck
```

`pnpm test` runs `db:migrate:test` first and uses `felops_test`. Packages run one at a time so
tenant-isolation tests never race each other.

The suite covers the review-focus failures:

- cross-tenant reads/writes for agents, sources, chunks, conversations, and runs
- Arabic normalization (`الشّحن` → `الشحن`) and hybrid retrieval fusion
- HTML sanitization and SSRF blocking (localhost, private, link-local, metadata, IPv6 loopback)
- crawl origin containment, 25-page cap, 403 stop
- prompt-injection fixture treated as data, cited, never obeyed
- approval state machine, double-approval idempotency, member-forbidden approval, audit events
- encrypted headers round-trip, JSON Schema argument validation
- widget origin allowlist and public-config field minimization
- quota accounting and invitation single-use/expiry

### Browser E2E

```bash
pnpm --filter @felops/web exec playwright install chromium
pnpm e2e
```

`pnpm e2e` re-seeds the demo tenant, starts `pnpm dev` (web + worker + widget) if needed, and
runs:

- desktop full loop: sign in → playground cited answer → approve → executed
- mobile hosted page: RTL, Arabic greeting, streamed answer, no horizontal scroll

---

## Deployment

### Railway / Neon (primary)

Create three services from this repository:

1. **web** — Dockerfile `apps/web/Dockerfile`, health check `/api/health`
2. **worker** — Dockerfile `apps/worker/Dockerfile`, no public networking
3. **data** — Neon Postgres 16 with `vector`, Redis, and an S3-compatible bucket

Set the variables from the table above on both web and worker. Run migrations once from a
release/one-off command:

```bash
pnpm db:migrate
```

`railway.toml` documents the service shape. `docker-compose.prod.yml` is the single-VPS
fallback: it brings up Postgres, Redis, MinIO, web, and worker with health checks.

### Build notes

- `pnpm build` builds the widget first, then the Next.js standalone output.
- The web Dockerfile installs once, builds the widget and the app, and runs
  `node apps/web/server.js`.
- The worker uses `tsx` directly; it shares the same workspace packages.
- Uploaded files are stored under `workspaces/{workspaceId}/sources/{uuid}` and are never
  served from a public bucket.

---

## Security and correctness invariants

- Every tenant table carries `workspace_id`; repository/service calls are scoped by it.
- Public endpoints resolve an agent by `public_key`, enforce an origin allowlist, rate limit
  per key + IP (30/min), and return only name, greeting, language, and theme.
- Retrieved text is wrapped in `<source>` tags and the prompt forbids following instructions
  found inside it. Action requests still require approval.
- Action headers are encrypted with AES-256-GCM using `ENCRYPTION_KEY`.
- The action executor validates DNS and every redirect target, blocks private/link-local/
  metadata ranges, uses a 10 s timeout, caps responses at 100 KB, and allows only http(s).
- Approval uses `SELECT … FOR UPDATE`; a run ID is the idempotency key and the BullMQ job ID,
  so repeated clicks and retries never execute twice.
- Every action transition writes an `audit_event` in the same transaction as the status change.
- Chat persists the user message before streaming and the assistant message in `finally`, so a
  disconnected client still leaves a complete turn behind.

---

## Deliberate cuts

No payment checkout, WhatsApp/Meta verification, OAuth integrations, custom roles, model
picker, analytics charts, or dashboard Arabic localization in v1. WhatsApp, the Arabic
evaluation harness, and Paymob checkout are listed as stretch tasks in the plan and are the
first Phase 2 candidates.
