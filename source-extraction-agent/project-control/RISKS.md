# Risks — OmniRoute Extraction

- Historical commit/tree may no longer match the current branch state.
- Beginning Phase 2 without fresh closure evidence risks incomplete or incorrect copying.
- Re-copying may overwrite existing immutable artifacts or obscure provenance.
- Mitigation: recover live refs, inspect scanner output, append worklog, preserve prior manifests, and verify current output against the pinned source.
