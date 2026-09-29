# Phase 0 — OmniRoute Architecture & Source Audit

## Pin
- Source ref: release/v3.8.52
- Source commit: 453918ab64f147604576e72d33e2bbfc12b2d1af
- Source tree: 76f3546d48a7293b199b7571d13808bebadb6d1f

## Repository shape
Recursive Git tree: 27,224 entries / 24,267 blobs. The application is not just a Next.js dashboard. The reusable implementation spans `src/domain`, `src/lib`, `src/server`, `src/sse`, `src/mitm`, `open-sse`, `@omniroute`, `packages/browser-pool`, `skills`, `bin`, `scripts`, tests and configuration.

## Primary architecture
```
Client / IDE / SDK / CLI
        |
        v
src/app/api/[...omnirouteApiCatchAll]
        |
        +--> auth / authz / CORS / origin / management controls
        |
        v
OpenAI/Anthropic/Gemini/Responses and other ingress normalization
        |
        v
open-sse handlers + services + translator
        |
        +--> model/provider registry
        +--> model capability / alias resolution
        +--> policy / lockout / budget
        +--> quota preflight / account selection / health
        +--> routing / task-aware / reasoning / combo / auto-combo
        +--> compression / context / cache
        +--> provider executor
        |       |
        |       +--> API-key / OAuth / cookie / local / browser-backed providers
        |       +--> chat / Responses / embeddings / rerank / search / image / audio / video
        |
        +--> SSE / streaming / response translation / recovery
        |
        +--> usage / cost / quota / telemetry / audit / logs
        v
normalized response + routing/usage metadata
```

## Agent/tool architecture
```
Agent / CLI / external client
        |
        +--> MCP endpoint/client/server
        +--> A2A endpoint/task manager
        +--> agent-skills catalog/generator
        +--> plugins SDK/loader/manager
        +--> CLI integrations and remote mode
        |
        v
policy + credential + provider/routing infrastructure
        v
tool/agent execution + streamed events + audit
```

## Important exact source anchors
### Domain decision layer
- `src/domain/pipeline.ts` — pure multi-stage pipeline engine with caller-provided StageExecutor.
- `src/domain/comboResolver.ts` — combo selection strategies and fallback ordering.
- `src/domain/fallbackPolicy.ts` — persistent fallback chains.
- `src/domain/policyEngine.ts` — lockout, budget and fallback policy evaluation.
- `src/domain/keyQuota.ts` — key-level quota domain logic.
- `src/domain/quotaCache.ts` / `quotaCacheState.ts` — quota state/cache.
- `src/domain/costRules.ts` — cost policy.
- `src/domain/modelAvailability.ts` — model availability.
- `src/domain/connectionModelRules.ts` — connection/model constraints.
- `src/domain/degradation.ts` / `lockoutPolicy.ts` / `providerExpiration.ts` — resilience and lifecycle decisions.
- `src/domain/tagRouter.ts` — tag-based routing.

### Provider/model layer
- `open-sse/config/providerRegistry.ts` — registry foundation.
- `open-sse/config/providerModels.ts` — provider/model catalog.
- `open-sse/config/embeddingRegistry.ts`, `imageRegistry.ts`, `audioRegistry.ts`, `videoRegistry.ts`, `rerankRegistry.ts`, `searchRegistry.ts`, `ocrRegistry.ts`, `moderationRegistry.ts`, `musicRegistry.ts`, `upscaleRegistry.ts` — modality/service registries.
- `open-sse/services/provider.ts` / `providerAdapters.ts` / `providerAlias.ts` — provider resolution/configuration.
- `open-sse/services/model.ts`, `modelCapabilities.ts`, `modelLifecycle.ts`, `modelEndpointPolicy.ts`, `modelFamilyFallback.ts` — model behavior.
- `src/lib/modelAliasResolver.ts`, `modelCapabilities.ts`, `modelMetadataRegistry.ts` and capability-resolution files — model intelligence.
- `src/lib/providers/catalog.ts`, `managedAvailableModels.ts`, `mergeProviderModelListing.ts`, `modelListingCapability.ts`, `validation.ts` — provider catalog/validation.

### Routing/resilience layer
- `open-sse/services/routing/` — routing event/quality/OTel feedback foundation.
- `open-sse/services/routingStrategies.ts`, `taskAwareRouter.ts`, `taskAwareRouting.ts`, `wildcardRouter.ts` — routing strategies.
- `src/lib/routing/adaptiveRouting.ts` — adaptive routing.
- `src/lib/reasoningRouting/` — reasoning-aware routing.
- `open-sse/services/autoCombo/` — candidate generation, scoring, task fitness, provider diversity, quota/lockout/resilience filters, self-healing and persistence.
- `open-sse/services/combo/` — attempt loop, fusion, strategy dispatch, quota sharing, concurrency, headroom, target resolution and failure tracking.
- `src/lib/resilience/` and `open-sse/services/connectionCircuitBreaker.ts`, `errorClassifier.ts`, `transientBackendRetry.ts`, `streamRecovery.ts` — resilience/retry.

### Credential/quota/usage layer
- `open-sse/services/accountSelector.ts`, `accountSemaphore.ts`, `accountFallback.ts`, `apiKeyRotator.ts`, `credentialGate.ts`, `tokenRefresh.ts`.
- `src/lib/credentialHealth/` — credential probe policy/cache/scheduler.
- `src/lib/oauth/` — OAuth/device flow/connection persistence/credential blobs/provider services.
- `src/lib/quota/` — QuotaStore, account buckets, burn rate, fair share, provider quota state/telemetry, adapters, analytics, scheduler, Redis/SQLite stores, spend recorder and token estimator.
- `open-sse/services/quotaPreflight.ts`, `quotaMonitor.ts`, quota fetchers and reset/cooldown services.
- `src/lib/usage/` — call logs, cost calculator/ledger, token accounting, usage ledger/history/stats, budgets, provider limits and route/resilience explanations.
- `open-sse/services/usage/` — provider-specific usage/quota fetchers.

### Compression/context/cache
- `open-sse/services/compression/` — complete compression subsystem including RTK/Caveman, adaptive plans, worker pool/protocol, fidelity gates, risk gates, rules, preservation, caching-aware behavior, language detection, telemetry, stats, validation and recovery.
- `src/lib/compression/` — compression domain/client support.
- `src/lib/contextWindowResolver.ts`, `open-sse/services/contextManager.ts`, `contextHandoff.ts`, `open-sse/config/contextEditing.ts`.
- `src/lib/memory/` — extraction, injection, retrieval, vector stores, Qdrant, SQLite, Obsidian, summarization, decay and verification.
- `open-sse/services/cache/` and `src/lib/cache/`, `semanticCache.ts`, `promptCache/`, `reasoningCache.ts`.

### Protocol translation/streaming
- `open-sse/translator/` — format registry and request/response translation, including OpenAI, Claude, Gemini, Kiro, Cursor and Responses.
- `open-sse/handlers/chatCore.ts`, `responsesHandler.ts`, `sseParser.ts`, `usageExtractor.ts`, media/search handlers.
- `open-sse/transformer/responsesTransformer.ts`.
- `src/server/ws/` plus SSE infrastructure.

### MCP/A2A/skills/plugins
- `open-sse/mcp-server/` — HTTP transport, auth context, scope enforcement, catalog, tool search, tool result handling, audit and runtime heartbeat.
- `src/lib/a2a/` — authentication, task execution/manager, streaming and routing logs.
- `src/app/api/a2a/` and `src/app/a2a/` — A2A endpoints/UI.
- `src/lib/agentSkills/` — catalog, generator, OpenAPI parser, CLI registry parser and schemas.
- `src/lib/plugins/` — SDK, manifest, loader, manager, scanner, watcher, marketplace, hooks and test runner.
- `skills/` — 52 first-party skill trees including routing, providers, models, MCP, A2A, compression, context, usage, resilience, backups, sync, versioning, webhooks and CLI tooling.

### Observability/security/audit
- `src/lib/monitoring/` — provider health autopilot, provider health matrix, combo health and observability.
- `open-sse/services/routing/otel.ts` — routing OTel sink.
- `src/lib/events/` — event bus/types.
- `src/lib/audit/`, `src/domain/configAudit.ts`, `open-sse/mcp-server/audit.ts`.
- `src/lib/security/`, `src/server/authz/`, `cors/`, `origin/`, `src/lib/apiKeyExposure.ts`, `piiSanitizer.ts`, `internalServiceAuth.ts` and guardrails.

### Runtime/network/browser/ops
- `src/lib/runtime/ports.ts`.
- `bin/cli/runtime/` — process supervisor, supervisor policy, native deps, SQLite runtime.
- `packages/browser-pool/`, `open-sse/services/browserPool.ts`, `browserBackedChat.ts`.
- `src/lib/vncSession/`.
- `src/mitm/` including TPROXY subtree, system commands, trust, DNS teardown, sudo gate and stream bounds.
- `src/lib/cloudflaredTunnel.ts`, `ngrokTunnel.ts`, tunnel APIs/skills.
- `src/lib/versionManager/`, `cloudSync.ts`, backup/restore and sync APIs.

## API surface discovered
`src/app/api` contains dedicated routes for A2A, agent skills, analytics, batches, cache, CLI, cloud, combos, compression, context, conversations, evals, fallback, files, guardrails, headroom, health, intelligence, keys, logs, MCP, memory, modality bridge, model capabilities, models, monitoring, OAuth, playground, plugins, policies, pricing, provider metrics/models/nodes/stats, providers, quota, rate limits, resilience, routing, search, sessions, skills, storage, sync, telemetry, tools, translator, tunnels, usage, v1/v1beta compatibility, version manager, VNC session and webhooks, plus the catch-all API.

## Dashboard/UI surface discovered
`src/app/(dashboard)/dashboard` contains dedicated surfaces for A2A, ACP agents, activity, agent skills, analytics, API endpoints/manager, audit, auto-combo, batches, cache, CLI agents/code, cloud agents, combos, compression, conductor, context, conversations, costs, discovery, endpoint, free tiers/providers, health, limits, logs/export, MCP, media providers, memory, models, omni-skills, orchestration, playground, plugins, provider stats/providers, quota, radar, relay, resilience, runtime, search tools, settings, tokens, tools, translator, usage and webhooks.

## Key architectural finding
OmniRoute contains a genuine orchestration/routing platform, not merely a thin LLM wrapper. The source has pure domain orchestration, provider executors, account/credential selection, quota-aware routing, multi-model combo orchestration, compression, protocol translation, tool/agent protocols, multimodal handlers, memory/vector stores, usage/cost accounting, telemetry/audit, security controls and operational runtime infrastructure.

## Important unresolved items
- Exact dependency closure for every Tier-1 tree has not yet been computed.
- Exact UI component closures have not yet been computed.
- DB table/schema-to-capability mapping has not yet been completed.
- External package manifests have not yet been aggregated.
- Exact immutable extraction has not started.
- Source-path claims above are anchors, not a final closure manifest.