# Phase 7 — Reusable Core Packaging and Export

## Objective

Package the already verified immutable OmniRoute source and host-owned composition artifacts into a reusable distribution layout without changing the pinned source tree or provider/routing semantics.

## Inputs proven by prior gates

- Source commit: `453918ab64f147604576e72d33e2bbfc12b2d1af`
- Source tree: `76f3546d48a7293b199b7571d13808bebadb6d1f`
- Immutable extraction: 24,267 entries, zero integrity mismatches.
- Phase 1 closure: PASS / 0 blockers.
- Phase 3 capability inventory: PASS / 32 capabilities.
- Phase 4 adapter contracts: PASS / 9 contracts.
- Phase 5 adapter validation: PASS / 0 blockers.
- Phase 6 host integration harness: PASS / 0 blockers.

## Packaging rules

1. `omniroute-source/` remains immutable and is never edited by packaging work.
2. Packaging must reference exact source blobs/tree identity rather than rewriting source files.
3. First-party source is separated from host adapters and host policy.
4. External npm/vendor dependencies remain manifests/inventory entries; they are not silently vendored.
5. Provider, model, routing, quota, compression, MCP, and A2A semantics remain unchanged.
6. Export metadata must record the exact source commit/tree and deterministic package contents.
7. A machine verifier must fail closed on source drift, missing entries, extra immutable entries, or host-policy leakage into the immutable package.
8. Packaging must be reproducible from the pinned source and extraction manifests.

## Target export

The export contract will distinguish:

- immutable core source;
- reusable capability manifests;
- host-neutral adapter contracts;
- host-owned adapter implementations;
- external dependency inventory;
- verification metadata.

The first implementation task is to create the deterministic export manifest/verifier and prove that an export can be regenerated from the existing verified snapshot without modifying it.
