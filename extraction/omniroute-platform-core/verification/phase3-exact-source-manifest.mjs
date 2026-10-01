#!/usr/bin/env node
/** Deterministic Phase 3 exact-source manifest generator. Read-only. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const EXPECTED_COMMIT="453918ab64f147604576e72d33e2bbfc12b2d1af";
const EXPECTED_TREE="76f3546d48a7293b199b7571d13808bebadb6d1f";
const sourceRoot=path.resolve(process.argv[2]||".");
const outPath=path.resolve(process.argv[3]||"extraction/omniroute-platform-core/verification/phase3-exact-source-manifest.json");
const run=(args)=>{const r=spawnSync("git",args,{cwd:sourceRoot,encoding:"utf8",maxBuffer:64*1024*1024});if(r.status!==0)throw new Error(r.stderr||"git command failed");return r.stdout};
const commit=run(["rev-parse","HEAD"]).trim(), tree=run(["rev-parse","HEAD^{tree}"]).trim();
if(commit!==EXPECTED_COMMIT||tree!==EXPECTED_TREE)throw new Error(`Pinned source mismatch: ${commit}/${tree}`);
const entries=[];
for(const item of run(["ls-tree","-r","-z","HEAD","--"]).split("\0")){
  if(!item)continue;
  const i=item.indexOf("\t"); if(i<0)throw new Error("Malformed tree entry");
  const meta=item.slice(0,i).split(/\s+/), file=item.slice(i+1);
  entries.push({path:file,mode:meta[0],type:meta[1],blob:meta[2]});
}
entries.sort((a,b)=>a.path.localeCompare(b.path));
const top=new Map(), extensions=new Map();
for(const e of entries){
  const root=e.path.split("/")[0]; top.set(root,(top.get(root)||0)+1);
  const base=path.basename(e.path), ext=path.extname(base).toLowerCase()||"[none]";
  extensions.set(ext,(extensions.get(ext)||0)+1);
}
const canonical=entries.map(e=>[e.path,e.mode,e.type,e.blob].join("\t")).join("\n")+"\n";
const manifest={
  schema_version:1,
  generated_by:"phase3-exact-source-manifest.mjs",
  source:{repository:"Rilan-Dev/OmniRoute",ref:"release/v3.8.52",commit,tree},
  entry_count:entries.length,
  manifest_sha256:crypto.createHash("sha256").update(canonical).digest("hex"),
  summary:{top_level_entries:Object.fromEntries([...top].sort()),extensions:Object.fromEntries([...extensions].sort())},
  entries
};
fs.mkdirSync(path.dirname(outPath),{recursive:true});
fs.writeFileSync(outPath,JSON.stringify(manifest,null,2)+"\n");
console.log(JSON.stringify({pass:true,commit,tree,entry_count:entries.length,manifest_sha256:manifest.manifest_sha256,output:outPath},null,2));
