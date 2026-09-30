# Phase 1 Closure Mapper

Read-only deterministic closure evidence for a complete checkout of the pinned OmniRoute source.

## Run

node extraction/omniroute-platform-core/verification/phase1-closure-mapper.mjs <complete-checkout> extraction/omniroute-platform-core/verification/phase1-closure-map.json

Pinned source commit: `453918ab64f147604576e72d33e2bbfc12b2d1af`
Pinned source tree: `76f3546d48a7293b199b7571d13808bebadb6d1f`

## Evidence produced

- first-party import and unresolved-edge inventory;
- non-literal dynamic loader and runtime filesystem inventory;
- environment references;
- DB module/table references and migration table evidence;
- dashboard route import/state evidence;
- test-to-first-party-import evidence;
- package/workspace/lockfile inventory;
- host-boundary evidence for network, subprocess, native and secret references.

## Fail-closed behavior

Unresolved first-party imports, non-literal dynamic loaders, and DB table references absent from migration evidence are blockers. Missing checkout roots/package manifest is also a blocker.

The mapper is evidence tooling, not semantic proof. UI state detection and SQL extraction are intentionally conservative signals. Phase 1 remains blocked until a real checkout is scanned and the stronger exact DB/UI mappings are verified.

No source is copied or modified by this tool.
