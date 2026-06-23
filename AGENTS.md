# AGENTS.md — BeGood / NourishTrack App Maintenance Guide

Scope: applies to `/home/openclaw/.openclaw/workspace/projects/begood/**`.

This is the canonical operator-level BeGood / NourishTrack app source tree. Neeko may target this repo for runs, but the OpenClaw operator project registry owns the canonical app location.

## 1) Canonical app context

App name: BeGood / NourishTrack  
Canonical app root: `/home/openclaw/.openclaw/workspace/projects/begood`  
Current app purpose: a personal health/nutrition logging app for meals, nutrition estimates, and physiological check-ins such as mood, pain, discomfort, energy, and digestion.

Current architecture summary:

- Framework/runtime: Next.js App Router, TypeScript, React
- Persistence: local SQLite via app runtime/data paths
- Auth/roles: optional basic auth via `APP_PASSWORD`; otherwise local/dev open
- AI/LLM: explicit user-triggered food analysis and insights; disabled until provider/config is present
- Deployment target: not yet canonicalized

## 2) Required docs to read before app changes

For ordinary app changes, read the relevant docs only:

- `README.md` — app quickstart, environment variables, and command index.
- `.env.example` — configuration placeholders and LLM role variables.
- Relevant source files under `app/api/`, `lib/`, `components/`, and `hooks/` for feature-specific changes.

If deployment, auth, data retention, or privacy behavior is changed, create/update docs for that concern in the same change set.

## 3) Implementation boundaries

- Durable log/history mutations should be server/API-owned, not browser-only state.
- Do not expose health/nutrition logs to external services unless the user explicitly triggers the AI action and provider config is present.
- Keep AI provider use role-scoped through configuration; do not hardcode API keys, models, or secrets.
- Runtime SQLite data, logs, `.env*`, `.next/`, and `node_modules/` must not be committed.
- External writes, production deployment, DNS/domain changes, and third-party provider setup require explicit operator approval.

## 4) Gates before reporting PASS

For code changes, run the smallest meaningful available gates, normally:

```bash
npm run lint
npm run build
```

If tests exist or are added, run the relevant test command as well.
