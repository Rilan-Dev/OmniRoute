#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root=path.resolve(process.argv[2]||".");
const sourceRoot=path.resolve(process.argv[3]||"../omniroute-source");
const integrityPath=path.resolve(process.argv[4]||"extraction/omniroute-platform-core/verification/extraction-integrity-report.json");
const phase4Path=path.resolve(process.argv[5]||"extraction/omniroute-platform-core/verification/phase4-adapter-contracts.json");
const phase5Path=path.resolve(process.argv[6]||"extraction/omniroute-platform-core/verification/phase5-adapter-contract-report.json");
const out=path.resolve(process.argv[7]||"extraction/omniroute-platform-core/verification/phase6-host-integration-report.json");
const PIN="453918ab64f147604576e72d33e2bbfc12b2d1af";
const TREE="76f3546d48a7293b199b7571d13808bebadb6d1f";
const blockers=[];
const abs=p=>path.join(root,p);
const readJson=p=>{try{return JSON.parse(fs.readFileSync(p,"utf8"))}catch{return null}};
const git=(args,cwd=root)=>{const x=spawnSync("git",args,{cwd,encoding:"utf8",maxBuffer:64*1024*1024});return x.status===0?x.stdout.trim():null};
const actualCommit=git(["rev-parse","HEAD"],sourceRoot);
const actualTree=git(["rev-parse","HEAD^{tree}"],sourceRoot);
if(actualCommit!==PIN) blockers.push({kind:"wrong-source-commit",actual:actualCommit,expected:PIN});
if(actualTree!==TREE) blockers.push({kind:"wrong-source-tree",actual:actualTree,expected:TREE});

const integrity=readJson(integrityPath);
if(!integrity?.pass||integrity.blockers?.length) blockers.push({kind:"integrity-not-pass"});
const phase4=readJson(phase4Path);
if(!phase4||phase4.contracts?.length!==9) blockers.push({kind:"phase4-contract-set-invalid"});
const phase5=readJson(phase5Path);
if(!phase5?.pass||phase5.blockers?.length) blockers.push({kind:"phase5-contracts-not-pass"});

const reference=path.join(root,"extraction/omniroute-platform-core/host-adapters/phase6-reference-host.mjs");
if(!fs.existsSync(reference)) blockers.push({kind:"missing-reference-host"});
else {
  const run=spawnSync(process.execPath,[reference],{cwd:root,encoding:"utf8",maxBuffer:2*1024*1024});
  if(run.status!==0) blockers.push({kind:"reference-host-execution-failed",stderr:(run.stderr||"").slice(0,2000)});
  else {
    try {
      const r=JSON.parse(run.stdout);
      if(!r.allowed?.ok) blockers.push({kind:"allowed-request-failed"});
      if(r.denied?.ok!==false||r.denied?.code!=="FORBIDDEN") blockers.push({kind:"authorization-failure-not-deterministic"});
      if(r.invocations!==1) blockers.push({kind:"core-invocation-count",actual:r.invocations,expected:1});
      if(r.allowed.result?.provider!=="opaque-provider"||r.allowed.result?.model!=="opaque-model") blockers.push({kind:"opaque-core-result-changed"});
      if(JSON.stringify(r.tenantA)!=="[]"||r.tenantB?.length!==1) blockers.push({kind:"tenant-isolation-failure"});
      const leaked=r.observabilityEvents?.some(e=>JSON.stringify(e).includes("should-not-leak"));
      if(leaked) blockers.push({kind:"secret-redaction-failure"});
    } catch { blockers.push({kind:"reference-host-invalid-json"}); }
  }
}

const status={schema_version:1,phase:6,status:blockers.length?"FAIL":"PASS",source_commit:PIN,source_tree:TREE,blockers};
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify(status,null,2)+"\n");
console.log(JSON.stringify(status,null,2));
if(blockers.length) process.exitCode=2;
