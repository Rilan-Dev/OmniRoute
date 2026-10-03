# Phase 7 — Reusable-Core Packaging / Export

## Gate
Phase 7 closes only when the deterministic export verifier reports PASS with zero blockers.

## Required evidence
- Exact source commit: `453918ab64f147604576e72d33e2bbfc12b2d1af`
- Exact source tree: `76f3546d48a7293b199b7571d13808bebadb6d1f`
- Immutable source entry count: 24,267
- Phase 1–6 reports PASS with zero blockers.
- Export descriptor is deterministic and records immutable membership, host-owned roots, and policy constraints.
- No host-policy directory may enter the immutable package.
- The pinned `omniroute-source/` tree is never rewritten.

## Machine verifier
`verification/phase7-core-export-verifier.mjs`

The verifier is host-owned tooling. It validates the already verified immutable snapshot; it does not transform, normalize, or rewrite OmniRoute source.

## CI evidence
Run #176 (`37107299764`) passed. The export verifier reported PASS / 0 blockers with source entry count 24,267 and descriptor SHA-256 `20451498014656f240d625b11dd1f14a8cde8a2ce766dc52e7405542c172b279`.

## Boundary
Phase 7 packaging does not authorize production host integration. Consumer validation is a separate phase and must use the packaged immutable snapshot through host-owned adapters only.
