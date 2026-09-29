# Phase 1 Supplemental Closure Analyzer

This read-only analyzer complements `verification/phase1-closure-scanner.mjs`. It must run from a checkout pinned to `453918ab64f147604576e72d33e2bbfc12b2d1af`.

## Detects

- non-literal dynamic `import()` and `require()` targets;
- runtime filesystem/code-discovery signals;
- environment-variable references grouped by source file;
- SQL-like database table references in `src/lib/db/**`;
- migration-file evidence;
- dashboard state signals for loading/empty/error/disabled/success/permission/state;
- test files and imports;
- package manifests and workspace package references.

## Fail closed

The analyzer never guesses a runtime path, DB ownership, UI-state coverage, or workspace package. Unresolved items are blockers and produce exit status 2.

A clean run is necessary but not sufficient for the final Phase 1 gate: exact import closure, DB migration mapping, dashboard route graph, test-to-capability mapping, package closure, and host-boundary review must still be proven.

## Run

```sh
node extraction/omniroute-platform-core/verification/phase1-supplemental-closure-analyzer.mjs extraction/omniroute-platform-core/verification/phase1-supplemental-closure.json
```

No immutable OmniRoute source is copied or modified.
