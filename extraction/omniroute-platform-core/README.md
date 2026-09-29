# OmniRoute Platform Core Extraction

This directory is the controlled extraction workspace for building a reusable platform core from OmniRoute.

## Source
Rilan-Dev/OmniRoute@release/v3.8.52

Pinned commit:
453918ab64f147604576e72d33e2bbfc12b2d1af

Pinned tree:
76f3546d48a7293b199b7571d13808bebadb6d1f

## Rules
- Immutable upstream source will be copied byte-for-byte.
- No refactoring or behavior changes inside immutable trees.
- First-party dependency closure is copied exactly when required.
- Vendor/npm packages are inventoried, not vendored.
- Host-specific identity, tenancy, billing, secrets, RAG, branding and deployment are adapter concerns.
- Extraction does not pass until a machine verifier proves file/blob/tree integrity.
- Every completion updates the persistent worklog and commits the next-work prompt.

## Layout
The target layout is:
- omniroute-source/ — immutable first-party source.
- dependency-closure/ — immutable first-party source required by selected capabilities.
- ui-reference/ — immutable UI/UX source for selected capabilities.
- contracts/ — new host-neutral interfaces.
- adapters/ — composition seams only.
- capabilities/ — Codex-ready manifests.
- external-dependencies/ — package/dependency inventory.
- verification/ — immutable manifests and fail-closed verifier.
- EXTRACTION_MANIFEST.md — source pin and extraction status.
- EXTRACTION_WORKLOG.md — persistent plan/progress/next prompt.

## Gate
Host-product integration is blocked until the immutable extraction verifier reports PASS and the second-pass repository audit records no unresolved required closure.