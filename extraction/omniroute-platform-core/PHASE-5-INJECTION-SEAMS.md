# Phase 5 — Adapter Injection Seam Specification

## Status

Phase 5 specification / seam-validation stage. No immutable OmniRoute source files are modified.

Pinned source:
- Commit: `453918ab64f147604576e72d33e2bbfc12b2d1af`
- Tree: `76f3546d48a7293b199b7571d13808bebadb6d1f`

## Objective

Translate the nine Phase 4 host-owned contracts into concrete integration seams that can be implemented without editing `omniroute-source/`, changing provider/model/routing semantics, or silently moving host policy into the reusable core.

The seam model is deliberately conservative: an existing source-level injection point is considered usable only when the pinned source already exposes it. A host wrapper, bootstrap layer, route boundary, or adapter implementation may be added outside the immutable snapshot. A missing source-level seam is recorded as a limitation rather than repaired by modifying the snapshot.

## Evidence from the pinned source

The pinned tree already contains several explicit dependency seams:

- `src/lib/db/adapters/types.ts` defines the internal `SqliteAdapter` contract.
- `src/lib/db/adapters/driverFactory.ts` accepts injectable driver-loading/probing functions for SQLite runtime selection.
- `open-sse/handlers/chatCore/telemetryHelpers.ts` accepts an injected `fetchImpl` and clock for its live-WS sidecar path.
- `open-sse/services/cache/memoryVectorStore.ts` exposes a constructor-level configuration boundary for its in-memory cache.
- `src/lib/a2a/authenticate.ts` and `open-sse/mcp-server/httpAuthContext.ts` contain authentication/caller-context logic, but they are not generic host identity adapters.
- The source contains its own SQLite-backed persistence and credential/API-key machinery. Those are product/runtime implementations, not proof that a generic host persistence or secret-manager adapter can be injected without source changes.

Therefore Phase 5 must distinguish **existing injectable seams** from **host-owned wrapper seams** and must not relabel internal implementation interfaces as generic platform contracts.

## Seam matrix

| Phase 4 contract | Host-side seam | Existing source injection? | Phase 5 rule |
|---|---|---:|---|
| identity-tenancy | authenticated host request -> platform invocation context | Partial | Authenticate/authorize before entering core-facing wrapper; do not replace core routing/auth semantics implicitly. |
| credential-secret-store | host credential provisioning/lookup service | No generic source-level seam proven | Keep provider credentials outside host adapter implementation; do not inject host secrets through globals or logs. |
| persistence-database | host-owned persistence facade around core integration | Partial, SQLite-specific | `SqliteAdapter` is an internal SQLite contract, not a generic DB adapter. Do not claim PostgreSQL/Supabase/etc. compatibility from it. |
| billing-entitlements | host entitlement check before capability invocation + usage result reporting | No generic source-level seam proven | Core quota/routing semantics remain unchanged; host plans map to external authorization/limits. |
| rag-memory-store | host RAG facade at the application boundary | No generic source-level seam proven | Host tenant filtering and vector credentials stay outside immutable source. Existing memory implementations remain core behavior. |
| observability-sink | host event/telemetry sink around core-facing operations | Partial | Existing telemetry helpers can have local injected dependencies, but no generic host sink is assumed. |
| notification-delivery | host event consumer/webhook/notification service | No generic source-level seam proven | Notifications are invoked by host-owned integration code; provider/retry policy stays outside core. |
| branding-product-ui | host UI shell/theme/config layer | N/A | No runtime mutation of core product terminology or semantics. |
| deployment-runtime | host bootstrap/process/network/deployment layer | Partial | Runtime configuration is supplied by host bootstrap; provider/routing behavior is not overridden by deployment policy. |

## Required host integration shape

The implementation phase must create an external host-owned bridge conceptually equivalent to:

```text
Host request
  -> host identity / authorization
  -> host entitlement check
  -> host adapter bundle
  -> core-facing invocation boundary
  -> immutable OmniRoute capability
  -> host observability / notification sinks
```

The bridge must never:

1. edit files under `omniroute-source/`;
2. patch imported core functions at runtime;
3. monkey-patch provider registries, routing selectors, quota algorithms, or model translators;
4. inject host secrets into process-wide mutable globals;
5. reinterpret a failed core provider request as a different provider/routing decision;
6. expose cross-tenant data through shared caches or persistence;
7. turn commercial billing policy into core provider-selection logic.

## Existing-seam classification

### Directly usable

These are genuine source-level dependency injection seams already present in the pinned source and can be exercised without modifying source bytes:

- SQLite driver loader/probe dependencies in `src/lib/db/adapters/driverFactory.ts`.
- Test/runtime fetch dependency in `open-sse/handlers/chatCore/telemetryHelpers.ts`.
- Existing constructor options on cache implementations such as `MemoryVectorStore`.

These seams may be used by tests or host wrappers only where their existing semantics permit it.

### Wrapper-only

These require a host boundary around the core rather than an invented source injection:

- identity/tenancy;
- billing/entitlements;
- notification delivery;
- branding;
- deployment/runtime policy;
- host observability routing;
- host RAG tenancy.

### Not yet proven generic

These must remain explicitly unresolved until a concrete host integration proves compatibility:

- replacing OmniRoute's internal SQLite persistence with an arbitrary host database;
- replacing the internal credential/API-key persistence system with an arbitrary host secret manager;
- replacing core memory implementations with a host vector database;
- replacing provider/routing policy with host billing policy.

## Phase 5 implementation constraints

1. Build only host-owned bridge/adapter code outside the immutable source tree.
2. Preserve the nine Phase 4 contract IDs and method semantics.
3. Add contract tests using deterministic fake adapters.
4. Prove tenant isolation at the bridge boundary.
5. Prove secret redaction before observability/notification delivery.
6. Prove adapter failure semantics are deterministic and do not mutate provider/routing decisions.
7. Record every source-level limitation instead of bypassing it.
8. Re-run exact-source integrity verification after any host-side implementation.
9. No extraction source file is edited as part of Phase 5.
10. No provider, model, quota, fallback, compression, MCP, A2A, or routing algorithm is altered.

## Phase 5 gate

Phase 5 cannot close until:

- all nine Phase 4 contracts have an explicit host-side seam;
- each seam is classified as direct, wrapper-only, or not-yet-proven;
- fake-adapter contract tests pass;
- cross-tenant isolation tests pass;
- secret-redaction tests pass;
- adapter failure tests pass;
- exact pinned source commit/tree remain unchanged;
- extraction integrity remains PASS;
- Phase 1/2/3/4 gates remain PASS.

No host application integration is considered complete merely because the adapters compile; behavioral isolation must be tested.
