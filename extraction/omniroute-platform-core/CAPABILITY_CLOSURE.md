# OmniRoute Capability Closure — Phase 1

## Scope and integrity rule

- Upstream repository: `Rilan-Dev/OmniRoute`
- Pinned ref: `release/v3.8.52`
- Pinned commit: `453918ab64f147604576e72d33e2bbfc12b2d1af`
- Pinned root tree: `76f3546d48a7293b199b7571d13808bebadb6d1f`
- Extraction branch: `extraction/omniroute-platform-core`
- Immutable source copying: **NOT STARTED**
- Rule: source files will be copied byte-for-byte; this document only records closure evidence.

Phase 1 treats a capability as a source graph, not a single file. A closure is therefore the union of:
1. source roots and recursively imported/re-exported first-party modules;
2. runtime/config registries used by those modules;
3. persistence modules and migrations;
4. API routes and dashboard surfaces that expose the capability;
5. tests that exercise the capability;
6. filesystem/process/native/network/environment requirements.

Where a whole directory is a semantic unit (for example compression, resilience, memory, MCP server, provider routing), the closure records the directory as a bounded tree rather than pretending individual-file enumeration is safer.

## Closure status vocabulary

- **bounded-tree** — whole named source tree is required; individual imports are intentionally not split.
- **resolved-roots** — primary imports/re-exports and directly required support modules are identified; recursive closure still needs machine verification.
- **external-boundary** — behavior crosses into host/application or third-party infrastructure and must be represented by a contract/adapter.
- **product-only** — not part of reusable core.

## Tier-1 closure matrix

| Capability | Tier/Class | Immutable source closure | Persistence closure | API/UI closure | Runtime/external closure | Status |
|---|---|---|---|---|---|---|
| Provider registry/catalog | 1 / A+B | `open-sse/config/providerRegistry.ts`, `providerModels.ts`, `src/lib/providers/`, provider service/adapter trees | `src/lib/db/providers.ts`, `provider_nodes`, `provider_connections` and related provider migrations | `src/app/api/providers/**`; dashboard providers, provider stats, discovery, free tiers | provider endpoints, credentials, OAuth/API-key stores, env provider credentials | resolved-roots |
| Model registry/capabilities | 1 / A+B | `open-sse/config/*Registry.ts`, `open-sse/services/model*.ts`, `src/lib/model*.ts`, `src/lib/providers/` | `models.ts`, `modelCapabilityOverrides.ts`, `modelContextOverrides.ts`, `model_intelligence.ts`, model capability migrations | `src/app/api/models/**`, provider-model routes; dashboard models/provider models | provider model APIs, model metadata/config | resolved-roots |
| Credential/account pooling | 1 / A+B | `open-sse/services/account*.ts`, `apiKeyRotator.ts`, `credentialGate.ts`, token refresh and credential health trees | `apiKeys.ts`, `registeredKeys.ts`, `connectionRuntimeState.ts`, account-affinity/quota tables | provider/key APIs; dashboard keys/providers | secrets/encryption, OAuth, provider credentials | resolved-roots |
| OAuth/credential lifecycle | 1 / A+B+C | `src/lib/oauth/**`, `src/lib/credentialHealth/**`, provider auth services | provider connection and token/key persistence modules | provider auth routes: claude/codex/agy/cursor/command-code/etc.; provider connection dialogs | OAuth client IDs, callback URLs, encrypted secret storage | resolved-roots |
| Routing engine | 1 / A+B | `src/lib/routing/**`, `open-sse/services/routing/**`, `routingStrategies.ts`, task/reasoning/wildcard routers, `src/domain/tagRouter.ts` | routing decisions, routing rules, adaptive routing state and related DB modules/migrations | routing, auto-combo, provider stats; usage route-explain | provider health/quota/cost signals | resolved-roots |
| Combo/fusion | 1 / A+B | `src/domain/comboResolver.ts`, `src/lib/combos/**`, `open-sse/services/combo/**` | `combos.ts`, `modelComboMappings.ts`, combo adaptation/forecast state | combo API + dashboard combo pages | multiple provider executions and streaming aggregation | resolved-roots |
| Auto-combo | 1 / A+B | `open-sse/services/autoCombo/**`, auto-candidate/forecast/scoring services | auto-candidate overrides, combo health/forecast tables | auto-combo APIs/dashboard | routing + usage/health signals | resolved-roots |
| Fallback/degradation | 1 / A+B | `src/domain/fallbackPolicy.ts`, `degradation.ts`, `lockoutPolicy.ts`, `providerExpiration.ts`, fallback services | domain fallback/lockout/circuit-breaker tables, provider expiration state | fallback/resilience/health APIs and UI | provider failure signals | resolved-roots |
| Resilience/circuit breakers | 1 / A+B | `src/lib/resilience/**`, connection circuit breaker, error classifier, retry/stream recovery | connection runtime state, resilience/circuit state and logs | resilience/health/usage APIs and UI | timers, network retry behavior | resolved-roots |
| Quota/budget | 1 / A+B+C | `src/lib/quota/**`, `src/domain/keyQuota.ts`, quota preflight/monitor/reset services | `quotaConsumption.ts`, `quotaGroups.ts`, `quotaPools.ts`, `quotaSnapshots.ts`, `quotaSchedules.ts`, `provider_quota_state`, API-key quota tables | quota/limits/usage APIs + dashboard quota/limits | SQLite/Redis quota store choice; plan definitions | resolved-roots |
| Usage/cost | 1 / A+B+C | `src/lib/usage/**`, `costLedger.ts`, token accounting/call logs/usage services | `usage_history`, `call_logs`, `request_cost_ledger`, `api_key_quota_counters`, usage aggregation tables | `src/app/api/usage/**`; dashboard usage/cost/provider stats/analytics | storage, encryption, export destinations | resolved-roots |
| Compression | 1 / A+B | `open-sse/services/compression/**`, `src/lib/compression/**`, context compression services | compression settings/analytics/cache/receipts/token/combo tables | compression/context APIs + dashboard compression/context | worker pool, token estimation, model limits | bounded-tree |
| Context/memory | 1 / A+B+C | `src/lib/memory/**`, `open-sse/services/contextManager.ts`, context handoff/editing/resolver services | `memories`, memory FTS/vector tables, context handoffs, session/turn state | memory/context/conversation APIs + dashboard memory/context/conversations | SQLite/Qdrant/Obsidian/generic backend, embeddings | bounded-tree |
| Cache | 1 / A+B | `open-sse/services/cache/**`, `src/lib/cache/**`, semantic/prompt/reasoning cache modules | `semantic_cache`, reasoning cache and cache support tables | cache APIs + dashboard cache | SQLite/in-memory/semantic stores | bounded-tree |
| Streaming/protocol translation | 1 / A+B | `open-sse/handlers/**`, `translator/**`, `transformer/**`, SSE utilities, `src/server/ws/**` | continuation/session/request logs where stateful | catch-all API, v1/v1beta, translator routes; playground/endpoint UI | HTTP/SSE/WebSocket, provider streaming protocols | bounded-tree |
| MCP | 1 / A+B+C | `open-sse/mcp-server/**`, MCP client/catalog/tool search/result/audit/runtime heartbeat trees | `mcp_tool_audit` and MCP-related settings/access tables | `src/app/api/mcp/**`; dashboard MCP | MCP transports, external MCP servers, auth/scopes | bounded-tree |
| A2A | 1 / A+B+C | `src/lib/a2a/**`, A2A API/app trees, task/streaming helpers | `a2a_tasks`, `a2a_task_events`, skill linkage | `src/app/api/a2a/**`; dashboard A2A | remote agent endpoints and authentication | bounded-tree |
| Tools | 1 / A+B+C | tool registry/handlers/schemas/sanitizers/execution and server-tool trees | tool execution/audit tables | tools API + dashboard tools/search tools | subprocess/network/MCP/client tools | resolved-roots |
| Skills | 1/2 / A+B+C | `src/lib/agentSkills/**`, `skills/**`, skill runtime/loader/execution trees | `skills`, `skill_executions`, fences/metadata | agent-skills and omni-skills APIs/UI | filesystem skill bundles and execution boundaries | bounded-tree |
| Plugins | 1/2 / A+B+C | `src/lib/plugins/**`, hook/sdk/loader/manager/runtime trees | `plugins`, plugin metrics/analytics | plugin APIs + dashboard plugins | third-party/plugin code is an external execution boundary | bounded-tree |
| Multimodal | 1 / A+B+C | image/audio/video/embedding/rerank/OCR/music/upscale/search registries, handlers and translators | modality bridge/settings and usage/call-log fields | modality APIs + media-provider/search UI | provider media endpoints and binary payload handling | resolved-roots |
| Guardrails/security | 1 / A+B+C | guardrails, `src/lib/security/**`, authz, CORS/origin, sanitizers, exposure controls | security settings, API-key controls, audit/config state | guardrail/security/auth routes and settings UI | secrets, cookies, network/origin policy | resolved-roots |
| Observability | 1 / A+B+C | `src/lib/monitoring/**`, OTel routing, events, telemetry, provider metrics | detailed logs, usage analytics, provider stats, event/audit tables | analytics/health/telemetry/log APIs + dashboard | OpenTelemetry/export destinations/log sinks | resolved-roots |
| Audit | 1 / A+B+C | `src/lib/audit/**`, config audit, MCP audit, audit event helpers | `config_audit_log`, MCP/tool audit and relevant event tables | audit APIs + dashboard audit | host retention/export policy | resolved-roots |
| Evaluations | 1/2 / A+B | `src/lib/evals/**`, router/compression evals and test/eval scripts | `eval_runs`, `eval_suites`, `eval_cases` | eval APIs/dashboard evals | model/provider execution and fixtures | resolved-roots |

## Persistence closure baseline

The repository uses a first-party SQLite-oriented persistence layer under `src/lib/db/**` with adapters and a migration runner. The migration directory contains 196 numbered migration files with gaps in numbering. Tier-1 closure must retain the migration runner plus every migration that defines or mutates a required table.

High-signal tables proven from migration inspection:

- Provider/routing: `provider_connections`, `provider_nodes`, `routing_decisions`, `combos`, `model_combo_mappings`, `domain_fallback_chains`, `domain_budgets`, `domain_cost_history`, `domain_lockout_state`, `domain_circuit_breakers`.
- Access/usage: `api_keys`, `registered_keys`, `usage_history`, `call_logs`, `request_cost_ledger`, `api_key_quota_limits`, `api_key_quota_counters`.
- Memory/context: `memories`, memory FTS/vector structures, `context_handoffs`, `agentic_conversations`, `conversation_turn_nodes`.
- Agents/tools: `mcp_tool_audit`, `a2a_tasks`, `a2a_task_events`, `skills`, `skill_executions`, `server_tool_executions`, `plugins`, plugin metrics/analytics.
- Files/batches/evals: `files`, `batches`, `eval_runs`, `eval_suites`, `eval_cases`.
- Quota/telemetry: quota snapshots/consumption/pools/groups/schedules/provider state, detailed logs, usage analytics/aggregation tables.

Migration families explicitly tied to Tier-1 capabilities include:
- 001-014 core provider/usage/log/cache/routing foundations.
- 015-024 memory, skills, logs, context and sync.
- 028-043 files/batches/evals/reasoning/compression.
- 044-058 usage/quota/database settings/API-key/MCP additions.
- 064-080 session history, middleware, key groups, relay/free proxies, plugins and agent bridge.
- 083-098 memory vector/playground/quota/semantic-cache/model intelligence.
- 101-110 usage limits, compression engines, usage endpoint, quota caps, reset events, context overrides.
- 118-150 provider filters, capability overrides, interception, quota automation, reasoning routing, usage identity, auto-candidates and compression access.
- 154-158 response/conversation/lease/error state.
- 161, 169-174 audit/model capability/log export/tool execution.
- 182-196 cost ledger, quota, provenance, resilience, TTFT and token-limit constraints.

**Important:** this is a closure baseline, not permission to copy only these migrations. The machine verifier in Phase 5 must recompute the exact migration closure from source imports and schema references.

## Runtime, filesystem, native and network closure

Proven runtime boundaries found in source/package manifests:

- Node.js runtime is required (package engine: `>=22.22.2 <23 || >=24.0.0 <27`).
- SQLite is first-party runtime persistence; `better-sqlite3` native loading/build support is present.
- `src/mitm/tproxy/native` and build scripts contain native TPROXY/node-gyp requirements.
- Browser runtime uses `packages/browser-pool`, Playwright/browser assets and VNC-related services.
- Cloudflare/ngrok tunnel services are separate network/process boundaries.
- MCP/A2A connect to remote protocol peers.
- Memory supports Qdrant and Obsidian backends in addition to SQLite/generic backends.
- Quota can select SQLite/Redis stores.
- CLI/desktop/browser integrations introduce subprocess, filesystem and OS-specific boundaries.

The canonical environment reference is `.env.example`. Confirmed variables include authentication/encryption, runtime ports/base URLs, provider OAuth client IDs/user agents, inspector/MITM controls, logging, quota-store selection and context limits. Provider-specific secrets must remain host-managed; they are not copied as secret values.

## API/UI closure baseline

API route families observed under `src/app/api/**` include:
A2A, agent skills, analytics, batches, cache, CLI, cloud, combos, compression, context, conversations, evals, fallback, files, guardrails, health, intelligence, keys, logs, MCP, memory, modality bridge, model capabilities, models, monitoring, OAuth, playground, plugins, policies, pricing, provider metrics/models/nodes/stats, providers, quota, rate limits, resilience, routing, search, sessions, skills, storage, sync, telemetry, tools, translator, tunnels, usage, v1/v1beta compatibility, version manager, VNC session, webhooks and catch-all routing.

Dashboard route families observed include:
A2A, ACP agents, activity, agent skills, analytics, API endpoints/manager, audit, auto-combo, batches, cache, CLI agents/code, cloud agents, combos, compression, conductor, context, conversations, costs, discovery, endpoint, free tiers/providers, health, limits, logs/export, MCP, media providers, memory, models, omni-skills, orchestration, playground, plugins, provider stats/providers, quota, radar, relay, resilience, runtime, search tools, settings, tokens, tools, translator, usage and webhooks.

For every copied UI tree, Phase 2 must preserve loading, empty, error, disabled, permission-denied, success and destructive-confirmation states; no UI state may be silently dropped because it looks product-specific.

## External dependency boundary

External npm packages are **inventoried only**. They are not vendored into the immutable source closure unless the upstream repository itself contains first-party source for the package.

The root package declares workspaces `open-sse` and `packages/browser-pool`. Build scripts additionally handle native/browser dependencies. Exact package dependency closure will be generated from all package manifests during Phase 1/Phase 5 verification.

## Explicit unresolved items

1. A machine import graph has not yet been executed against every Tier-1 source file; therefore this document does not claim final recursive closure.
2. The exact table-to-module graph for every `src/lib/db/**` module remains to be mechanically resolved.
3. The exact component/hook/store/dialog graph for every dashboard capability remains to be mechanically resolved.
4. Provider-specific credentials and network endpoints are intentionally recorded as host-managed boundaries, not copied secret values.
5. Exact third-party package versions/transitive dependencies still require package-lock/package-manifest recomputation.
6. Phase 7 must re-scan Tier-2 and cross-cutting areas for capabilities not reached from Tier-1 roots.

## Phase 1 gate

**Result: PASS for closure-baseline creation; NOT YET PASS for final machine-complete closure.**

No immutable source copying is authorized by this document. Phase 2 remains blocked until the import graph, DB graph, UI graph and external dependency inventory are machine-verifiable.
