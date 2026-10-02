const SECRET_KEYS = /(?:secret|token|password|authorization|api[-_]?key|private[-_]?key)/i;

export function redactSensitive(value) {
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, value]) => [
    key,
    SECRET_KEYS.test(key) ? "[REDACTED]" : redactSensitive(value)
  ]));
}

export async function invokeWithAdapters({ adapters, principal, capability, action, request, coreInvoke }) {
  const auth = await adapters.identity.authorize({ principal, capability, action, resource: request?.resource });
  if (!auth.allowed) return { ok: false, code: "FORBIDDEN", reason: auth.reason || "not-authorized" };

  const result = await coreInvoke(request);

  await adapters.observability.emit({
    name: "platform.invocation.completed",
    timestamp: "2026-01-01T00:00:00.000Z",
    requestId: request?.requestId,
    principalId: principal.subjectId,
    attributes: redactSensitive({ capability, action, result: result?.summary })
  });

  return { ok: true, result };
}
