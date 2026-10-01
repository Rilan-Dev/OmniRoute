#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root=path.resolve(process.argv[2]||".");
const inventoryPath=path.resolve(process.argv[3]||"extraction/omniroute-platform-core/verification/phase3-capability-root-inventory.json");
const contractsPath=path.resolve(process.argv[4]||"extraction/omniroute-platform-core/verification/phase3-host-boundary-contracts.json");
const PIN="453918ab64f147604576e72d33e2bbfc12b2d1af", TREE="76f3546d48a7293b199b7571d13808bebadb6d1f";
const run=a=>{const r=spawnSync("git",a,{cwd:root,encoding:"utf8",maxBuffer:64*1024*1024});if(r.status!==0)throw new Error(r.stderr||"git failed");return r.stdout.trim()};
const commit=run(["rev-parse","HEAD"]),tree=run(["rev-parse","HEAD^{tree}"]);
if(commit!==PIN||tree!==TREE)throw new Error("Pinned source mismatch");
const inv=JSON.parse(fs.readFileSync(inventoryPath,"utf8")), contracts=JSON.parse(fs.readFileSync(contractsPath,"utf8"));
if(inv.source_commit!==PIN||inv.source_tree!==TREE||contracts.source_commit!==PIN||contracts.source_tree!==TREE)throw new Error("Boundary contract pin mismatch");
const ids=new Set((inv.capabilities||[]).map(x=>x.id)), failures=[];
const seen=new Set();
for(const c of contracts.contracts||[]){
  if(!c.id||c.owner!=="host"||!c.purpose||!Array.isArray(c.capabilities)||!c.capabilities.length) failures.push({id:c.id||null,kind:"invalid-contract"});
  if(seen.has(c.id)) failures.push({id:c.id,kind:"duplicate-contract-id"});
  seen.add(c.id);
  for(const id of c.capabilities||[]) if(!ids.has(id)) failures.push({contract:c.id,capability:id,kind:"unknown-capability"});
}
if(!contracts.contracts?.length) failures.push({kind:"no-host-boundary-contracts"});
console.log(JSON.stringify({schema_version:1,pass:!failures.length,source_commit:commit,source_tree:tree,contract_count:contracts.contracts?.length||0,failures},null,2));
if(failures.length)process.exitCode=2;
