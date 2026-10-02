# Phase 6 — Host Integration Harness

## Purpose

Prove that a host application can compose the immutable OmniRoute platform core with host-owned adapters without editing, monkey-patching, or reinterpreting core provider/routing behavior.

## Boundary

The reference host is intentionally generic. It does not choose a database, secret manager, billing vendor, RAG vendor, UI framework, or deployment platform.

The composition is:

`host request -> identity/authorization -> entitlement -> adapter bundle -> core invocation -> host observability`

The core invocation is supplied as an opaque function. The harness therefore proves the host boundary without inventing a source-level injection API that the pinned OmniRoute snapshot does not expose.

## Required invariants

1. The immutable `omniroute-source/` tree is never written.
2. Host authorization occurs before core invocation.
3. A denied request never invokes core.
4. The core result is returned opaquely; the host does not alter provider/routing decisions.
5. Sensitive fields are redacted before observability emission.
6. Adapter state is tenant-isolated where the contract requires it.
7. Host entitlement policy remains outside provider selection and routing.
8. The harness uses only host-owned files plus the existing Phase 5 adapter bridge/fakes.

## Phase 6 gate

The verifier must prove:

- exact pinned source commit/tree;
- Phase 2 integrity PASS;
- Phase 4 nine-contract set still present;
- Phase 5 contract report PASS;
- reference-host composition executes;
- denied authorization prevents core invocation;
- successful invocation is exactly once;
- the opaque core result is unchanged;
- observability contains no raw secret;
- tenant isolation is preserved;
- no immutable-source file is modified.

No production host integration is claimed by this harness. It is a reusable consumer-boundary proof that can be adapted by Clara, Dynamic UI, or another host later.
