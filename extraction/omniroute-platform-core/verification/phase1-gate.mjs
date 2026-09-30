#!/usr/bin/env node
/**
 * Phase 1 fail-closed report gate.
 * Read-only: validates generated reports, pinning, required sections and
 * zero unresolved blockers before Phase 2 exact source copying.
 */
import fs from "node:fs";

const EXPECTED_COMMIT = "453918ab64f147604576e72d33e2bbfc12b2d1af";
const EXPECTED_TREE = "76f3546d48a7293b199b7571d13808bebadb6d1f";

const primaryPath = process.argv[2] ?? "extraction/omniroute-platform-core/verification/phase1-closure-report.json";
const supplementalPath = process.argv[3] ?? "extraction/omniroute-platform-core/verification/phase1-supplemental-closure.json";
const mapPath = process.argv[4] ?? "extraction/omniroute-platform-core/verification/phase1-closure-map.json";
const phase7Path = process.argv[5] ?? "extraction/omniroute-platform-core/verification/phase7-second-pass.json";
const reconciliationPath = process.argv[6] ?? "extraction/omniroute-platform-core/verification/phase7-reconciliation.json";
const outPath = process.argv[7] ?? "extraction/omniroute-platform-core/verification/phase1-gate.json";

const blockers = [];
const readJson = p => {
  if (!fs.existsSync(p)) { blockers.push({kind:"missing-report",path:p}); return null; }
  try { return JSON.parse(fs.readFileSync(p,"utf8")); }
  catch { blockers.push({kind:"invalid-json",path:p}); return null; }
};
const primary = readJson(primaryPath);
const supplemental = readJson(supplementalPath);
const mapped = readJson(mapPath);
const phase7 = readJson(phase7Path);
const reconciliation = readJson(reconciliationPath);

if (primary) {
  if (primary.source_commit !== EXPECTED_COMMIT)
    blockers.push({kind:"wrong-or-missing-source-commit",actual:primary.source_commit ?? null,expected:EXPECTED_COMMIT});
  if (primary.source_tree !== EXPECTED_TREE)
    blockers.push({kind:"wrong-or-missing-source-tree",actual:primary.source_tree ?? null,expected:EXPECTED_TREE});
  if (!Array.isArray(primary.unresolved))
    blockers.push({kind:"missing-primary-unresolved-list"});
  else if (primary.unresolved.length)
    blockers.push({kind:"primary-unresolved-imports",count:primary.unresolved.length});
}
if (mapped) {
  if (mapped.pinned_source_commit !== EXPECTED_COMMIT) blockers.push({kind:"wrong-or-missing-map-pin",actual:mapped.pinned_source_commit ?? null,expected:EXPECTED_COMMIT});
  if (mapped.pinned_source_tree !== EXPECTED_TREE) blockers.push({kind:"wrong-or-missing-map-tree",actual:mapped.pinned_source_tree ?? null,expected:EXPECTED_TREE});
  if (!Array.isArray(mapped.blockers)) blockers.push({kind:"missing-map-blockers-list"});
  else if (mapped.blockers.length) blockers.push({kind:"closure-map-blockers",count:mapped.blockers.length});
  for (const key of ["database","dashboard","tests","packages","host_boundaries"]) if (mapped[key] === undefined) blockers.push({kind:"missing-map-section",section:key});
}
if (phase7) {
  if (phase7.pinned_source_commit !== EXPECTED_COMMIT) blockers.push({kind:"wrong-phase7-pin",actual:phase7.pinned_source_commit,expected:EXPECTED_COMMIT});
  if (phase7.pinned_source_tree !== EXPECTED_TREE) blockers.push({kind:"wrong-phase7-tree",actual:phase7.pinned_source_tree,expected:EXPECTED_TREE});
  if (!Array.isArray(phase7.blockers)) blockers.push({kind:"missing-phase7-blockers-list"});
  else if (phase7.blockers.length) blockers.push({kind:"phase7-blockers",count:phase7.blockers.length});
  if (!phase7.categories || typeof phase7.categories !== "object") blockers.push({kind:"missing-phase7-categories"});
}
if (reconciliation) {
  if (reconciliation.pinned_source_commit !== EXPECTED_COMMIT) blockers.push({kind:"wrong-reconciliation-pin",actual:reconciliation.pinned_source_commit,expected:EXPECTED_COMMIT});
  if (reconciliation.pinned_source_tree !== EXPECTED_TREE) blockers.push({kind:"wrong-reconciliation-tree",actual:reconciliation.pinned_source_tree,expected:EXPECTED_TREE});
  if (reconciliation.complete_review !== true) blockers.push({kind:"incomplete-phase7-reconciliation"});
  if (!Array.isArray(reconciliation.candidates)) blockers.push({kind:"missing-reconciliation-candidates"});
}
if (supplemental) {
  if (supplemental.pinned_source_commit !== EXPECTED_COMMIT)
    blockers.push({kind:"wrong-or-missing-supplemental-source-commit",actual:supplemental.pinned_source_commit ?? null,expected:EXPECTED_COMMIT});
  if (supplemental.pinned_source_tree !== EXPECTED_TREE)
    blockers.push({kind:"wrong-or-missing-supplemental-source-tree",actual:supplemental.pinned_source_tree ?? null,expected:EXPECTED_TREE});
  if (!Array.isArray(supplemental.blockers))
    blockers.push({kind:"missing-supplemental-blockers-list"});
  else if (supplemental.blockers.length)
    blockers.push({kind:"supplemental-blockers",count:supplemental.blockers.length});
}

const required = [
  ["primary","edges"],["primary","environment_references"],["primary","source_file_sha256"],
  ["supplemental","dynamic_imports"],["supplemental","runtime_filesystem_signals"],
  ["supplemental","database"],["supplemental","dashboard"],["supplemental","tests"],["supplemental","packages"],
  ["mapped","database"],["mapped","dashboard"],["mapped","tests"],["mapped","packages"],["mapped","host_boundaries"],
  ["phase7","categories"],["phase7","api_route_families"],["reconciliation","candidates"]
];
for (const [which,key] of required) {
  const obj=which==="primary"?primary:which==="supplemental"?supplemental:which==="mapped"?mapped:which==="phase7"?phase7:reconciliation;
  if (!obj || obj[key] === undefined) blockers.push({kind:"missing-report-section",report:which,section:key});
}

const result = {
  schema_version:1,
  expected_source_commit:EXPECTED_COMMIT,
  expected_source_tree:EXPECTED_TREE,
  primary_report:primaryPath,
  supplemental_report:supplementalPath,
  closure_map_report:mapPath,
  phase7_report:phase7Path,
  reconciliation_report:reconciliationPath,
  blockers,
  pass:blockers.length===0
};
fs.writeFileSync(outPath,JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify({pass:result.pass,blockers:blockers.length,output:outPath},null,2));
if (blockers.length) process.exitCode=2;
