# Phase 9 — Host Integration Readiness and Adapter Selection

## Objective

Advance from the machine-verified reusable OmniRoute distribution into a deliberate host-integration boundary. Phase 9 does not modify the immutable `omniroute-source/` tree and does not select or implement a production host implicitly.

## Preconditions proven by Phase 8

- Phase 1 closure: PASS / 0 blockers.
- Phase 2 immutable integrity: PASS / 24,267 source entries and 24,267 extracted entries.
- Phase 3 capability and host-boundary contracts: PASS / 32 capabilities / 9 contracts.
- Phase 4 adapter contracts: PASS / 9 contracts.
- Phase 5 adapter validation: PASS / 0 blockers.
- Phase 6 host integration harness: PASS / 0 blockers.
- Phase 7 reusable-core export: PASS / 0 blockers; descriptor SHA-256 `20451498014656f240d625b11dd1f14a8cde8a2ce766dc52e7405542c172b279`.
- Phase 8 independent consumer validation: PASS / 0 blockers; clean import, package identity, authorization ordering, opaque-result preservation, tenant isolation, secret redaction, and tamper/missing/extra-entry fail-closed scenarios all passed.

## Rules

1. `omniroute-source/` remains immutable and is never edited by host integration.
2. A concrete host must be explicitly selected before implementation begins.
3. Host identity, tenancy, secrets, persistence, billing/entitlements, RAG/memory, observability, notifications, branding, and deployment/runtime remain host-owned adapter responsibilities.
4. Provider/model/routing/quota/compression/MCP/A2A semantics remain in the reusable core.
5. Existing core injection points may be used where already proven; no generic replacement API may be invented without source evidence.
6. Host adapters must fail closed on authorization, tenant isolation, secret handling, and adapter errors.
7. Every integration change must preserve the Phase 1–8 evidence chain and rerun the immutable-source integrity verifier.
8. No production deployment is claimed until the selected host passes a dedicated integration verifier.

## Required Phase 9 outputs

- A host-selection record naming the concrete consumer and its ownership boundary.
- A host-to-core adapter mapping for all nine Phase 4 contracts.
- A host-owned integration implementation outside `omniroute-source/`.
- Contract tests covering authorization, tenant isolation, secret redaction, opaque result preservation, and deterministic failure.
- A machine verifier proving exact source identity, unchanged immutable tree, adapter contract coverage, and successful host integration.
- Updated export/consumer metadata showing which host consumes the reusable package.

## Current state

No production host is selected by this phase specification. The reference consumer from Phase 8 remains the only validated host-side fixture. Production host implementation is intentionally pending an explicit host-selection decision.
