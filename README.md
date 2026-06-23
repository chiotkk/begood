# BeGood / NourishTrack

BeGood/NourishTrack is a Next.js App Router app for logging meals, nutrition estimates, and physiological check-ins such as mood, pain, discomfort, energy, and digestion. Logs are stored locally in SQLite. AI food analysis and trend insights are explicit user-triggered actions and are disabled by default until an operator configures provider roles.

## Prerequisites

- Node.js 20+ recommended
- npm
- Local filesystem write access for SQLite data (`./data` by default)

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the local app at the URL printed by Next.js. If `NEXT_BASE_PATH=/begood` is set, use `/begood` as the app path.

## Environment variables and secrets

See `.env.example` for all placeholders. Important variables:

- `APP_PASSWORD`: optional basic-auth password. If unset, local/dev runs are open.
- `NEXT_BASE_PATH`: optional sub-path. Production expects `/begood`; local dev can leave this empty.
- `DATA_DIR`: directory for runtime SQLite data. Defaults to `./data`.
- `SQLITE_PATH`: exact SQLite file path. Defaults to `./data/begood.sqlite`.
- `LLM_CONFIG_PATH`: optional path to a JSON LLM config file.
- `LLM_VISION_*`: role used by `/api/analyze` for food image/text nutrition analysis.
- `LLM_ANALYSIS_*`: role used by `/api/insights` for trend/correlation explanations.

Do not commit real API keys. Local secret env files (`.env*.local`) and `config/llm.config.json` are gitignored.

## LLM configuration model

The app uses a provider-agnostic role layer in `lib/llm.ts`. Business logic asks for a role (`vision` or `analysis`) and does not instantiate provider SDK clients directly.

Supported provider modes now:

- `disabled`: default. API routes return clear unavailable feedback without crashing or making paid calls.
- `fake`: deterministic smoke-test responses with no network/provider call.
- `openai-compatible`: calls a configurable chat-completions endpoint via `fetch` using env/config values.

Configuration may be supplied through env vars or by copying `config/llm.config.example.json` to `config/llm.config.json`. Qwen-VL/Alibaba-compatible vision models, OpenAI/GPT-style reasoning models, and any OpenAI-compatible third-party model names/endpoints should be configured as values, not hardcoded into app logic.

Example smoke-test env:

```bash
LLM_VISION_PROVIDER=fake LLM_ANALYSIS_PROVIDER=fake npm run dev
```

## Cost controls

- No LLM calls run on dashboard or trends page load.
- Food analysis runs only when the user presses **Analyze & Log**.
- Trend insights run only when the user presses **Get AI Insights** or explicit refresh.
- Trend analysis sends compact deterministic summaries/candidates from logs, not stored food images or full raw history.
- `/api/insights` caches responses by range, compact log/config hash, and role config version. Repeated unchanged requests use cache unless the user presses refresh.
- Disabled/missing LLM config returns visible API/UI feedback instead of surprise fallback calls.

## Data, database, migrations, seeding, and backups

SQLite persistence is implemented in `lib/db.ts` with `better-sqlite3`.

Tables are created automatically on app startup:

- `health_logs`: JSON payloads for food and physiological logs.
- `insight_cache`: cached AI trend insight payloads.

There are no manual migrations or seed scripts yet. For backup, stop the app or ensure no active writes, then copy the SQLite file and WAL/SHM files from `DATA_DIR`/`SQLITE_PATH`. Runtime data is ignored by git.

## Auth, users, and roles

The app has one optional basic-auth gate in `middleware.ts` using `APP_PASSWORD`. There is no multi-user account system or role model. If `APP_PASSWORD` is unset, the middleware allows access for local/dev convenience.

## Main workflows

- **Log meal:** upload/take a food image or enter text, press **Analyze & Log**, review/save the AI-estimated nutrition. Requires `vision` role enabled or `fake` for smoke tests.
- **Log symptom/check-in:** use **Symptom Check-in** to save category, intensity, and notes.
- **Dashboard:** view today’s nutrition totals and recent logs.
- **Trends:** view deterministic calories vs mood/pain charts.
- **AI Insights:** press **Get AI Insights** to request compact correlation/explanation analysis for the selected range. Press refresh to bypass cache.

## Commands

```bash
npm run dev      # local development
npm run build    # production build
npm run start    # serve built app
npm run lint     # eslint, if configured dependencies are installed
```

## Deployment and rollback

Production hosting is expected to keep `NEXT_BASE_PATH=/begood`, `output: 'standalone'`, and the scripts under `scripts/` intact. Configure provider secrets in the host environment or a non-committed config file.

Rollback is file/artifact based: redeploy the previous accepted app build and keep the SQLite data directory intact. Do not run destructive database commands for rollback.

## Testing and smoke checks

Use disabled or fake LLM providers for local checks so no paid calls occur:

```bash
LLM_VISION_PROVIDER=fake LLM_ANALYSIS_PROVIDER=fake npm run build
```

API smoke ideas:

- `POST /api/analyze` with text only and fake provider.
- `GET /api/logs`, `POST /api/logs` with food/symptom payloads.
- `POST /api/insights` with low-data logs and disabled/fake provider behavior.
- Build with `NEXT_BASE_PATH=/begood` and confirm generated app paths include `/begood`.

## Troubleshooting

- **Food analysis says role disabled:** set `LLM_VISION_PROVIDER=fake` for smoke tests or configure `openai-compatible` endpoint/model/key envs.
- **AI insights unavailable:** set `LLM_ANALYSIS_PROVIDER=fake` for smoke tests or configure analysis provider values.
- **Missing API key:** ensure the role’s `apiKeyEnv` points to an environment variable that exists at runtime.
- **App under `/begood` cannot reach APIs:** verify `NEXT_BASE_PATH=/begood` was present at build/runtime and reverse proxy routes `/begood/*` to the app.
- **SQLite write errors:** check `DATA_DIR` exists and the app process can write to it.

## Known limitations

- AI insights are exploratory correlations only, not medical diagnosis or causality proof.
- The generic adapter currently targets OpenAI-compatible chat completions. Add additional providers behind `lib/llm.ts` roles rather than wiring SDKs into routes.
- There is no multi-user isolation; protect production access with `APP_PASSWORD` and host-level controls.
