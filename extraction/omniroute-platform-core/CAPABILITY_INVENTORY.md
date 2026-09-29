# OmniRoute Capability Inventory — Phase 0/1 Working Baseline

| Capability | Primary source anchors | Tier | Class | UI surface |
|---|---|---|---|---|
| Provider registry/catalog | `open-sse/config/providerRegistry.ts`, `providerModels.ts`, `src/lib/providers/` | 1 | A | providers, discovery, models |
| Model registry/capabilities | `src/lib/model*`, `open-sse/config/*Registry*`, `open-sse/services/model*` | 1 | A | models, provider models |
| Credential/account pooling | `open-sse/services/account*`, `apiKeyRotator.ts`, `credentialGate.ts` | 1 | A+B | providers, keys |
| OAuth/credential lifecycle | `src/lib/oauth/`, `src/lib/credentialHealth/` | 1 | A+B | provider connection/config dialogs |
| Routing engine | `src/lib/routing/`, `open-sse/services/routing*`, task/reasoning routers | 1 | A | routing, auto-combo |
| Combo/fusion | `src/domain/comboResolver.ts`, `src/lib/combos/`, `open-sse/services/combo/` | 1 | A+B | combos |
| Auto-combo | `open-sse/services/autoCombo/` | 1 | A+B | auto-combo |
| Fallback/degradation | `src/domain/fallbackPolicy.ts`, degradation, lockout, provider expiration | 1 | A+B | fallback/resilience |
| Resilience/circuit breakers | `src/lib/resilience/`, connection/error/retry services | 1 | A+B | resilience, health |
| Quota/budget | `src/lib/quota/`, `open-sse/services/quota*`, `keyQuota.ts` | 1 | A+B | quota, limits, costs |
| Usage/cost | `src/lib/usage/`, `src/lib/db/costLedger.ts`, usage DB | 1 | A+B | usage, costs, provider stats |
| Compression | `open-sse/services/compression/`, `src/lib/compression/` | 1 | A+B | compression, context |
| Context/memory | `src/lib/memory/`, context services/resolvers | 1 | A+B | memory, context, conversations |
| Cache | semantic/prompt/reasoning cache trees | 1 | A+B | cache |
| Streaming/protocol translation | `open-sse/handlers/`, `translator/`, `transformer/`, `src/server/ws/` | 1 | A+B | playground/streaming states |
| MCP | `open-sse/mcp-server/`, `src/app/api/mcp`, `src/app/(dashboard)/dashboard/mcp` | 1 | A+B | MCP |
| A2A | `src/lib/a2a/`, `src/app/api/a2a`, dashboard A2A | 1 | A+B | A2A |
| Tools | tool handlers, schemas, tool sanitizer/latency services, tools API/UI | 1 | A+B | tools |
| Skills | `src/lib/agentSkills/`, `skills/`, skills APIs/UI | 1/2 | A+B | agent-skills, omni-skills |
| Plugins | `src/lib/plugins/`, plugin APIs/UI | 1/2 | A+B | plugins |
| Multimodal | image/audio/video/embedding/rerank/OCR/search handlers and registries | 1 | A+B | media providers/search tools |
| Search/web fetch | `src/lib/search/`, search/web-fetch handlers/executors | 2 | A+B | search tools |
| Guardrails/security | guardrails, security, authz, sanitizers, exposure controls | 1 | A+B+C | guardrails/security/settings |
| Observability | monitoring, routing OTel, events, telemetry APIs | 1 | A+B+C | health, analytics, telemetry |
| Audit | `src/lib/audit/`, config/MCP audit, audit APIs/UI | 1 | A+B+C | audit |
| Evaluations | `src/lib/evals/`, `src/lib/routerEval/`, compression eval | 1/2 | A+B | evals |
| CLI integrations | `src/lib/cliTools/`, `bin/cli/`, provider-specific CLI services, skills | 2 | A+B | cli-agents, cli-code |
| API compatibility | catch-all API, OpenAI/Claude/Gemini/Responses translators | 1 | A+B | endpoint/API manager |
| Remote/cloud agents | `src/lib/cloudAgent/`, ACP, remote services | 2 | A+B+C | cloud agents, ACP |
| Browser runtime | browser pool/backed chat/VNC | 2 | A+B | runtime, VNC |
| MITM/TPROXY | `src/mitm/` | 2 | A+B | runtime/settings |
| Tunnels | Cloudflare/ngrok/tunnel APIs and services | 2 | A+B | tunnels |
| Backup/sync/versioning | DB backup, cloud sync, version manager | 2 | A+B+C | settings/system |
| Webhooks/events | webhooks API/UI, event bus, deliveries | 2 | A+B+C | webhooks |
| Desktop/PWA | `electron/`, PWA shell | 2 | D/A | desktop shell |
| Product billing/branding | product pages, subscriptions and hosted commercial concerns | 3 | D | product UI |

## Classification rule
A = reusable implementation; B = required immutable dependency closure; C = host adapter boundary; D = product-only.

## Current status
This inventory is a working classification. Final classification is blocked on dependency-closure analysis and source/UI closure verification.