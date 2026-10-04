#!/usr/bin/env node
/**
 * Phase 9 — Clara host integration verifier.
 *
 * Host-side only. It never edits the pinned OmniRoute snapshot.
 * The verifier requires the complete Phase 1–8 evidence chain, exact source
 * identity, a clean Clara adapter seam, and deterministic evidence for all
 * nine host-owned contracts.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const hostRoot = path.resolve(process.argv[2] ?? "../clara-host");
const integrityPath = path.resolve(process.argv[3] ?? "extraction/omniroute-platform-core/verification/extraction-integrity-report.json");
const phase4Path = path.resolve(process.argv[4] ?? "extraction/omniroute-platform-core/verification/phase4-adapter-contract-report.json");
const phase5Path = path.resolve(process.argv[5] ?? "extraction/omniroute-platform-core/verification/phase5-adapter-contract-report.json");
const phase6Path = path.resolve(process.argv[6] ?? "extraction/omniroute-platform-core/verification/phase6-host-integration-report.json");
const phase7Path = path.resolve(process.argv[7] ?? "extraction/omniroute-platform-core/verification/phase7-core-export-report.json");
const phase8Path = path.resolve(process.argv[8] ?? "extraction/omniroute-platform-core/verification/phase8-consumer-report.json");
const outPath = path.resolve(process.argv[9] ?? "extraction/omniroute-platform-core/verification/phase9-clara-host-report.json");

const PIN = "453918ab64f147604576e72d33e2bbfc12b2d1af";
const TREE = "76f3546d48a7293b199b7571d13808bebadb6d1f";
const blockers = [];
const warnings = [];

const readJson = file => {
  if (!fs.existsSync(file)) {
    blockers.push({ kind: "missing-report", path: file });
    return null;
  }
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { blockers.push({ kind: "invalid-json", path: file }); return null; }
};
const read = file => {
  try { return fs.readFileSync(path.join(hostRoot, file), "utf8"); }
  catch { return ""; }
};
const exists = file => fs.existsSync(path.join(hostRoot, file));
const git = args => {
  const r = spawnSync("git", args, { cwd: hostRoot, encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : null;
};

if (!fs.existsSync(hostRoot)) {
  blockers.push({ kind: "missing-host-root", path: hostRoot });
  process.exitCode = 2;
} else {
  const hostCommit = git(["rev-parse", "HEAD"]);
  const hostBranch = git(["branch", "--show-current"]);
  if (!hostCommit) blockers.push({ kind: "host-not-git-checkout" });
  if (hostBranch !== "feature/ai-core-from-doable-source")
    blockers.push({ kind: "wrong-host-branch", actual: hostBranch, expected: "feature/ai-core-from-doable-source" });
}

const reports = {
  integrity: readJson(integrityPath),
  phase4: readJson(phase4Path),
  phase5: readJson(phase5Path),
  phase6: readJson(phase6Path),
  phase7: readJson(phase7Path),
  phase8: readJson(phase8Path),
};

for (const [name, report] of Object.entries(reports)) {
  if (!report) continue;
  if (report.pinned_source_commit && report.pinned_source_commit !== PIN)
    blockers.push({ kind: "wrong-source-commit", report: name, actual: report.pinned_source_commit, expected: PIN });
  if (report.pinned_source_tree && report.pinned_source_tree !== TREE)
    blockers.push({ kind: "wrong-source-tree", report: name, actual: report.pinned_source_tree, expected: TREE });
  if (Array.isArray(report.blockers) && report.blockers.length)
    blockers.push({ kind: "upstream-phase-blockers", report: name, count: report.blockers.length });
  const reportPassed = report.pass === true || report.status === "PASS" || report.status === "pass";
  if (report.pass === false || report.status === "FAIL" || report.status === "fail" || report.status === "BLOCKED" || report.status === "blocked")
    blockers.push({ kind: "upstream-phase-failed", report: name });
}
if (reports.integrity?.pass !== true) blockers.push({ kind: "phase2-integrity-not-pass" });
if (!(reports.phase7 && (reports.phase7.pass === true || reports.phase7.status === "PASS" || reports.phase7.status === "pass")))
  blockers.push({ kind: "phase7-export-not-pass" });
if (!(reports.phase8 && (reports.phase8.pass === true || reports.phase8.status === "PASS" || reports.phase8.status === "pass")))
  blockers.push({ kind: "phase8-consumer-not-pass" });

const required = {
  identity_tenancy: [
    "src/modules/ai-platform-core/contracts.ts",
    "src/modules/ai-platform-core/execution-context.ts",
    "src/modules/ai-platform-core/clara-adapters.ts",
    "src/modules/ai-platform-core/execution-context.test.ts",
  ],
  credential_secret_store: [
    "src/modules/ai-platform-core/clara-adapters.ts",
    "src/modules/ai-platform-core/clara-adapters.test.ts",
  ],
  persistence_database: ["src/lib/db.ts"],
  billing_entitlements: ["src/lib/plan-guard.ts", "src/lib/plans.ts"],
  rag_memory_store: ["src/modules/rag/grounding.ts", "src/modules/rag/grounding.test.ts"],
  observability_sink: [
    "src/app/api/analytics/usage/route.ts",
    "src/app/api/analytics/audit/route.ts",
  ],
  notification_delivery: ["src/lib/email.ts", "src/lib/email-templates.ts"],
  branding_product_ui: ["src/app/layout.tsx"],
  deployment_runtime: ["vercel.json", "Dockerfile"],
};

const contractEvidence = {};
for (const [contract, paths] of Object.entries(required)) {
  const present = paths.filter(exists);
  if (!present.length) blockers.push({ kind: "missing-host-contract-evidence", contract, candidates: paths });
  contractEvidence[contract] = { present, missing: paths.filter(p => !present.includes(p)) };
}

const adapter = read("src/modules/ai-platform-core/clara-adapters.ts");
const context = read("src/modules/ai-platform-core/execution-context.ts");
const registry = read("src/modules/ai-platform-core/adapter-registry.ts");
const runtime = read("src/modules/ai-platform-core/clara-runtime.ts");
const adapterTest = read("src/modules/ai-platform-core/clara-adapters.test.ts");
const contextTest = read("src/modules/ai-platform-core/execution-context.test.ts");
const registryTest = read("src/modules/ai-platform-core/adapter-registry.test.ts");

const invariants = {
  authorization_before_core:
    /assertExecutionContext\(context\)[\s\S]*claraRuntime\.resolveProvider/.test(adapter),
  mandatory_tenant_and_kb:
    /normalizeRequiredId\("orgId"/.test(context) && /normalizeRequiredId\("kbId"/.test(context),
  tenant_scope_guard:
    /assertTenantScope/.test(context) && /TENANT_SCOPE_MISMATCH/.test(context),
  secret_redaction_fail_closed:
    /transferPolicy:\s*"never"/.test(adapter) && /PlatformSecretAccessError/.test(adapter) && /async get\(\)[\s\S]*throw new PlatformSecretAccessError/.test(adapter),
  opaque_runtime_result: /return\s*\{\s*config,\s*providerName,\s*model,\s*stream,\s*grounding\s*\}/.test(runtime),
  registry_fails_closed:
    /ALREADY_REGISTERED/.test(registry) && /UnknownAdapterError/.test(registry) && /AdaptersNotRegisteredError/.test(registry),
  adapter_tests_present:
    adapterTest.length > 0 && contextTest.length > 0 && registryTest.length > 0,
  no_doable_source_runtime_import:
    !/(?:from|import)\s*["'](?:[^"']*doable-source|@doable)[^"']*["']/i.test(adapter + runtime),
};

for (const [name, ok] of Object.entries(invariants))
  if (!ok) blockers.push({ kind: "host-invariant-failed", invariant: name });

const hostPackage = exists("package.json") ? JSON.parse(read("package.json")) : null;
if (!hostPackage) blockers.push({ kind: "missing-host-package-json" });
if (hostPackage?.name !== "ai-knowledge-app")
  warnings.push({ kind: "unexpected-host-package-name", actual: hostPackage?.name ?? null });

const report = {
  schema_version: 1,
  host: {
    repository: "Rilan-Dev/Clara-AI-Platform",
    branch: git(["branch", "--show-current"]),
    commit: git(["rev-parse", "HEAD"]),
  },
  pinned_source: { commit: PIN, tree: TREE },
  upstream_evidence: Object.fromEntries(Object.entries(reports).map(([k, v]) => [k, v ? { pass: v.pass ?? null, blockers: Array.isArray(v.blockers) ? v.blockers.length : 0 } : null])),
  contract_evidence: contractEvidence,
  invariants,
  blockers,
  warnings,
  pass: blockers.length === 0,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({
  pass: report.pass,
  host_commit: report.host.commit,
  contracts: Object.keys(contractEvidence).length,
  blockers: blockers.length,
  output: outPath,
}, null, 2));
if (blockers.length) process.exitCode = 2;
