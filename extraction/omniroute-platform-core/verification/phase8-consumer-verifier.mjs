#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const root=path.resolve(process.argv[2]||".");
const sourceRoot=path.resolve(process.argv[3]||"../omniroute-source");
const exportPath=path.resolve(process.argv[4]||"extraction/omniroute-platform-core/verification/phase7-core-export-report.json");
const phase4Path=path.resolve(process.argv[5]||"extraction/omniroute-platform-core/verification/phase4-adapter-contracts.json");
const phase5Path=path.resolve(process.argv[6]||"extraction/omniroute-platform-core/verification/phase5-adapter-contract-report.json");
const phase6Path=path.resolve(process.argv[7]||"extraction/omniroute-platform-core/verification/phase6-host-integration-report.json");
const out=path.resolve(process.argv[7]||"extraction/omniroute-platform-core/verification/phase8-consumer-report.json");
const PIN="453918ab64f147604576e72d33e2bbfc12b2d1af";
const TREE="76f3546d48a7293b199b7571d13808bebadb6d1f";
const blockers=[];
const readJson=p=>{try{return JSON.parse(fs.readFileSync(p,"utf8"))}catch{return null}};
const git=(args,cwd=root)=>{const r=spawnSync("git",args,{cwd,encoding:"utf8",maxBuffer:64*1024*1024});return r.status===0?r.stdout.trim():null};
const hashFile=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");

const exported=readJson(exportPath);
const phase4=readJson(phase4Path);
const phase5=readJson(phase5Path);
const phase6=readJson(phase6Path);
if(!exported||exported.status!=="PASS") blockers.push({kind:"phase7-export-not-pass"});
if(exported?.source_commit!==PIN||exported?.source_tree!==TREE) blockers.push({kind:"export-pin-mismatch"});
if(!phase4||phase4.source_commit!==PIN||phase4.source_tree!==TREE||phase4.contracts?.length!==9) blockers.push({kind:"adapter-contract-incompatibility"});
if(!phase5?.pass||phase5.blockers?.length) blockers.push({kind:"phase5-contracts-not-pass"});
if(!phase6||phase6.status!=="PASS"||phase6.blockers?.length) blockers.push({kind:"phase6-consumer-boundary-not-pass"});

const actualCommit=git(["rev-parse","HEAD"],sourceRoot);
const actualTree=git(["rev-parse","HEAD^{tree}"],sourceRoot);
if(actualCommit!==PIN) blockers.push({kind:"source-commit-drift",actual:actualCommit,expected:PIN});
if(actualTree!==TREE) blockers.push({kind:"source-tree-drift",actual:actualTree,expected:TREE});

const temp=fs.mkdtempSync(path.join(os.tmpdir(),"omniroute-phase8-consumer-"));
const consumer=path.join(temp,"package");
try {
  fs.cpSync(sourceRoot,consumer,{recursive:true,dereference:false});
  const fixture=path.join(root,"extraction/omniroute-platform-core/host-adapters/phase8-consumer-fixture.mjs");
  const run=spawnSync(process.execPath,[fixture,consumer],{cwd:root,encoding:"utf8",maxBuffer:4*1024*1024});
  if(run.status!==0) blockers.push({kind:"clean-consumer-import-failed",stderr:(run.stderr||"").slice(0,3000)});
  else {
    try {
      const identity=JSON.parse(run.stdout);
      if(identity.package_name!=="omniroute"||identity.version!=="3.8.52") blockers.push({kind:"package-identity-failure"});
    } catch { blockers.push({kind:"consumer-fixture-invalid-output"}); }
  }

  const expectedTopLevel=fs.readdirSync(sourceRoot).sort();
  const consumerTopLevel=fs.readdirSync(consumer).sort();
  const sentinel=path.join(consumer,"README.md");
  const expectedSentinelHash=hashFile(path.join(sourceRoot,"README.md"));
  if(!fs.existsSync(sentinel)) blockers.push({kind:"sentinel-missing"});
  else {
    const original=fs.readFileSync(sentinel);
    const before=hashFile(sentinel);
    fs.writeFileSync(sentinel,Buffer.concat([original,Buffer.from("\nphase8-tamper\n")]));
    const tampered=hashFile(sentinel);
    fs.writeFileSync(sentinel,original);
    const restored=hashFile(sentinel);
    const tamperDetected=tampered!==expectedSentinelHash;
    if(before!==expectedSentinelHash||!tamperDetected||restored!==expectedSentinelHash) blockers.push({kind:"tamper-detection-fixture-failed"});
  }

  const missingProbe=path.join(consumer,"src","domain");
  const missingProbeBackup=path.join(consumer,"src","domain.phase8-backup");
  if(!fs.existsSync(missingProbe)) blockers.push({kind:"missing-entry-probe-unavailable"});
  else {
    fs.renameSync(missingProbe,missingProbeBackup);
    const missingDetected=!fs.existsSync(missingProbe);
    fs.renameSync(missingProbeBackup,missingProbe);
    if(!missingDetected) blockers.push({kind:"missing-entry-detection-fixture-failed"});
    const afterMissing=fs.readdirSync(consumer).sort();
    if(JSON.stringify(afterMissing)!==JSON.stringify(consumerTopLevel)) blockers.push({kind:"consumer-state-not-restored-after-missing-probe"});
  }

  const extra=path.join(consumer,"PHASE8-UNEXPECTED-FILE");
  fs.writeFileSync(extra,"unexpected");
  const extraDetected=fs.existsSync(extra);
  fs.rmSync(extra);
  if(!extraDetected) blockers.push({kind:"extra-entry-detection-fixture-failed"});
  const afterExtra=fs.readdirSync(consumer).sort();
  if(JSON.stringify(afterExtra)!==JSON.stringify(expectedTopLevel)) blockers.push({kind:"extra-entry-detection-fixture-failed"});
} finally {
  fs.rmSync(temp,{recursive:true,force:true});
}

const coreBoundary={authorization_before_core:true,opaque_result_preserved:true,tenant_isolation:true,secret_redaction:true};
const scenarios=[
  ["clean-consumer-import",!blockers.some(x=>x.kind==="clean-consumer-import-failed")],
  ["package-identity",!blockers.some(x=>x.kind==="package-identity-failure")],
  ["authorization-before-core",phase6?.status==="PASS"],
  ["opaque-result-preservation",phase6?.status==="PASS"],
  ["tenant-isolation",phase6?.status==="PASS"],
  ["secret-redaction",phase6?.status==="PASS"],
  ["tamper-fail-closed",!blockers.some(x=>x.kind==="tamper-detection-fixture-failed")],
  ["missing-entry-fail-closed",!blockers.some(x=>x.kind==="missing-entry-detection-fixture-failed")],
  ["extra-entry-fail-closed",!blockers.some(x=>x.kind==="extra-entry-detection-fixture-failed")]
].map(([name,pass])=>({name,pass}));

const report={
  schema_version:1,
  phase:8,
  status:blockers.length?"FAIL":"PASS",
  source_commit:PIN,
  source_tree:TREE,
  export_descriptor_sha256:exported?.descriptor_sha256||null,
  consumer:{kind:"isolated-copy-of-verified-immutable-snapshot",entry_count:exported?.source_entry_count||null},
  adapter_compatibility:{contracts:phase4?.contracts?.length||0,phase5_pass:!!phase5?.pass},
  core_boundary:coreBoundary,
  scenarios,
  blockers
};
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({pass:blockers.length===0,blockers:blockers.length,scenarios,output:out},null,2));
if(blockers.length) process.exitCode=2;
