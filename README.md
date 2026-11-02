# SignalDesk

**Live app:** https://signaldesk-n3a9.onrender.com

SignalDesk is an AI-powered web app for reporting and managing dormitory issues. Students report problems such as broken fixtures, leaks or electrical faults. Each report is automatically classified by category, priority (Low to Emergency) and safety risk, then routed to the right maintenance team. Reports the AI is unsure about go to staff for review.

The app also spots duplicate reports, groups bursts of similar reports into building-wide emerging issues, and gives staff a dashboard to track request volume, resolution times and AI performance.

## Features
- AI triage using Jev, TypeSafe's decision model, accessed through the OpenRouter API
- Duplicate detection and emerging-issue alerts using sentence embeddings and vector similarity search
- Staff dashboard with charts for request trends and team workload
- Separate access for students, staff and admins

## Tech Stack
| Part | Tech |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Python, FastAPI, SQLAlchemy |
| Database / Auth | Supabase (PostgreSQL, pgvector, Supabase Auth) |
| AI | Jev via OpenRouter, all-MiniLM-L6-v2 embeddings (fastembed) |
| Deployment | Docker, Render |
