# Phase 1 machine-closure tooling
This scanner is a read-only, fail-closed closure instrument. It walks first-party source roots, resolves relative imports, directory indexes and @/ aliases, records external imports, captures environment references, API/dashboard file counts and SHA-256 snapshots, and exits non-zero when a first-party import cannot be resolved.

It is intentionally tooling-only: it does not copy, rewrite, normalize, vendor or mutate immutable source.

Run from a checkout pinned to source commit `453918ab64f147604576e72d33e2bbfc12b2d1af`:

`node extraction/omniroute-platform-core/verification/phase1-closure-scanner.mjs extraction/omniroute-platform-core/verification/phase1-closure-report.json`

The scanner output is evidence for Phase 1/Phase 5; it is not itself the extraction payload.
