#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root=path.resolve(process.argv[2]||".");
const sourceRoot=path.resolve(process.argv[3]||"../omniroute-source");
const contractsPath=path.resolve(process.argv[4]||"extraction/omniroute-platform-core/verification/phase4-adapter-contracts.json");
const boundaryPath=path.resolve(process.argv[5]||"extraction/omniroute-platform-core/verification/phase3-host-boundary-contracts.json");
const inventoryPath=path.resolve(process.argv[6]||"extraction/omniroute-platform-core/verification/phase3-capability-root-inventory.json");
const out=path.resolve(process.argv[7]||"extraction/omniroute-platform-core/verification/phase4-adapter-contract-report.json");
const PIN="453918ab64f147604576e72d33e2bbfc12b2d1af", TREE="76f3546d48a7293b199b7571d13808bebadb6d1f";
const blockers=[], warnings=[];
const readJson=p=>{try{return JSON.parse(fs.readFileSync(p,"utf8"))}catch(e){blockers.push({kind:"invalid-json",file:path.relative(root,p),message:String(e.message)});return null}};
const git=(cwd,args)=>{const x=spawnSync("git",args,{cwd,encoding:"utf8",maxBuffer:64*1024*1024});return x.status===0?x.stdout.trim():null};
const contracts=readJson(contractsPath), boundaries=readJson(boundaryPath), inventory=readJson(inventoryPath);
if(!contracts||!boundaries||!inventory) { /* errors already recorded */ }
for(const [label,obj] of [["contracts",contracts],["boundaries",boundaries],["inventory",inventory]]){
  if(obj?.source_commit!==PIN) blockers.push({kind:"source-commit-mismatch",artifact:label,actual:obj?.source_commit,expected:PIN});
  if(obj?.source_tree!==TREE) blockers.push({kind:"source-tree-mismatch",artifact:label,actual:obj?.source_tree,expected:TREE});
}
const ids=(contracts?.contracts||[]).map(x=>x.id);
const dupIds=ids.filter((id,i)=>ids.indexOf(id)!==i);
if(dupIds.length) blockers.push({kind:"duplicate-contract-ids",ids:[...new Set(dupIds)]});
const boundaryById=new Map((boundaries?.contracts||[]).map(x=>[x.id,x]));
const capabilities=new Map((inventory?.capabilities||[]).map(x=>[x.id,x]));
const requiredMethods=new Map([
  ["identity-tenancy",["resolvePrincipal","authorize"]],
  ["credential-secret-store",["getSecret","putSecret","deleteSecret"]],
  ["persistence-database",["transaction","read","write","delete"]],
  ["billing-entitlements",["getEntitlements","consume"]],
  ["rag-memory-store",["upsert","search","delete"]],
  ["observability-sink",["emit"]],
  ["notification-delivery",["send"]],
  ["deployment-runtime",["getConfig","health"]]
]);
for(const c of contracts?.contracts||[]){
  if(!c.id||!c.interface) blockers.push({kind:"invalid-contract-identity",contract:c});
  if(c.host_owned!==true) blockers.push({kind:"contract-not-host-owned",id:c.id});
  const b=boundaryById.get(c.id);
  if(!b) blockers.push({kind:"missing-phase3-boundary-contract",id:c.id});
  else if(b.owner!=="host") blockers.push({kind:"boundary-not-host-owned",id:c.id,owner:b.owner});
  const expected=requiredMethods.get(c.id)||[];
  const declared=Array.isArray(c.required_methods)?c.required_methods:[];
  for(const m of expected) if(!declared.includes(m)) blockers.push({kind:"missing-required-method",id:c.id,method:m});
  const referenced=(b?.capabilities||[]);
  for(const cap of referenced) if(!capabilities.has(cap)) blockers.push({kind:"unknown-capability-reference",id:c.id,capability:cap});
}
const expectedIds=new Set(boundaries?.contracts?.map(x=>x.id)||[]);
for(const id of expectedIds) if(!ids.includes(id)) blockers.push({kind:"missing-adapter-contract",id});
const rules=Array.isArray(contracts?.rules)?contracts.rules:[];
for(const required of ["Adapters are explicit dependencies.","Host policy stays outside immutable source.","No source rewrite is permitted during Phase 4.","Core provider/routing semantics cannot be changed by adapters."])
  if(!rules.includes(required)) blockers.push({kind:"missing-phase4-rule",rule:required});
if(contracts?.immutable_source_modification!==false) blockers.push({kind:"immutable-source-modification-flag-not-false",actual:contracts?.immutable_source_modification});
if(!fs.existsSync(sourceRoot)) blockers.push({kind:"missing-pinned-source-worktree",path:sourceRoot});
else {
  const commit=git(sourceRoot,["rev-parse","HEAD"]), tree=git(sourceRoot,["rev-parse","HEAD^{tree}"]), status=git(sourceRoot,["status","--porcelain"]);
  if(commit!==PIN) blockers.push({kind:"pinned-source-commit-mismatch",actual:commit,expected:PIN});
  if(tree!==TREE) blockers.push({kind:"pinned-source-tree-mismatch",actual:tree,expected:TREE});
  if(status) blockers.push({kind:"immutable-source-worktree-modified",status:status.split(/\r?\n/).filter(Boolean).slice(0,20)});
}
const report={schema_version:1,phase:4,status:blockers.length?"FAIL":"PASS",source_commit:PIN,source_tree:TREE,contracts_checked:contracts?.contracts?.length||0,phase3_boundaries_checked:boundaries?.contracts?.length||0,capabilities_available:inventory?.capabilities?.length||0,immutable_source_modification:false,blockers,warnings};
fs.mkdirSync(path.dirname(out),{recursive:true}); fs.writeFileSync(out,JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report,null,2));
if(blockers.length) process.exitCode=2;
