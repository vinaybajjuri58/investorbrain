# InvestorBrain — a bias-aware, contradiction-aware investing memory

Indian retail investors drown in fragmented investing content — YouTube finfluencers, Substacks, broker PDFs — and retain none of it. InvestorBrain turns everything you consume into a queryable knowledge graph of companies, theses, catalysts, creator biases, and your own notes, powered by a self-hosted Cognee AI memory engine. It surfaces contradictions between sources, flags creator biases over time, and lets you query your entire research history in plain language.

## Stack

- **Frontend + API**: Next.js 15 (App Router) + TypeScript, Tailwind CSS
- **AI memory engine**: [Cognee](https://github.com/topoteretes/cognee) — self-hosted via Docker, consumed over its REST API (no Python in this repo)
- **LLM + Embeddings**: OpenAI API (GPT-4o-mini + text-embedding-3-large)
- **Graph visualization**: react-force-graph-2d
- **Default storage**: KuzuDB (graph), LanceDB (vector), SQLite (relational) — all file-based, no extra infra needed

## Getting started

```bash
# 1. Clone and set up env
cp .env.example .env
# Edit .env — set LLM_API_KEY to your OpenAI key

# 2. Start Cognee
docker compose up -d

# 3. Start the web app
cd web && npm install && npm run dev
```

App runs at http://localhost:3000, Cognee API at http://localhost:8000.

## Status

**Hackathon build in progress.** Not production-ready.
