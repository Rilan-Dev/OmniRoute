# OmniRoute Capability Inventory — Phase 1 Closure Baseline

| Capability | Tier | Class | Source closure | Persistence | API/UI closure | Status |
|---|---:|---|---|---|---|---|
| Provider registry/catalog | 1 | A+B | `open-sse/config/providerRegistry.ts`, `providerModels.ts`, `src/lib/providers/**`, provider services | provider connections/nodes | `src/app/api/providers/**`; providers/discovery/provider-stats UI | resolved-roots |
| Model registry/capabilities | 1 | A+B | `src/lib/model*.ts`, `open-sse/config/*Registry.ts`, model services | model/capability/context/intelligence DB modules | model/provider-model APIs + models UI | resolved-roots |
| Credential/account pooling | 1 | A+B | account selector/fallback/semaphore/rotator/gate/refresh + credential health | api keys/registered keys/runtime state | keys/providers APIs + keys/provider dialogs | resolved-roots |
| OAuth/credential lifecycle | 1 | A+B+C | `src/lib/oauth/**`, credential health | provider connection/token state | provider auth routes + connection UI | resolved-roots |
| Routing engine | 1 | A+B | `src/lib/routing/**`, routing services, task/reasoning/wildcard routers | routing rules/decisions | routing/route-explain/orchestration UI | resolved-roots |
| Combo/fusion + auto-combo | 1 | A+B | combo resolver/lib + `open-sse/services/combo/**` + autoCombo | combos/mappings/forecast/adaptive state | combo + auto-combo APIs/UI | resolved-roots |
| Fallback/degradation/resilience | 1 | A+B | domain fallback/degradation/lockout + resilience/circuit/retry/recovery trees | fallback/lockout/circuit/runtime state | fallback/resilience/health UI | resolved-roots |
| Quota/budget | 1 | A+B+C | `src/lib/quota/**`, key quota, quota services | quota snapshots/consumption/pools/groups/schedules/provider state | quota/limits APIs/UI | resolved-roots |
| Usage/cost | 1 | A+B+C | `src/lib/usage/**`, cost ledger/token accounting/call logs | usage/call logs/cost ledger/quota counters/aggregation | usage/cost/analytics/provider-stats UI | resolved-roots |
| Compression | 1 | A+B | full `open-sse/services/compression/**` + `src/lib/compression/**` | compression settings/analytics/cache/receipts/tokens/combos | compression/context APIs/UI | bounded-tree |
| Context/memory | 1 | A+B+C | full `src/lib/memory/**` + context services/resolvers | memories/vector/FTS/context handoffs/conversations | memory/context/conversation APIs/UI | bounded-tree |
| Cache | 1 | A+B | cache service/lib trees + semantic/prompt/reasoning cache | semantic/reasoning cache | cache API/UI | bounded-tree |
| Streaming/protocol translation | 1 | A+B | handlers/translator/transformer/WebSocket trees | continuation/session/request state as referenced | catch-all/v1/v1beta/translator + playground/endpoint | bounded-tree |
| MCP | 1 | A+B+C | full `open-sse/mcp-server/**` + MCP API | MCP tool audit/access state | MCP API/UI | bounded-tree |
| A2A | 1 | A+B+C | full `src/lib/a2a/**` + A2A app/API | A2A tasks/events | A2A API/UI | bounded-tree |
| Tools | 1 | A+B+C | tool registry/handlers/schemas/execution trees | server tool executions/audit | tools/search-tools API/UI | resolved-roots |
| Skills | 1/2 | A+B+C | full `src/lib/agentSkills/**` + `skills/**` | skills/executions/fences | agent-skills/omni-skills API/UI | bounded-tree |
| Plugins | 1/2 | A+B+C | full `src/lib/plugins/**` + plugin runtime | plugins/metrics/analytics | plugins API/UI | bounded-tree |
| Multimodal | 1 | A+B+C | media registries/handlers/translators/bridge | modality bridge + usage/log fields | media/search APIs/UI | resolved-roots |
| Guardrails/security | 1 | A+B+C | guardrails/security/authz/CORS/origin/sanitizers | key/security/audit state | guardrail/security/auth UI | resolved-roots |
| Observability | 1 | A+B+C | monitoring/events/OTel/telemetry/provider metrics | logs/usage analytics/provider stats | health/analytics/telemetry/log UI | resolved-roots |
| Audit | 1 | A+B+C | audit/config/MCP/event audit trees | config/MCP/tool audit | audit API/UI | resolved-roots |
| Evaluations | 1/2 | A+B | eval/router/compression evaluation trees | eval runs/suites/cases | eval API/UI + test fixtures | resolved-roots |
| Search/web fetch | 2 | A+B | search/web-fetch services and handlers | search request/log state | search API/UI | deferred to Phase 7 |
| CLI integrations | 2 | A+B | CLI tools/runtime/provider-specific CLI trees | CLI tool/access state | CLI APIs/UI | deferred to Phase 7 |
| Remote/cloud agents | 2 | A+B+C | cloud/ACP/remote agent trees | agent credentials/bridge state | cloud/ACP API/UI | deferred to Phase 7 |
| Browser/VNC/runtime | 2 | A+B | browser-pool/browser-backed/VNC trees | runtime/VNC session state | runtime/VNC API/UI | deferred to Phase 7 |
| MITM/TPROXY/tunnels | 2 | A+B | `src/mitm/**`, tunnel services/APIs | interception/tunnel state | runtime/tunnel UI | deferred to Phase 7 |
| Backup/sync/versioning | 2 | A+B+C | backup/sync/version-manager trees | backup/sync/version state | settings/system UI | deferred to Phase 7 |
| Webhooks/events | 2 | A+B+C | webhook/event/delivery trees | webhooks/deliveries | webhook API/UI | deferred to Phase 7 |
| Desktop/PWA | 2 | D/A | electron/PWA shell | desktop-specific state | desktop shell | deferred to Phase 7 |
| Product billing/branding | 3 | D | hosted product surface | commercial product state | pricing/subscription/product UI | product-only |

### Classification rule

- **A** = reusable implementation.
- **B** = immutable first-party dependency closure required by A.
- **C** = host adapter boundary.
- **D** = product-only.

A capability may be **A+B+C**: the implementation is reusable, but its identity, tenancy, secret storage, billing, transport, or external-service ownership must be supplied by a host adapter.

### Phase 1 conclusion

Tier-1 closures are sufficiently bounded to drive Phase 2 extraction planning, but **machine-complete recursive closure is still required before copying**. The extraction gate therefore remains closed.
