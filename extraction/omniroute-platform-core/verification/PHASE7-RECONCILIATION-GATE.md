# Phase 7 Reconciliation Gate

Phase 7 is an independent discovery pass. Every candidate must be joined back to the machine closure and capability inventory before Phase 2.

Required evidence:
- Phase 7 raw report from the exact pinned checkout.
- Closure-map raw report from the same checkout.
- Reconciliation report listing every candidate file.
- Classification and disposition for every candidate.
- Complete-review flag.
- Exact source commit and root-tree pin.

The reconciliation must not silently discard candidates. Product-only classification means the source remains available for audit; it does not authorize deleting source from the immutable snapshot.

Phase 2 remains blocked until both the reconciliation gate and combined Phase 1 gate genuinely PASS.