#!/usr/bin/env node
/**
 * Phase 7 deterministic reconciliation.
 * Joins every discovered candidate back to the Phase 1 capability inventory.
 * It never copies or modifies pinned OmniRoute source.
 */
import fs from "node:fs";
import path from "node:path";

const phase7Path = path.resolve(process.argv[2] ?? "extraction/omniroute-platform-core/verification/phase7-second-pass.json");
const outPath = path.resolve(process.argv[3] ?? "extraction/omniroute-platform-core/verification/phase7-reconciliation.json");
const PIN = "453918ab64f147604576e72d33e2bbfc12b2d1af";
const TREE = "76f3546d48a7293b199b7571d13808bebadb6d1f";

const blockers = [];
const warnings = [];

function readJson(file) {
  if (!fs.existsSync(file)) {
    blockers.push({ kind: "missing-report", path: file });
    return null;
  }
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { blockers.push({ kind: "invalid-json", path: file }); return null; }
}

const phase7 = readJson(phase7Path);
const candidates = new Map();

if (phase7) {
  if (phase7.pinned_source_commit !== PIN)
    blockers.push({ kind: "wrong-source-commit", actual: phase7.pinned_source_commit, expected: PIN });
  if (phase7.pinned_source_tree !== TREE)
    blockers.push({ kind: "wrong-source-tree", actual: phase7.pinned_source_tree, expected: TREE });
  if (phase7.actual_checkout?.commit !== PIN)
    blockers.push({ kind: "wrong-checkout-commit", actual: phase7.actual_checkout?.commit, expected: PIN });
  if (phase7.actual_checkout?.tree !== TREE)
    blockers.push({ kind: "wrong-checkout-tree", actual: phase7.actual_checkout?.tree, expected: TREE });

  for (const [category, finding] of Object.entries(phase7.categories ?? {})) {
    for (const item of finding.files ?? []) {
      if (!candidates.has(item.file)) candidates.set(item.file, new Set());
      candidates.get(item.file).add(category);
    }
  }
}

const reusableRoots = [
  "src/domain/", "src/lib/", "src/server/", "src/sse/", "src/mitm/",
  "open-sse/", "@omniroute/", "packages/", "skills/", "bin/", "scripts/", "config/"
];

const productOnly = [
  /(^|\/)pricing(\/|$)/i,
  /(^|\/)subscriptions?(\/|$)/i,
  /(^|\/)billing(\/|$)/i,
  /(^|\/)branding(\/|$)/i
];

const hostBoundarySignals = [
  /(^|\/)auth(\/|$)/i,
  /(^|\/)tenant/i,
  /(^|\/)organization/i,
  /(^|\/)secret/i,
  /(^|\/)credential/i
];

function disposition(file, categories) {
  if (productOnly.some(re => re.test(file))) {
    return {
      class: "D",
      disposition: "product-only-candidate",
      reason: "Explicit product/commercial surface; retain in audit but do not force into reusable runtime core.",
    };
  }
  if (hostBoundarySignals.some(re => re.test(file))) {
    return {
      class: "A+B+C",
      disposition: "reusable-with-host-boundary",
      reason: "Reusable implementation is retained; identity/tenant/secret ownership must be supplied by a host adapter.",
    };
  }
  if (reusableRoots.some(root => file.startsWith(root))) {
    return {
      class: "A+B",
      disposition: "reusable-platform-source",
      reason: "First-party implementation/dependency tree under a known reusable platform root.",
    };
  }
  if (categories.size) {
    return {
      class: "A+B",
      disposition: "reusable-capability-candidate",
      reason: "Discovered by the independent reusable-capability second pass.",
    };
  }
  return {
    class: null,
    disposition: "unreviewed",
    reason: "No deterministic disposition rule matched.",
  };
}

const records = [...candidates.entries()].map(([file, cats]) => {
  const d = disposition(file, cats);
  return { file, categories: [...cats].sort(), ...d };
});

const unreviewed = records.filter(x => x.disposition === "unreviewed");
if (unreviewed.length)
  blockers.push({ kind: "unreviewed-candidates", count: unreviewed.length, sample: unreviewed.slice(0, 50) });

const counts = {};
for (const record of records) counts[record.disposition] = (counts[record.disposition] ?? 0) + 1;

const report = {
  schema_version: 1,
  pinned_source_commit: PIN,
  pinned_source_tree: TREE,
  candidate_count: records.length,
  dispositions: counts,
  candidates: records,
  complete_review: blockers.length === 0,
  semantic_review_note: "Deterministic path/category classification is coverage evidence, not permission to delete or modify source. Product-only classification never removes a file from an immutable snapshot.",
  blockers,
  warnings,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({
  pass: blockers.length === 0,
  candidate_count: records.length,
  dispositions: counts,
  blockers: blockers.length,
  output: outPath,
}, null, 2));
if (blockers.length) process.exitCode = 2;
