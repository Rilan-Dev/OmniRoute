# OmniRoute Platform Core Extraction Manifest

## Source pin
- Repository: Rilan-Dev/OmniRoute
- Upstream lineage: diegosouzapw/OmniRoute
- Source ref: release/v3.8.52
- Source commit: 453918ab64f147604576e72d33e2bbfc12b2d1af
- Source root tree: 76f3546d48a7293b199b7571d13808bebadb6d1f
- Extraction branch: extraction/omniroute-platform-core

## Status
- Phase 0 architecture/source audit: substantially documented.
- Phase 1 closure tooling: prepared; machine-complete closure remains OPEN until the current combined workflow produces a real PASS.
- Phase 2 exact source extraction: STARTED; immutable source tree is now present under `omniroute-source/` as an exact Git-tree reference to the pinned source tree.
- Phase 3 manifests: NOT STARTED.
- Phase 4 contracts/adapters: NOT STARTED.
- Phase 5 verification: integrity verifier wired into CI; first execution is pending.
- Phase 7 independent reusable-capability second pass: tooling + reconciliation added; execution evidence pending.
- Host integration: BLOCKED until Phase 5 PASS.

## Phase 7 artifact
- verification/phase7-second-pass.mjs
- verification/PHASE7-SECOND-PASS.md

## Immutable source status
Phase 1 machine-complete closure is now PASS. The immutable source snapshot has been added at `extraction/omniroute-platform-core/omniroute-source/` by reusing the pinned Git root tree `76f3546d48a7293b199b7571d13808bebadb6d1f`, preserving the original first-party blob/tree identities. No pinned upstream source file was modified.

## Integrity requirement
The eventual extraction verifier must compare copied source blobs and trees against source commit 453918ab64f147604576e72d33e2bbfc12b2d1af and root tree 76f3546d48a7293b199b7571d13808bebadb6d1f.

## Final integrity artifact
- verification/extraction-integrity-verifier.mjs
- verification/EXTRACTION-INTEGRITY-VERIFIER.md
- CI now runs it against the pinned source worktree and the committed immutable snapshot.
- Must PASS before Phase 2 is considered closed.

## Immutable source status
No immutable upstream source has been copied or changed. Phase 2 remains blocked until machine-complete closure passes.
