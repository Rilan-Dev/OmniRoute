#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root=path.resolve(process.argv[2]||".");
const sourceRoot=path.resolve(process.argv[3]||"../omniroute-source");
const contractsPath=path.resolve(process.argv[4]||"extraction/omniroute-platform-core/verification/phase4-adapter-contracts.json");
const integrityPath=path.resolve(process.argv[5]||"extraction/omniroute-platform-core/verification/extraction-integrity-report.json");
const out=path.resolve(process.argv[6]||"extraction/omniroute-platform-core/verification/phase5-adapter-contract-report.json");
const PIN="453918ab64f147604576e72d33e2bbfc12b2d1af", TREE="76f3546d48a7293b199b7571d13808bebadb6d1f";
const blockers=[];
const read=p=>{try{return fs.readFileSync(path.resolve(root,p),"utf8")}catch{return null}};
const git=(cwd,args)=>{const x=spawnSync("git",args,{cwd,encoding:"utf8"});return x.status===0?x.stdout.trim():null};
const actualCommit=git(sourceRoot,["rev-parse","HEAD"]);
const actualTree=git(sourceRoot,["rev-parse","HEAD^{tree}"]);
if(actualCommit!==PIN) blockers.push({kind:"wrong-source-commit",actual:actualCommit,expected:PIN});
if(actualTree!==TREE) blockers.push({kind:"wrong-source-tree",actual:actualTree,expected:TREE});

let contracts=null;
try{contracts=JSON.parse(read(contractsPath));}catch{blockers.push({kind:"invalid-contracts-json"});}
const required=["identity-tenancy","credential-secret-store","persistence-database","billing-entitlements","rag-memory-store","observability-sink","notification-delivery","branding-product-ui","deployment-runtime"];
if(contracts){
  const ids=contracts.contracts||[];
  if(contracts.source_commit!==PIN||contracts.source_tree!==TREE) blockers.push({kind:"contract-source-pin-mismatch"});
  if(ids.length!==9||new Set(ids.map(x=>x.id)).size!==9) blockers.push({kind:"contract-set-invalid",count:ids.length});
  for(const id of required) if(!ids.some(x=>x.id===id&&x.host_owned===true)) blockers.push({kind:"missing-host-contract",id});
}

let integrity=null;
try{integrity=JSON.parse(read(integrityPath));}catch{blockers.push({kind:"invalid-integrity-report"});}
if(integrity && (integrity.pass!==true || integrity.mismatches?.length || integrity.missing?.length || integrity.extra?.length)) blockers.push({kind:"integrity-not-clean",pass:integrity.pass});

const test=spawnSync(process.execPath,["extraction/omniroute-platform-core/verification/phase5-adapter-contract-tests.mjs"],{cwd:root,encoding:"utf8"});
if(test.status!==0) blockers.push({kind:"phase5-contract-tests-failed",exit_code:test.status,stderr:test.stderr.slice(-4000),stdout:test.stdout.slice(-4000)});

const report={schema_version:1,phase:5,pinned_source_commit:PIN,pinned_source_tree:TREE,actual_source:{commit:actualCommit,tree:actualTree},contracts_checked:9,contract_test_exit_code:test.status,tenant_isolation:!blockers.some(x=>x.kind==="phase5-contract-tests-failed"),secret_redaction:!blockers.some(x=>x.kind==="phase5-contract-tests-failed"),deterministic_failure:!blockers.some(x=>x.kind==="phase5-contract-tests-failed"),routing_semantics_unchanged:!blockers.some(x=>x.kind==="phase5-contract-tests-failed"),blockers,pass:blockers.length===0};
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({pass:report.pass,blockers:blockers.length,output:out},null,2));
if(blockers.length)process.exitCode=2;
