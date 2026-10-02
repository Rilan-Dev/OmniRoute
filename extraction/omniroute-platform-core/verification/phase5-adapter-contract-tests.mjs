import assert from "node:assert/strict";
import {
  createAdapterBundle,
  InMemorySecretAdapter,
  InMemoryMemoryAdapter
} from "../host-adapters/phase5-fakes.mjs";
import { invokeWithAdapters } from "../host-adapters/phase5-bridge.mjs";

const principalA = { subjectId: "user-a", organizationId: "org-a", tenantId: "tenant-a", roles: ["member"], scopes: ["demo:read"] };
const principalB = { subjectId: "user-b", organizationId: "org-b", tenantId: "tenant-b", roles: ["member"], scopes: ["demo:read"] };
const adapters = createAdapterBundle({
  principals: { "user-a": principalA, "user-b": principalB },
  entitlements: { planId: "fake", features: ["demo"], limits: { requests: 2 }, unlimited: [] }
});

// 1. Identity / tenancy.
assert.deepEqual(await adapters.identity.resolvePrincipal({ externalSubject: "user-a" }), principalA);
assert.deepEqual(await adapters.identity.authorize({ principal: principalA, capability: "demo", action: "read" }), { allowed: true });
assert.deepEqual(await adapters.identity.authorize({ principal: principalA, capability: "demo", action: "write" }), { allowed: false, reason: "scope-denied" });

// 2. Secret storage and redaction boundary.
const secretRef = { provider: "fake-provider", accountId: "account-a" };
await adapters.secrets.putSecret({ ...secretRef, secret: "TOP-SECRET" });
assert.equal((await adapters.secrets.getSecret(secretRef)).secret, "TOP-SECRET");
const redacted = (await import("../host-adapters/phase5-bridge.mjs")).redactSensitive({ apiKey: "TOP-SECRET", nested: { password: "P" }, safe: "ok" });
assert.deepEqual(redacted, { apiKey: "[REDACTED]", nested: { password: "[REDACTED]" }, safe: "ok" });

// 3. Persistence.
await adapters.persistence.transaction(async () => adapters.persistence.write({ namespace: "tenant-a", key: "k", value: { ok: true } }));
assert.deepEqual(await adapters.persistence.read({ namespace: "tenant-a", key: "k" }), { value: { ok: true } });

// 4. Billing / entitlement idempotency.
assert.equal((await adapters.entitlements.consume({ principal: principalA, metric: "requests", amount: 1, idempotencyKey: "idem-1" })).allowed, true);
assert.deepEqual(
  await adapters.entitlements.consume({ principal: principalA, metric: "requests", amount: 1, idempotencyKey: "idem-1" }),
  await adapters.entitlements.consume({ principal: principalA, metric: "requests", amount: 1, idempotencyKey: "idem-1" })
);

// 5. RAG / memory tenant isolation.
await adapters.memory.upsert({ principal: principalA, records: [{ id: "r1", text: "tenant-a secret knowledge" }] });
await adapters.memory.upsert({ principal: principalB, records: [{ id: "r1", text: "tenant-b knowledge" }] });
assert.equal((await adapters.memory.search({ principal: principalA, query: "knowledge", topK: 10 })).length, 1);
assert.equal((await adapters.memory.search({ principal: principalB, query: "knowledge", topK: 10 })).length, 1);
assert.equal((await adapters.memory.search({ principal: principalA, query: "tenant-b", topK: 10 })).length, 0);

// 6. Observability sensitive-payload default.
const core = async () => ({ summary: { apiKey: "SHOULD-NOT-LEAK", status: "ok" } });
const ok = await invokeWithAdapters({ adapters, principal: principalA, capability: "demo", action: "read", request: { requestId: "req-1" }, coreInvoke: core });
assert.equal(ok.ok, true);
assert.equal(adapters.observability.events[0].attributes.result.apiKey, "[REDACTED]");

// 7. Notifications.
const delivered = await adapters.notifications.send({ channel: "in-app", recipient: "user-a", template: "demo", data: { status: "ok" }, idempotencyKey: "n1" });
assert.equal(delivered.delivered, true);

// 8. Branding.
assert.equal(adapters.branding.productName, "Platform");

// 9. Deployment/runtime.
assert.deepEqual(await adapters.deployment.getConfig(), { allowedOrigins: [] });
assert.equal((await adapters.deployment.health()).healthy, true);

// Deterministic adapter failure: authorization failure returns a stable result and never invokes core.
let coreCalls = 0;
const denied = await invokeWithAdapters({
  adapters,
  principal: principalB,
  capability: "demo",
  action: "write",
  request: { requestId: "req-denied" },
  coreInvoke: async () => { coreCalls++; throw new Error("must-not-run"); }
});
assert.deepEqual(denied, { ok: false, code: "FORBIDDEN", reason: "scope-denied" });
assert.equal(coreCalls, 0);

// Provider/routing semantics are opaque to the bridge: the core function is invoked exactly once and its result is not rewritten.
let invocations = 0;
const coreResult = { provider: "provider-a", route: "route-a" };
const routed = await invokeWithAdapters({
  adapters,
  principal: principalA,
  capability: "demo",
  action: "read",
  request: { requestId: "req-route" },
  coreInvoke: async () => { invocations++; return coreResult; }
});
assert.equal(invocations, 1);
assert.deepEqual(routed.result, coreResult);

console.log(JSON.stringify({
  pass: true,
  contracts: 9,
  tenant_isolation: true,
  secret_redaction: true,
  deterministic_failure: true,
  routing_semantics_unchanged: true
}, null, 2));
