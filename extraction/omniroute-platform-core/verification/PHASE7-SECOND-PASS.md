# Phase 7 — Reusable Capability Second-Pass Scanner

This is an independent discovery pass. It is broader than the initial Tier-1 inventory and exists to catch reusable application-platform source that a focused provider/orchestration analysis could miss.

## Coverage
- realtime/WebSocket/voice/live streaming
- visual editing/collaboration/CRDT/Yjs/presence
- attachments/media/image/video/audio/OCR/multimodal generation
- project/runtime/code generation and execution
- templates/scaffolding/framework-aware functionality
- version control/diff/restore/snapshot/backup/sync
- analytics/usage/credits/quota/cost/telemetry
- notifications/email/webhooks/events
- browser/CLI/cloud/remote agents
- MCP/A2A/plugins/skills/integrations/tools
- AI planning/clarification/evaluation/feedback/orchestration
- security/audit/observability/governance
- persistence/search/memory/RAG/context

## Execution
Run only against the complete pinned checkout:
node extraction/omniroute-platform-core/verification/phase7-second-pass.mjs <repo-root> <report-output>

The scanner verifies the pinned commit and root tree. It is discovery evidence, not semantic proof, and does not authorize source copying.

## Acceptance
Every candidate must be reviewed and joined into the capability inventory and closure. Phase 7 cannot override the Phase 1 fail-closed gate. Phase 2 remains blocked until Phase 1 machine-complete verification passes.
