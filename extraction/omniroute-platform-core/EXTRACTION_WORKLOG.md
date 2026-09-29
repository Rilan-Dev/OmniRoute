# OmniRoute Platform Core — Persistent Worklog

## Operating rule
This file is the continuity record. Every completed work unit must update it with: planned work, exact prompt used, completed work, not-done work, evidence, commit, and the next-work prompt. The next-work prompt must be committed in the same completion commit.

## Current source
- Repo: Rilan-Dev/OmniRoute
- Ref: release/v3.8.52
- Source commit: 453918ab64f147604576e72d33e2bbfc12b2d1af
- Source tree: 76f3546d48a7293b199b7571d13808bebadb6d1f
- Working branch: extraction/omniroute-platform-core
- Current extraction commit after completion 001: TO_BE_RECORDED_BY_COMMIT_OPERATION

## Master plan
1. Phase 0 — complete repository architecture and execution-path analysis.
2. Phase 1 — capability inventory with source paths, dependencies, UI and tier.
3. Phase 2 — exact source extraction plus dependency closure and UI reference.
4. Phase 3 — Codex-ready capability manifests.
5. Phase 4 — host-neutral contracts and composition seams.
6. Phase 5 — immutable manifests, dependency inventory and fail-closed verifier.
7. Phase 6 — copy-to-any-project workflow.
8. Phase 7 — second-pass full-repository audit and gap closure.
9. Only after verifier PASS: host integration/adapters.

## Completion 001 — Phase 0 architecture/source audit
### Exact prompt used
> Continue OmniRoute extraction Phase 0. Do not copy or modify immutable source yet. Starting from source commit 453918ab64f147604576e72d33e2bbfc12b2d1af/tree 76f3546d48a7293b199b7571d13808bebadb6d1f, perform a complete architecture/source-path audit. Enumerate actual directories/files for provider registry, model registry/capabilities, credential/account pooling, routing/resolution, combo/fusion, fallback/resilience, quota/cost/usage, compression, cache, streaming/SSE/WebSocket, MCP, A2A, tools, skills, plugins, memory/context, multimodal/search/embeddings/reranking/media, guardrails/security, telemetry/observability/audit, evaluations, CLI/coding-agent integrations, remote mode, cloud agents/sync/backup/versioning, browser/VNC, tunnels, MITM/TPROXY, database/filesystem/process/native dependencies, API routes and UI. Trace primary execution paths and record exact paths plus evidence in a Phase-0 architecture document. Explicitly classify unknown areas as unresolved rather than guessing. At completion update EXTRACTION_WORKLOG.md with completed/not-done/evidence/commit and replace this next-work prompt with the next exact prompt, then commit all planning/logging changes atomically. Do not begin Phase 1 until the Phase-0 source audit is sufficiently complete.

### Planned
- Trace the real execution architecture.
- Enumerate concrete source anchors for each major capability.
- Inspect API and dashboard surfaces.
- Identify hidden infrastructure outside obvious AI directories.

### Completed
- Added PHASE-0-ARCHITECTURE.md with architecture diagrams and concrete source anchors.
- Added CAPABILITY_INVENTORY.md covering Tier 1/2/3 and A/B/C/D classifications.
- Confirmed API route families and dashboard capability surfaces.
- Confirmed dedicated OpenAI/Claude/Gemini/Responses translation and streaming layers.
- Confirmed full compression subsystem under open-sse/services/compression, including workers, fidelity/risk gates, rules and telemetry.
- Confirmed MCP server infrastructure, A2A task/streaming infrastructure, agent skills and plugin SDK/loader/manager.
- Confirmed provider/account/OAuth/quota/usage/cost/resilience subsystems.
- Confirmed memory/vector/Qdrant, cache, multimodal, search, embeddings and rerank infrastructure.
- Confirmed browser/VNC, MITM/TPROXY, tunnels, cloud agents, backup/sync/version manager and desktop infrastructure.

### Not done
- Full import-by-import dependency closure.
- Full DB schema/table closure mapping.
- Full UI component/hook/store closure.
- External dependency aggregation.
- Exact source copy.
- Capability manifests.
- Contracts/adapters.
- Verifier.
- Second-pass gap audit.

### Evidence
- Pinned recursive Git tree was non-truncated: 27,224 entries / 24,267 blobs.
- `src/app/api` and dashboard directory inventories were inspected.
- Concrete provider, routing, quota, compression, MCP, A2A, skills, plugins, memory, usage, runtime and DB directories were inspected.
- Key domain/handler/service files were fetched and inspected for execution semantics, including pipeline, combo resolver, fallback policy, policy engine, provider configuration and routing observability.

### Gate
Phase 0 architecture evidence is materially established, but the phase remains OPEN until import/dependency closure and UI/DB closure are audited. Phase 1 classification can begin only as a controlled continuation of the source audit; extraction remains blocked.

## Next-work prompt — COMMIT THIS WITH EVERY COMPLETION
> Continue OmniRoute extraction with Phase 1 closure analysis. Do not copy or modify immutable source yet. Starting from the pinned source commit/tree and current extraction branch, compute the exact capability closure for Tier-1 capabilities. For each capability, walk imports/re-exports from the concrete source anchors and recursively resolve first-party dependencies across src, open-sse, @omniroute, packages, bin, scripts and config. In parallel map each capability to its complete API route, dashboard page, component, hook, store, dialog, loading/empty/error/success state and relevant tests. Map every required DB module/table/schema/migration, filesystem root, subprocess/native binary, network endpoint, environment variable and secret. Inventory package.json manifests without vendoring external packages. Produce a machine-readable capability-closure working document and update CAPABILITY_INVENTORY.md with exact paths and final A/B/C/D classifications. Explicitly preserve complete trees when a capability spans multiple files. Do not begin source copying until Tier-1 closures are sufficiently complete. At completion update this worklog with exact prompt, completed/not-done/evidence/commit and replace the next-work prompt, then commit all changes atomically.