# Personal AI OS — Architecture

## What is implemented

This first runnable slice is intentionally small but real. It includes a dark Arabic-first chat workspace, a server-side tRPC chat contract, an Agent Runtime with bounded tool execution, a memory adapter backed by MySQL/TiDB, and a provider boundary that can use the managed LLM integration by default or an OpenAI-compatible NVIDIA NIM endpoint when configured.

The runtime follows the core loop: load relevant memory, compose a guarded system policy, call the provider, execute only registered tools, append tool results, and stop after a bounded number of iterations. It never exposes credentials to the browser and does not claim external actions that are not implemented.

## Provider configuration

Set the following variables to use NVIDIA NIM instead of the managed provider:

```env
NVIDIA_API_KEY=...
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=...
```

The runtime calls `${NVIDIA_BASE_URL}/chat/completions` with the OpenAI-compatible `messages`, `tools`, and `tool_choice` contract. If any of the three values is missing, the project falls back to the platform-managed server-side LLM helper.

## Tool contract

Every tool has a name, description, risk level, confirmation requirement, JSON-compatible parameters, and a server-side executor. The default tools are intentionally low-risk:

- `remember_user_preference` stores a stable non-sensitive preference through the memory adapter.
- `get_agent_capabilities` reports enabled boundaries and does not contact third-party services.

Google, GitHub, browser, and MCP adapters should be added behind the same contract only after their credentials, scopes, approval policy, and verification tests are in place.

## Database

`drizzle/schema.ts` defines the auth-backed `users` table and the `memories` table. The generated migration is `drizzle/0001_dear_forge.sql`; the `memories` table has been applied to the project database with a non-destructive `CREATE TABLE IF NOT EXISTS` statement.

## Next milestones

1. Add durable conversations, tasks, approvals, and event records.
2. Add hybrid retrieval with pgvector or a provider-appropriate vector store.
3. Add SSE task events and resumable background execution.
4. Implement real Google OAuth and GitHub App adapters with least-privilege scopes.
5. Add project workspaces, file parsing/chunking, and retrieval evaluation.
6. Add OpenTelemetry traces, redacted structured logs, and prompt-injection regression tests.

## Local checks

```bash
pnpm check
pnpm test
pnpm build
```

## Phase 1 — durable task execution

The first execution layer is now present. `tasks`, `taskEvents`, and `approvals` are persisted in the database. The task service exposes queued, planning, running, waiting-for-approval, paused, failed, completed, and cancelled states, with retry counters and progress. The current worker runs inside the web process for the MVP and is bounded to one active drain, while task snapshots and activity events remain durable.

The SSE endpoint is `GET /api/tasks/:id/events`. It sends historical events first, then live `task` events and heartbeat comments. The frontend subscribes with `EventSource`, polls the snapshot as a resilience fallback, and renders pause/resume controls plus a compact Activity Timeline.

Approval records support `pending`, `approved`, and `rejected`, exposed through server-side procedures. High-impact integrations should request an approval before their tool executor runs; the current default tools remain low-risk and therefore do not create approval prompts.

For production workloads that must survive process termination while actively executing, move the drain loop to a durable queue worker or reserved single-process host; keep the same task and event contracts.

## Phase 2 — production-grade task infrastructure

The worker now uses persisted attempt counters, max attempts, idempotency keys, worker IDs, lock timestamps, heartbeat timestamps, lease timeouts, retry timestamps, exponential backoff, and a dead-letter state. At startup it hydrates unfinished tasks from the database; expired leases are recovered and unfinished work is re-queued. The process has a graceful shutdown hook and does not start the worker during tests.

The Tasks dashboard is available at `/tasks` with status filters, task detail, progress, worker/attempt metadata, Activity Timeline, pause/resume/retry controls, and task-scoped approval actions. Approvals are constrained by task ID, user ID, required permission, and resource scope.

Google Calendar is implemented behind a server-side OAuth provider at `/api/google/connect` and `/api/google/callback`. Calendar read tools and write tools expose separate permissions (`calendar.read`, `calendar.create`, `calendar.update`, `calendar.delete`); write operations require an approved task-scoped approval. OAuth client credentials can be entered from `/settings`, are stored encrypted in `integrationSecrets`, and are never returned to the browser after save. The Google redirect URI shown by the UI must be registered in Google Cloud Console.

Google Drive and Google Sheets are now available through the same OAuth connection. Drive supports read-only full-text search and small text/Google Docs/CSV reads; Sheets supports read-only range reads for analysis. The Agent Tool Registry exposes `google_drive_search`, `google_drive_read_text`, and `google_sheets_read_range`. Drive and Sheets operations are read-only and do not modify external data. See `docs/google-services.md` for the setup, quotas, and the later migration path to Google Picker plus the narrower `drive.file` scope before public distribution.
