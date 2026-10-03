# Phase 9 — Clara AI Platform Host Selection and Adapter Mapping

## Host selection

- Consumer repository: `Rilan-Dev/Clara-AI-Platform`
- Consumer branch: `feature/ai-core-from-doable-source`
- Selected role: production host consumer for the verified OmniRoute reusable core.
- Selection scope: host-side integration readiness only; this record does not authorize changes to `omniroute-source/`.
- OmniRoute source pin consumed by this integration:
  - commit: `453918ab64f147604576e72d33e2bbfc12b2d1af`
  - tree: `76f3546d48a7293b199b7571d13808bebadb6d1f`
  - Phase 7 descriptor SHA-256: `20451498014656f240d625b11dd1f14a8cde8a2ce766dc52e7405542c172b279`

## Host boundary

Clara owns the application identity/session model, organisation and agent tenancy, PostgreSQL persistence, Qdrant knowledge/RAG storage, provider credentials, commercial plans/entitlements, observability and audit sinks, email/notifications, product branding, and deployment/runtime configuration.

OmniRoute remains responsible for reusable provider/model registry, routing, fallback/resilience, quota/usage and cost logic, compression/context processing, protocol translation, MCP/A2A, tools/skills/plugins, multimodal orchestration, and related reusable first-party semantics already proven by the immutable snapshot.

## Nine Phase 4 contracts

| Contract | Clara host implementation boundary | Initial evidence |
|---|---|---|
| identity-tenancy | Clara session/auth + organisation/agent authorization; core receives an already-authorized principal/tenant context | `src/app/api/auth/`, `src/app/api/orgs/`, `src/lib/client-auth.ts` |
| credential-secret-store | Clara server-side provider credential/configuration storage; secrets never exposed to client or observability payloads | `.env.example`, provider/admin configuration surfaces, server-side platform configuration |
| persistence-database | Clara PostgreSQL and existing DB access/migration layer | `src/lib/db.ts`, `src/lib/db/` |
| billing-entitlements | Clara plan/entitlement guard and subscription/billing state | `src/lib/plan-guard.ts`, `src/lib/plans.ts`, `src/lib/billing-review.ts` |
| rag-memory-store | Clara Qdrant-backed knowledge-base/RAG layer plus tenant-scoped PostgreSQL metadata | `src/app/api/kbs/`, `src/app/api/documents/`, existing Qdrant configuration |
| observability-sink | Clara platform analytics, audit and system-status telemetry; sensitive payloads remain redacted by default | platform analytics/audit/system-status surfaces documented in Clara README |
| notification-delivery | Clara email/contact/notification services and templates | `src/lib/email.ts`, `src/lib/email-templates.ts`, contact API |
| branding-product-ui | Clara product identity, UI, public embeds and customer-facing presentation | Clara application UI and public/embed surfaces |
| deployment-runtime | Clara Vercel/cloud and Docker/VPS deployment/runtime configuration | `vercel.json`, `Dockerfile`, `docker-compose.yml`, deployment docs |

## Integration rules

1. This mapping is host-owned documentation; it does not copy or modify OmniRoute source.
2. Existing Clara mechanisms must be inspected and tested before implementation. A contract row is not proof that the adapter is already implemented.
3. Authorization and tenant resolution must occur before any OmniRoute core invocation.
4. Provider credentials must cross the boundary only through the secret-store contract; no secret is logged or serialized into client-visible results.
5. RAG operations must carry an explicit tenant/organisation/agent scope.
6. Billing/entitlement checks remain Clara policy and cannot change OmniRoute routing semantics.
7. Core results remain opaque at the adapter boundary unless a documented host contract explicitly requires a transformation.
8. Every implementation change must rerun the OmniRoute immutable integrity verifier and the Phase 1–8 evidence chain.
9. No production deployment is claimed until the dedicated Phase 9 machine verifier passes.

## Current status

**Host selected; adapter implementation not yet started.**

The next implementation step is to build a host-owned adapter package in Clara outside any immutable OmniRoute source snapshot, starting with identity/tenancy and persistence, then credential/RAG/entitlement/observability/notification/branding/deployment contracts. Each contract must receive deterministic tests before the Phase 9 verifier is considered complete.
