#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
const root=path.resolve(process.argv[2]||".");
const inventoryPath=path.resolve(process.argv[3]||"extraction/omniroute-platform-core/verification/phase3-capability-root-inventory.json");
const PIN="453918ab64f147604576e72d33e2bbfc12b2d1af", TREE="76f3546d48a7293b199b7571d13808bebadb6d1f";
const run=a=>{const r=spawnSync("git",a,{cwd:root,encoding:"utf8",maxBuffer:64*1024*1024});if(r.status!==0)throw new Error(r.stderr||"git failed");return r.stdout.trim()};
const commit=run(["rev-parse","HEAD"]),tree=run(["rev-parse","HEAD^{tree}"]);
if(commit!==PIN||tree!==TREE)throw new Error("Pinned source mismatch");
const inv=JSON.parse(fs.readFileSync(inventoryPath,"utf8"));
if(inv.source_commit!==PIN||inv.source_tree!==TREE)throw new Error("Inventory pin mismatch");
const paths=run(["ls-tree","-r","--name-only","HEAD","--"]).split("\n").filter(Boolean),set=new Set(paths);
const rootExists=p=>set.has(p)||paths.some(x=>x.startsWith(p.replace(/\/$/,"")+"/"));
const failures=[];
for(const c of inv.capabilities||[]){
 if(!c.id||!Array.isArray(c.class)||!c.roots?.length) failures.push({id:c.id||null,kind:"invalid-capability"});
 for(const r of c.roots||[]) if(!rootExists(r)) failures.push({id:c.id,root:r,kind:"missing-root"});
}
const ids=(inv.capabilities||[]).map(x=>x.id),dups=ids.filter((x,i)=>ids.indexOf(x)!==i);
if(dups.length)failures.push({kind:"duplicate-capability-id",ids:[...new Set(dups)]});
console.log(JSON.stringify({schema_version:1,pass:!failures.length,source_commit:commit,source_tree:tree,capability_count:ids.length,failures},null,2));
if(failures.length)process.exitCode=2;
