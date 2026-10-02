export class InMemoryIdentityAdapter {
  constructor(principals = {}) { this.principals = new Map(Object.entries(principals)); }
  async resolvePrincipal({ externalSubject }) {
    const principal = this.principals.get(externalSubject);
    if (!principal) throw new Error("principal-not-found");
    return structuredClone(principal);
  }
  async authorize({ principal, capability, action }) {
    const allowed = principal.scopes.includes(`${capability}:${action}`) || principal.scopes.includes("*");
    return { allowed, ...(allowed ? {} : { reason: "scope-denied" }) };
  }
}

export class InMemorySecretAdapter {
  constructor() { this.secrets = new Map(); }
  #key(ref) { return `${ref.provider}:${ref.accountId}:${ref.version || "current"}`; }
  async getSecret(ref) { const v = this.secrets.get(this.#key(ref)); return v ? structuredClone(v) : null; }
  async putSecret(input) { this.secrets.set(this.#key(input), { secret: input.secret, ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}) }); }
  async deleteSecret(ref) { this.secrets.delete(this.#key(ref)); }
}

export class InMemoryPersistenceAdapter {
  constructor() { this.data = new Map(); }
  #key(namespace, key) { return `${namespace}:${key}`; }
  async transaction(fn) { return await fn(); }
  async read({ namespace, key }) { const v = this.data.get(this.#key(namespace, key)); return v === undefined ? null : structuredClone(v); }
  async write({ namespace, key, value, expiresAt }) { this.data.set(this.#key(namespace, key), { value: structuredClone(value), ...(expiresAt ? { expiresAt } : {}) }); }
  async delete({ namespace, key }) { this.data.delete(this.#key(namespace, key)); }
}

export class InMemoryEntitlementAdapter {
  constructor(snapshot = {}) { this.snapshot = snapshot; this.consumed = new Map(); }
  async getEntitlements() { return structuredClone(this.snapshot); }
  async consume({ metric, amount, idempotencyKey }) {
    if (this.consumed.has(idempotencyKey)) return structuredClone(this.consumed.get(idempotencyKey));
    const limit = this.snapshot.limits?.[metric];
    const used = [...this.consumed.values()].filter(x => x.metric === metric).reduce((n, x) => n + x.amount, 0);
    const allowed = this.snapshot.unlimited?.includes(metric) || limit === undefined || used + amount <= limit;
    const result = { allowed, ...(limit === undefined ? {} : { remaining: Math.max(0, limit - used - (allowed ? amount : 0)) }) };
    this.consumed.set(idempotencyKey, { ...result, metric, amount });
    return structuredClone(result);
  }
}

export class InMemoryMemoryAdapter {
  constructor() { this.records = new Map(); }
  async upsert({ principal, records }) {
    for (const record of records) this.records.set(`${principal.tenantId || principal.organizationId || principal.subjectId}:${record.id}`, structuredClone(record));
  }
  async search({ principal, query, topK }) {
    const tenant = principal.tenantId || principal.organizationId || principal.subjectId;
    return [...this.records.entries()]
      .filter(([key, value]) => key.startsWith(`${tenant}:`) && value.text.toLowerCase().includes(query.toLowerCase()))
      .slice(0, topK).map(([, value]) => structuredClone(value));
  }
  async delete({ principal, ids }) {
    const tenant = principal.tenantId || principal.organizationId || principal.subjectId;
    for (const id of ids) this.records.delete(`${tenant}:${id}`);
  }
}

export class RecordingObservabilityAdapter {
  constructor() { this.events = []; }
  async emit(event) { this.events.push(structuredClone(event)); }
}

export class RecordingNotificationAdapter {
  constructor() { this.messages = []; }
  async send(input) { this.messages.push(structuredClone(input)); return { delivered: true, providerMessageId: `fake-${this.messages.length}` }; }
}

export class StaticDeploymentAdapter {
  constructor(config = {}) { this.config = config; }
  async getConfig() { return structuredClone(this.config); }
  async health() { return { healthy: true }; }
}

export function branding(productName = "Platform") {
  return { productName };
}

export function createAdapterBundle({ principals, entitlements } = {}) {
  return {
    identity: new InMemoryIdentityAdapter(principals),
    secrets: new InMemorySecretAdapter(),
    persistence: new InMemoryPersistenceAdapter(),
    entitlements: new InMemoryEntitlementAdapter(entitlements),
    memory: new InMemoryMemoryAdapter(),
    observability: new RecordingObservabilityAdapter(),
    notifications: new RecordingNotificationAdapter(),
    deployment: new StaticDeploymentAdapter({ allowedOrigins: [] }),
    branding: branding()
  };
}
