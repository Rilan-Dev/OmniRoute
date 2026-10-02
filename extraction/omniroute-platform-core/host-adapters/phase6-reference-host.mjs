import { invokeWithAdapters } from "./phase5-bridge.mjs";
import { createAdapterBundle } from "./phase5-fakes.mjs";

export async function runReferenceHost() {
  const adapters = createAdapterBundle({
    principals: {
      "tenant-a-user": {
        subjectId: "user-a",
        tenantId: "tenant-a",
        scopes: ["router:invoke"]
      },
      "tenant-b-user": {
        subjectId: "user-b",
        tenantId: "tenant-b",
        scopes: ["router:invoke"]
      },
      "denied-user": {
        subjectId: "user-denied",
        tenantId: "tenant-a",
        scopes: []
      }
    }
  });

  const coreResult = {
    provider: "opaque-provider",
    model: "opaque-model",
    summary: { apiKey: "should-not-leak", answer: "core-result" }
  };
  let invocations = 0;

  const coreInvoke = async request => {
    invocations += 1;
    return { ...coreResult, requestId: request.requestId };
  };

  const allowed = await invokeWithAdapters({
    adapters,
    principal: await adapters.identity.resolvePrincipal({ externalSubject: "tenant-a-user" }),
    capability: "router",
    action: "invoke",
    request: { requestId: "req-1", resource: { tenantId: "tenant-a" } },
    coreInvoke
  });

  const denied = await invokeWithAdapters({
    adapters,
    principal: await adapters.identity.resolvePrincipal({ externalSubject: "denied-user" }),
    capability: "router",
    action: "invoke",
    request: { requestId: "req-2", resource: { tenantId: "tenant-a" } },
    coreInvoke
  });

  await adapters.memory.upsert({
    principal: { tenantId: "tenant-a" },
    records: [{ id: "a1", text: "tenant-a secret context" }]
  });
  await adapters.memory.upsert({
    principal: { tenantId: "tenant-b" },
    records: [{ id: "b1", text: "tenant-b private context" }]
  });

  const tenantA = await adapters.memory.search({
    principal: { tenantId: "tenant-a" },
    query: "private",
    topK: 10
  });
  const tenantB = await adapters.memory.search({
    principal: { tenantId: "tenant-b" },
    query: "private",
    topK: 10
  });

  return {
    allowed,
    denied,
    invocations,
    opaqueCoreResult: coreResult,
    observabilityEvents: adapters.observability.events,
    tenantA,
    tenantB
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(await runReferenceHost(), null, 2));
}
