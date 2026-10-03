# Phase 8 — Distribution / Consumer Validation

## Objective
Prove that the verified OmniRoute reusable core can be consumed as an immutable distribution by a separate host without modifying the core source or bypassing the host-adapter boundary.

## Inputs
- Pinned source commit: `453918ab64f147604576e72d33e2bbfc12b2d1af`
- Pinned source tree: `76f3546d48a7293b199b7571d13808bebadb6d1f`
- Phase 7 deterministic export descriptor.
- Phase 3 capability and host-boundary manifests.
- Phase 4 adapter contracts.
- Phase 5 validation and Phase 6 host-integration evidence.

## Required consumer scenarios
1. Clean consumer checkout imports the immutable package without source edits.
2. Consumer verifies package identity before startup.
3. Host identity/tenant policy is resolved only through host-owned adapters.
4. Credential/secret access remains behind the host secret adapter.
5. Persistence and memory remain behind the persistence/RAG contracts.
6. Provider/routing/quota/compression/MCP/A2A behavior is not rewritten by the consumer.
7. Authorization denial prevents core invocation.
8. A core result crosses the boundary unchanged except for explicitly documented transport serialization.
9. Tenant isolation and secret redaction remain intact.
10. Tampering, missing entries, extra entries, and source identity drift fail closed.

## Machine-gated outputs
The future verifier should emit exact package identity, membership and descriptor hash, consumer integrity, adapter compatibility, scenario results, and zero blockers.

## Non-goals
- No production deployment.
- No provider semantic changes.
- No extraction-source refactoring.
- No host-policy code inside `omniroute-source/`.
- No claim that a specific host is production-ready.

## Completion gate
Phase 8 closes only after a fresh, independent consumer fixture passes all required scenarios against the exact Phase 7 package descriptor.
