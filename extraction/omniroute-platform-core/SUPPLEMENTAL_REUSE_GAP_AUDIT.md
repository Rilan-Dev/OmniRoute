# OmniRoute Supplemental Reuse Gap Audit

## Scope

This audit is intentionally separate from the immutable OmniRoute core extraction and from the selected Clara host integration. It asks: **what reusable capability families in the pinned OmniRoute source could still be useful to future AI agents/projects even if they are not part of the primary isolated AI core?**

Pinned source:
- Commit: `453918ab64f147604576e72d33e2bbfc12b2d1af`
- Tree: `76f3546d48a7293b199b7571d13808bebadb6d1f`

No pinned source files are changed by this audit.

## High-value capability families that must remain explicitly represented

### 1. Agent execution/orchestration infrastructure
- `src/lib/conductor/**`
- `src/lib/issueAgent/**`
- agentic pipeline and follow-up execution support
- server-owned tool loops, execution fences, tool interception, retry/continuation state

**Reuse value:** gives another project an execution substrate around LLM calls rather than only an LLM provider/router.

### 2. Agent context acquisition beyond ordinary RAG
- `src/lib/localCorpus/**`
- `src/lib/notion/**`
- `src/lib/obsidian/**`
- `src/lib/contextWindowResolver.ts`
- context relay/handoff/window/editing support

**Reuse value:** lets an agent combine local corpora and external knowledge/context sources with model context management.

### 3. Tool and agent safety boundaries
- `src/lib/toolPolicy.ts`
- `src/lib/guardrails/**`
- `src/middleware/promptInjectionGuard.ts`
- `src/shared/network/outboundUrlGuard.ts`
- `src/lib/piiSanitizer.ts`
- `src/lib/streamingPiiTransform.ts`
- API-key exposure and secret-sentinel protections

**Reuse value:** these are cross-project agent safety primitives, not product-specific features.

### 4. Admission, concurrency, leases and idempotency
- `src/lib/admissionVirtualLanes.ts`
- `src/lib/headroom/**`
- `src/lib/exclusiveLeaseIsolation.ts`
- `src/lib/idempotencyLayer.ts`
- quota scheduler / warmup / circuit-breaker coordination

**Reuse value:** prevents duplicate work, overload, race conditions and quota collapse in multi-provider AI systems.

### 5. Provider/account intelligence
Beyond a basic provider adapter, retain:
- credential health and expiry detection
- account rotation and sticky-head behavior
- provider/model capability resolution
- model catalog synchronization
- quota normalization and reset timing
- provider safeguards and model-scoped cooldowns
- provider/plugin manifests and dynamic catalog enrichment

**Reuse value:** future projects can add providers without rebuilding account health, capability discovery and fallback machinery.

### 6. Advanced caching and request identity
- ordinary cache layer
- semantic cache
- prompt cache
- reasoning cache
- idempotency
- disk snapshots / warm-start identity where applicable
- cache poisoning and invalidation protections

**Reuse value:** materially improves latency/cost and prevents duplicate LLM work.

### 7. Evaluation and quality infrastructure
- `src/lib/evals/**`
- `src/lib/routerEval/**`
- auto-evaluation trace support
- eval CLI/TUI and evaluation schemas

**Reuse value:** an AI project needs repeatable model/tool/routing evaluation, not only runtime code.

### 8. Search and knowledge acquisition
- `src/lib/search/**`
- search provider registry and quota handling
- web-fetch execution
- Context7/AnySearch-style provider integrations

**Reuse value:** turns an agent into a grounded web/tool-using system without coupling the host product to one search vendor.

### 9. Multimodal services beyond chat
Explicitly preserve the modality registries and bridges for:
- embeddings
- reranking
- image generation/understanding
- audio/STT/TTS
- video
- OCR
- moderation
- music/upscaling where relevant

**Reuse value:** future agents can share one provider abstraction across text, vision, audio and retrieval workloads.

### 10. Remote agents and agent protocols
- A2A
- ACP
- cloud/remote agent connectors
- agent cards, task lifecycle, delegation and capability discovery
- AgentBridge-style connection infrastructure

**Reuse value:** enables agent-to-agent and remote execution architectures.

### 11. Plugin/extension platform
- plugin SDK/manifest/loader
- plugin manager and watcher
- marketplace/discovery
- telemetry hooks
- compatibility and staged refresh/snapshot behavior

**Reuse value:** future projects can extend capabilities without modifying the core.

### 12. Eventing, jobs and background execution
- `src/lib/events/**`
- `src/lib/jobs/**`
- `src/lib/jobRegistry/**`
- webhook dispatcher/delivery infrastructure
- schedulers and warmup workers

**Reuse value:** many AI features need asynchronous ingestion, sync, indexing, telemetry, cleanup and retry workers.

### 13. Observability and explainability
- monitoring
- session observability
- request/provider telemetry
- route explanation
- resilience explanation
- call-log artifacts/provenance
- OpenTelemetry integrations
- audit events

**Reuse value:** future projects need to answer why a model/provider/tool was selected and what happened during a request.

### 14. Backup, sync and versioned state
- backup/restore
- cloud/local sync
- snapshots
- version manager
- release/version health checks

**Reuse value:** reusable infrastructure for durable AI configuration and recoverable state.

### 15. Runtime/browser/automation substrate
- browser pool
- browser-backed providers
- VNC sessions
- CLI tools/runtime
- process supervision
- tunnels
- native/runtime isolation
- MITM/TPROXY where a host explicitly needs network interception

**Reuse value:** enables browser-use, local-agent and developer-tool scenarios. These are not generic LLM APIs, but they are important agent execution infrastructure.

## Additional families worth retaining as secondary reusable modules

- Cloud sync and remote configuration
- provider/model catalog UI contracts
- API bridge/server bridge patterns
- machine/access tokens
- proxy subscription/selector infrastructure
- proxy egress and network policy
- health checks and warmup scheduling
- graceful shutdown/process lifecycle
- log export/rotation/redaction
- compliance controls
- database migration/schema helpers for reusable persistence
- CLI/TUI management surfaces
- PWA/desktop shell only as optional host adapters

## Product-specific / do not mistake for universal core

Keep these auditable but do not treat them as mandatory reusable AI-platform modules:
- hosted commercial pricing/subscription policy
- branding/product navigation
- product-specific gamification
- deployment-provider-specific infrastructure
- host identity/tenant/billing rules
- provider-specific commercial account entitlements
- product-only ranking/presentation decisions

## Key conclusion

The extraction should not stop at "LLM providers + routing + MCP + integrations". OmniRoute contains a broader **agent infrastructure layer**:

**model/provider intelligence → routing → admission/concurrency → context acquisition → memory/cache → tool/skill execution → safety → multimodal → agent protocols → evaluation → observability → background jobs/events → durable state/versioning → optional browser/remote runtime.**

The highest-risk omissions for future projects are the orchestration/concurrency layer, context acquisition, safety boundaries, evaluation, search, multimodal registries, event/job infrastructure, and explainability/observability.

This audit is a gap register, not permission to alter the pinned source. Any future extraction must still preserve original Git blobs/trees and pass the existing machine-verification chain.
