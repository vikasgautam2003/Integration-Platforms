# 🛰️ Signal — The AI Intake Router

> **One front door for everything a business receives — and an AI that knows exactly where each thing belongs.**

Leads, bug reports, feature requests, support questions, billing issues — they arrive scattered across a dozen channels and get lost, double-handled, or answered late. **Signal** is a single intake endpoint that reads every incoming message with an LLM, decides what it is, and automatically files it in the right system, notifies the right people, and logs it to a live dashboard.

It's the exact problem a Forward Deployed Engineer is handed on day one: *take a customer's scattered tools and make them work as one system* — with the integration code written by hand, and no-code used only where it isn't worth coding.

---

## 💡 The pitch — what this becomes

Imagine a company that gets 200 messages a day across web forms, email, and Slack. Today a human triages each one. With Signal:

- A **sales lead** lands → instantly becomes a **HubSpot contact + deal**, and the rep gets a Slack ping.
- A **bug report** lands → becomes a correctly-prioritized **Jira issue** with an AI-written summary.
- A **support question** lands → gets an **AI-drafted email reply** sent back in seconds via Resend.
- A **closed deal** → spins up a **Stripe customer + draft invoice**, and a verified webhook confirms payment.
- **Everything** → is persisted, deduplicated, and visible on an authenticated **real-time dashboard**.

No message is dropped. No message is handled twice. The team stops triaging and starts closing. That's the product.

---

## 🧠 How it works

```
                          ┌─────────────────────────────────────────────┐
   message in             │                 BACKEND (Express)            │
  (web / email / ──POST──▶│  /api/intake                                 │
   Slack / API)           │    1. validate (Zod)                         │
                          │    2. dedupe (idempotency key)               │
                          │    3. classify (LLM → type/urgency/summary)  │
                          │    4. persist (Supabase / Postgres)          │
                          │    5. ROUTE based on type ──────┐            │
                          └─────────────────────────────────┼────────────┘
                                                            │
                  ┌──────────────┬──────────────┬───────────┼───────────┬──────────────┐
                  ▼              ▼              ▼           ▼           ▼              ▼
              HubSpot         Jira          Slack       Resend      Stripe        Dashboard
             (leads →      (bugs →       (high-prio   (support →   (deals →     (Next.js +
           contact+deal)   issues)        alerts)      email)    cust+invoice)    Clerk)
```

1. **Intake** — a single `POST /api/intake` endpoint receives every message.
2. **Validate** — the payload is checked against a Zod schema; bad input is rejected with a clear `400`.
3. **Deduplicate** — an idempotency key ensures the same message arriving twice is never processed twice.
4. **Classify** — an LLM reads the message and returns structured JSON: `{ type, urgency, summary, suggested_reply }`, which is itself re-validated (never trust raw model output).
5. **Persist** — every classified signal is written as one row in Postgres.
6. **Route** — based on `type`, the message is filed into the correct downstream system.
7. **Observe** — everything shows up on a live, authenticated dashboard.

---

## 🏗️ Architecture

A deliberate **two-service split**, not a monolith:

| Service | Stack | Responsibility |
|---|---|---|
| **`Backend/`** | Express + TypeScript (Node) | The brain — intake, validation, classification, persistence, routing, webhooks. Runs independently so it can do background work after responding `202`. |
| **`Frontend/`** | Next.js (App Router) + TypeScript | The dashboard — renders signals, handles auth. Talks to the backend over HTTP. |

**Why split them?** The backend can accept a request, return `202 Accepted` immediately, and keep working (classify, route, notify) without blocking the caller. It also makes a clean, real-world Kubernetes topology — two deployables behind one ingress — instead of a toy single-container demo.

---

## 🧰 Tech stack

- **Core:** Next.js (App Router) + TypeScript · Express (Node) · Supabase (Postgres)
- **AI:** LLM classification & reply drafting (Groq / Llama — fast free inference; Gemini as alternative)
- **Validation:** Zod (at every untrusted boundary — request bodies *and* model output)
- **Integrations:** HubSpot (CRM) · Jira (issues) · Slack (alerts) · Resend (email) · Stripe (payments, test mode)
- **Auth:** Clerk
- **Observability:** Sentry
- **Cloud / DevOps:** Docker · GitHub Actions (CI/CD) · AWS (ECR + EKS + RDS) · Kubernetes

---

## 🔌 Routing logic

| Message `type` | Routes to | Action |
|---|---|---|
| `lead` | HubSpot | Create/update contact + associated deal (idempotent — no duplicate contacts) |
| `bug` / `feature` | Jira | Create issue; priority derived from `urgency` |
| `support` | Resend | Send the AI-drafted reply as a real email |
| _high urgency (any type)_ | Slack | Post a formatted Block Kit alert with a link to the record |
| _deal closed_ | Stripe | Create customer + draft invoice; verify the `invoice.paid` webhook |

> **Design principle:** four integrations done *flawlessly* — with real error handling, auth, retries, and idempotency — beat ten done flakily.

---

## 🗺️ Roadmap

**Core application**
- [x] **Phase 0** — Foundations: Express + TS scaffold, `/api/health`, env/secrets, git hygiene
- [x] **Phase 1** — Intake endpoint: `POST /api/intake`, Zod validation, idempotency, `202`/`400`
- [ ] **Phase 2** — AI classifier: `classify()` → validated `{ type, urgency, summary, suggested_reply }`
- [ ] **Phase 3** — Persistence: Supabase `signals` table, DB-enforced dedup
- [ ] **Phase 4** — HubSpot (leads → contact + deal)
- [ ] **Phase 5** — Jira (bug/feature → issue)
- [ ] **Phase 6** — Slack (high-priority → Block Kit alert)
- [ ] **Phase 7** — Resend (support → email)
- [ ] **Phase 8** — Stripe (deal → customer + invoice + verified webhook)
- [ ] **Phase 9** — Dashboard + Clerk auth (Next.js frontend)

**Production / cloud track**
- [ ] Sentry error monitoring around every integration
- [ ] Dockerize both services
- [ ] GitHub Actions CI (typecheck → build → test → build image)
- [ ] Push images to AWS ECR
- [ ] Kubernetes manifests (tested locally on `kind`/`minikube`)
- [ ] Deploy to AWS EKS (managed Postgres via RDS, secrets in-platform)
- [ ] GitHub Actions CD (auto-deploy on merge to `main`)

---

## 🔐 Engineering principles

- **Validate at every boundary** — never trust an incoming request *or* an LLM's output.
- **Idempotent by design** — the same message twice produces one outcome, enforced at the database, not just in code.
- **Fail loud, fall back safe** — integrations are wrapped in error handling; failures are surfaced (Sentry), never silently swallowed.
- **Secrets never touch the repo** — `.env` locally, platform secrets in production.
- **Docs-first, hand-written integrations** — every line understood, not copy-pasted.

---

## 🚀 Getting started

```bash
# Backend
cd Backend
npm install
cp .env.example .env   # add your keys
npm run dev            # starts the Express server
```

```bash
# Frontend (from Phase 9)
cd Frontend
npm install
npm run dev
```

> Detailed setup per service lives in each service's own README as the project grows.

---

## 🎯 Why this project exists

This is a **mentored, docs-first build** — every line written by hand to master the core skill of a Forward Deployed Engineer: *read any API's documentation and wire up the integration yourself.* The incremental, "here's why I made each design choice" story **is** the pitch.

The goal isn't a finished app. It's the ability to walk into any customer's messy stack and make it work as one system.
