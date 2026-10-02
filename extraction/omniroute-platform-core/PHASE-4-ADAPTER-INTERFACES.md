# Phase 4 — Host Adapter Interface Specifications

## Status

Phase 4 specification only. These are host-owned contracts; they do not modify or wrap the immutable OmniRoute snapshot.

Pinned source:
- Commit: `453918ab64f147604576e72d33e2bbfc12b2d1af`
- Tree: `76f3546d48a7293b199b7571d13808bebadb6d1f`

## Non-negotiable boundary rules

1. The immutable OmniRoute snapshot remains byte-for-byte unchanged.
2. Adapters own host identity, tenancy, secrets, persistence, billing, RAG tenancy, observability sinks, notifications, branding, and deployment policy.
3. Core code must never receive host database clients, host billing SDKs, or host secret-manager credentials implicitly.
4. Adapter calls are explicit dependency-injection boundaries.
5. Adapter implementations may be asynchronous and may fail; core behavior must define deterministic failure semantics.
6. Adapters must not silently change provider/model/routing semantics.
7. Host-specific policy belongs in the adapter or host application, not in immutable source.

## Canonical TypeScript contracts

The following are interface specifications, not implementations.

### 1. Identity and tenancy

```ts
export interface PlatformPrincipal {
  subjectId: string;
  organizationId?: string;
  tenantId?: string;
  roles: readonly string[];
  scopes: readonly string[];
  metadata?: Readonly<Record<string, unknown>>;
}

export interface IdentityTenancyAdapter {
  resolvePrincipal(input: {
    externalSubject: string;
    requestId?: string;
  }): Promise<PlatformPrincipal>;
  authorize(input: {
    principal: PlatformPrincipal;
    capability: string;
    action: string;
    resource?: string;
  }): Promise<{ allowed: boolean; reason?: string }>;
}
```

### 2. Credential and secret storage

```ts
export interface CredentialSecretRef {
  provider: string;
  accountId: string;
  version?: string;
}

export interface CredentialSecretStoreAdapter {
  getSecret(ref: CredentialSecretRef): Promise<{
    secret: string;
    expiresAt?: string;
  } | null>;
  putSecret(input: CredentialSecretRef & {
    secret: string;
    expiresAt?: string;
  }): Promise<void>;
  deleteSecret(ref: CredentialSecretRef): Promise<void>;
}
```

The adapter is the only host boundary permitted to access the host secret manager. Secrets must not be persisted into logs, telemetry, audit payloads, or adapter errors.

### 3. Persistence

```ts
export interface PlatformPersistenceAdapter {
  transaction<T>(fn: () => Promise<T>): Promise<T>;
  read<T>(query: {
    namespace: string;
    key: string;
  }): Promise<T | null>;
  write<T>(input: {
    namespace: string;
    key: string;
    value: T;
    expiresAt?: string;
  }): Promise<void>;
  delete(input: {
    namespace: string;
    key: string;
  }): Promise<void>;
}
```

The host owns connection pooling, migrations, backups, encryption-at-rest, retention, and physical database placement. Core capability-specific stores may be layered above this contract without coupling them to a host ORM.

### 4. Billing and entitlements

```ts
export interface EntitlementSnapshot {
  planId?: string;
  features: readonly string[];
  limits: Readonly<Record<string, number>>;
  unlimited: readonly string[];
  effectiveAt?: string;
  expiresAt?: string;
}

export interface BillingEntitlementsAdapter {
  getEntitlements(input: {
    principal: PlatformPrincipal;
  }): Promise<EntitlementSnapshot>;
  consume(input: {
    principal: PlatformPrincipal;
    metric: string;
    amount: number;
    idempotencyKey: string;
  }): Promise<{
    allowed: boolean;
    remaining?: number;
  }>;
}
```

The core must not assume a commercial plan model. Hosts translate their own subscription/entitlement model into these platform-neutral limits.

### 5. RAG / memory storage

```ts
export interface MemoryRecord {
  id: string;
  text: string;
  metadata?: Readonly<Record<string, unknown>>;
  createdAt?: string;
}

export interface RagMemoryStoreAdapter {
  upsert(input: {
    principal: PlatformPrincipal;
    records: readonly MemoryRecord[];
  }): Promise<void>;
  search(input: {
    principal: PlatformPrincipal;
    query: string;
    topK: number;
    filters?: Readonly<Record<string, unknown>>;
  }): Promise<readonly MemoryRecord[]>;
  delete(input: {
    principal: PlatformPrincipal;
    ids: readonly string[];
  }): Promise<void>;
}
```

Tenant isolation, document authorization, embedding provider selection, vector database credentials, and retention are host responsibilities.

### 6. Observability

```ts
export interface ObservabilityEvent {
  name: string;
  timestamp: string;
  requestId?: string;
  principalId?: string;
  attributes?: Readonly<Record<string, unknown>>;
}

export interface ObservabilitySinkAdapter {
  emit(event: ObservabilityEvent): Promise<void>;
}
```

The adapter must implement host retention/redaction rules. Provider credentials, authorization headers, prompt secrets, and raw sensitive payloads must never be emitted by default.

### 7. Notifications

```ts
export interface NotificationDeliveryAdapter {
  send(input: {
    channel: "email" | "webhook" | "in-app";
    recipient: string;
    template: string;
    data: Readonly<Record<string, unknown>>;
    idempotencyKey?: string;
  }): Promise<{ delivered: boolean; providerMessageId?: string }>;
}
```

Delivery provider, retry policy, signing, rate limits, and destination ownership remain outside the immutable core.

### 8. Branding and product UI

Branding is intentionally a host-owned presentation boundary rather than a runtime service interface:

```ts
export interface ProductBranding {
  productName: string;
  logoUrl?: string;
  primaryColor?: string;
  supportUrl?: string;
  legalUrls?: Readonly<Record<string, string>>;
}
```

Core platform capability names and behavior must not be rewritten to match a host's commercial terminology.

### 9. Deployment and runtime

```ts
export interface DeploymentRuntimeAdapter {
  getConfig(): Promise<{
    baseUrl?: string;
    allowedOrigins: readonly string[];
    dataRegion?: string;
  }>;
  health(): Promise<{
    healthy: boolean;
    details?: Readonly<Record<string, unknown>>;
  }>;
}
```

The host owns process supervision, domains, TLS, network policy, filesystem paths, tunnels, native dependencies, browser/VNC infrastructure, and deployment-specific secrets.

## Dependency injection rule

A host integration should construct an adapter bundle explicitly:

```ts
export interface PlatformHostAdapters {
  identity: IdentityTenancyAdapter;
  secrets: CredentialSecretStoreAdapter;
  persistence: PlatformPersistenceAdapter;
  entitlements: BillingEntitlementsAdapter;
  memory: RagMemoryStoreAdapter;
  observability: ObservabilitySinkAdapter;
  notifications: NotificationDeliveryAdapter;
  deployment: DeploymentRuntimeAdapter;
  branding: ProductBranding;
}
```

No adapter implementation is part of Phase 4. The next implementation phase must first validate these contracts against the immutable capability inventory and identify any required core-facing injection points without changing immutable source bytes.
