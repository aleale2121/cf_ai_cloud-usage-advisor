# Cloud FinOps Copilot (Agentic AI Project)

## Overview

**Cloud FinOps Copilot** is an **Agentic AI-powered application** built on **Cloudflare’s full-stack AI platform**.  
It assists cloud engineers and financial teams by analyzing **cloud billing plans and usage metrics**, providing **LLM-driven cost optimization insights** through a real-time chat interface.

---

## Features

- **LLM Integration:** Uses **Cloudflare Workers AI (Llama 3.3)** for relevance filtering & summaries, and **Google Gemini 2.0** for in-depth FinOps analysis.
- **Workflow & Coordination:** Orchestrated with **Cloudflare Workers** and **Durable Objects** for real-time multi-user chat persistence.
- **User Interaction:** Chat-based interface built with **React + TypeScript + TailwindCSS** (deployed via Cloudflare Pages).
- **Memory / State:** Uses **Cloudflare D1** (SQLite-compatible) for conversation, analysis, and message history.
- **File Storage:** Uses **Cloudflare R2** to store uploaded plan & metrics files securely.
- **Agentic Flow:** Each user query dynamically triggers LLM reasoning, analysis, and thread-aware state memory retrieval.

---

## Architecture

```markdown
┌────────────────────────────┐
│ Cloudflare Pages (React)   │  ← Chat UI, uploads, real-timeupdates                     
└──────────────┬─────────────┘
               │
               ▼
┌────────────────────────────────┐
│ Cloudflare Worker (server)     │  ← LLM orchestration, message routing
│  - Durable Object: Chat        │
│  - Calls Llama 3.3 (Workers AI)│
│  - Calls Gemini (external API) │
└──────────────┬─────────────────┘
               │
               ▼
┌────────────────────────────┐
│ D1 Database (SQLite)       │  ← conversations, messages, analyses
│ R2 Storage (S3-like)       │  ← uploaded billing/metrics files
└────────────────────────────┘
```

---

## Tech Stack

| Component | Technology |
|------------|-------------|
| **Frontend** | React, TypeScript, TailwindCSS |
| **Backend** | Cloudflare Workers (TypeScript) |
| **AI / LLMs** | Cloudflare Workers AI (Llama 3.3), Google Gemini 2.0 |
| **State & Storage** | Cloudflare D1 (SQL), Cloudflare R2 (Object Storage) |
| **Persistence** | Durable Objects for conversation context |
| **Deployment** | Cloudflare Pages + Wrangler CLI |

---

## Setup Instructions

### 1. Clone and Configure

```bash
git clone https://github.com/aleale2121/cf_ai_finops_copilot.git
cd cf_ai_finops_copilot
npm install
```

### 2. Apply Database Schema

```bash
npx wrangler d1 execute COST_ANALYZER_DB --remote --file=schema.sql
```

### 3. Run Locally

```bash
npx wrangler dev
```

### 4. Deploy to Cloudflare

```bash
npx wrangler deploy
```

---

## Environment Bindings

| Binding | Type | Description |
|----------|------|-------------|
| `AI` | Workers AI | Access to Llama 3.3 |
| `GOOGLE_GEMINI_API_KEY` | Secret | API key for Gemini |
| `DB` | D1 Database | Persistent FinOps data |
| `FILES` | R2 Bucket | File uploads |
| `ASSETS` | Pages / Static assets | Frontend |
| `Chat` | Durable Object | Stateful chat memory |

---

## Example Prompts

- **Relevance filter:** “Is this message related to cloud cost optimization or cloud infrastructure?” → YES/NO  
- **Analysis prompt:** “Given PLAN, METRICS, COMMENT → produce FinOps summary + JSON of optimization areas.”  
- **Summary prompt:** “Summarize key cloud spend drivers and suggested actions.”  

---

## 🌐 Deployment

**Live Demo:** [https://cloud-usage-advisor.alefew-yimer.workers.dev](https://cloud-usage-advisor.alefew-yimer.workers.dev)

---

## 📁 Repository Structure

```markdown
src/
 ├── app.tsx
 ├── server.ts
 ├── d1.ts
 ├── optimizer.ts
 ├── tools.ts
 ├── utils.ts
 ├── file-storage.ts
 └── components/
      ├── chat/
      ├── layout/
      ├── file-upload/
      └── shared/
schema.sql
PROMPTS.md
README.md
wrangler.jsonc
```

---

## 👤 Author

**Alefew Yimer Yimam**  
M.S. Data Science @ Fordham University  
[GitHub: aleale2121](https://github.com/aleale2121)

---

## 🧾 License

MIT License © 2025 Alefew Yimer Yimam
