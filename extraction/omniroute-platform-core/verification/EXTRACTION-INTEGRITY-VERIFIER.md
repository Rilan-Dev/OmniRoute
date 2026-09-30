# Final Extraction Integrity Verifier

This read-only verifier is prepared before Phase 2. It proves the eventual immutable source snapshot matches the pinned Git source tree without copying or modifying source.

Command:

node extraction/omniroute-platform-core/verification/extraction-integrity-verifier.mjs <source-checkout> <extracted-root> <report>

It verifies the source checkout commit/tree, enumerates the complete recursive Git tree, detects missing/extra paths, recomputes Git blob SHA-1 values from extracted bytes, compares file/symlink/executable modes, and fails closed on unsupported entry types or mismatches.

A PASS proves exact path/mode/blob integrity for the copied snapshot. It does not replace Phase 1/Phase 7 closure gates.

The verifier has not been executed yet because a complete pinned checkout is not locally available. No PASS is claimed until actual execution.
