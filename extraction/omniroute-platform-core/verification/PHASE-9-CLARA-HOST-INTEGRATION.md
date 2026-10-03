# Phase 9 — Clara Host Integration Readiness

Phase 9 is the first concrete production-host boundary for the verified OmniRoute reusable core.

## Host

- Repository: `Rilan-Dev/Clara-AI-Platform`
- Branch: `feature/ai-core-from-doable-source`
- Role: host consumer
- OmniRoute source pin:
  - commit `453918ab64f147604576e72d33e2bbfc12b2d1af`
  - tree `76f3546d48a7293b199b7571d13808bebadb6d1f`

## Acceptance

Phase 9 can pass only when:

1. Phase 1–8 reports remain PASS with zero blockers.
2. The host is checked out at the explicitly selected branch.
3. All nine Phase 4 ownership boundaries have concrete host evidence.
4. Tenant identity and KB scope are mandatory and fail closed.
5. Authorization/context validation occurs before provider/core invocation.
6. Secret access through the platform seam is denied; credentials remain server-side.
7. Core results remain opaque at the host seam.
8. Cross-tenant scope mismatch is rejected.
9. The host adapter registry is deterministic and fail-closed.
10. Adapter tests exist for execution context, adapter registry, and Clara bindings.
11. The host adapter does not import or execute the copied Doable reference source.
12. The exact immutable OmniRoute source commit/tree remains unchanged.

## Nine host-owned contracts

| Contract | Clara evidence |
|---|---|
| identity-tenancy | `src/modules/ai-platform-core/{contracts,execution-context,clara-adapters}.ts` |
| credential-secret-store | `src/modules/ai-platform-core/clara-adapters.ts` |
| persistence-database | `src/lib/db.ts` |
| billing-entitlements | `src/lib/plan-guard.ts`, `src/lib/plans.ts` |
| rag-memory-store | `src/modules/rag/grounding.ts` |
| observability-sink | analytics/usage and analytics/audit routes |
| notification-delivery | `src/lib/email.ts`, `src/lib/email-templates.ts` |
| branding-product-ui | `src/app/layout.tsx` |
| deployment-runtime | `vercel.json`, `Dockerfile` |

## Verifier

`verification/phase9-clara-host-verifier.mjs` is host-side evidence verification. It is intentionally read-only and never changes `omniroute-source/`.

Phase 9 remains open until a fresh CI run proves this verifier PASS.
