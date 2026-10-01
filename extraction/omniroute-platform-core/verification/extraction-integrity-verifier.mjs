#!/usr/bin/env node
/** Read-only exact source snapshot verifier. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
const EXPECTED_COMMIT="453918ab64f147604576e72d33e2bbfc12b2d1af";
const EXPECTED_TREE="76f3546d48a7293b199b7571d13808bebadb6d1f";
const sourceRoot=path.resolve(process.argv[2]||".");
const extractedRoot=path.resolve(process.argv[3]||"extraction/omniroute-platform-core/omniroute-source");
const outPath=path.resolve(process.argv[4]||"extraction/omniroute-platform-core/verification/extraction-integrity-report.json");
const blockers=[];
const run=(cwd,args)=>{const r=spawnSync("git",args,{cwd,encoding:"utf8",maxBuffer:64*1024*1024});return r.status===0?r.stdout:null};
const commit=run(sourceRoot,["rev-parse","HEAD"])?.trim();
const tree=run(sourceRoot,["rev-parse","HEAD^{tree}"])?.trim();
if(commit!==EXPECTED_COMMIT) blockers.push({kind:"wrong-source-checkout",actual:commit,expected:EXPECTED_COMMIT});
if(tree!==EXPECTED_TREE) blockers.push({kind:"wrong-source-tree",actual:tree,expected:EXPECTED_TREE});
const raw=run(sourceRoot,["ls-tree","-r","-z","HEAD","--"]);
const source=new Map();
if(!raw) blockers.push({kind:"source-tree-unreadable"});
else for(const item of raw.split("\0")){if(!item)continue;const i=item.indexOf("\t");if(i<0){blockers.push({kind:"malformed-tree-entry"});continue}const m=item.slice(0,i).split(/\s+/),p=item.slice(i+1);if(m.length<3){blockers.push({kind:"malformed-tree-metadata",path:p});continue}source.set(p,{mode:m[0],type:m[1],sha:m[2]});}
function walk(rel="."){const dir=path.join(extractedRoot,rel);if(!fs.existsSync(dir))return [];const out=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(rel,e.name);e.isDirectory()?out.push(...walk(p)):out.push(p.replaceAll(path.sep,"/"));}return out}
const files=fs.existsSync(extractedRoot)?walk():[];
if(!fs.existsSync(extractedRoot)) blockers.push({kind:"missing-extracted-root",path:extractedRoot});
const extra=files.filter(p=>!source.has(p)),missing=[...source.keys()].filter(p=>!files.includes(p)),modeMismatch=[],hashMismatch=[];
const blobSha=f=>{const b=fs.readFileSync(f);return crypto.createHash("sha1").update(Buffer.from("blob "+b.length+"\0")).update(b).digest("hex")};
for(const p of files){if(!source.has(p))continue;const e=source.get(p),a=path.join(extractedRoot,p),s=fs.lstatSync(a);const mode=s.isSymbolicLink()?"120000":((s.mode&0o111)?"100755":"100644");if(mode!==e.mode)modeMismatch.push({path:p,expected:e.mode,actual:mode});if(e.type!=="blob"){blockers.push({kind:"unsupported-source-entry-type",path:p,type:e.type});continue}let actual;if(s.isSymbolicLink()){const target=fs.readlinkSync(a);const b=Buffer.from(target);actual=crypto.createHash("sha1").update(Buffer.from("blob "+b.length+"\0")).update(b).digest("hex")}else actual=blobSha(a);if(actual!==e.sha)hashMismatch.push({path:p,expected:e.sha,actual})}
if(extra.length)blockers.push({kind:"extra-files",count:extra.length,paths:extra.slice(0,100)});
if(missing.length)blockers.push({kind:"missing-files",count:missing.length,paths:missing.slice(0,100)});
if(modeMismatch.length)blockers.push({kind:"mode-mismatch",count:modeMismatch.length,paths:modeMismatch.slice(0,100)});
if(hashMismatch.length)blockers.push({kind:"blob-hash-mismatch",count:hashMismatch.length,paths:hashMismatch.slice(0,100)});
const result={schema_version:1,expected_source_commit:EXPECTED_COMMIT,expected_source_tree:EXPECTED_TREE,actual_source_commit:commit,actual_source_tree:tree,source_entry_count:source.size,extracted_file_count:files.length,missing_count:missing.length,extra_count:extra.length,mode_mismatch_count:modeMismatch.length,hash_mismatch_count:hashMismatch.length,blockers,pass:blockers.length===0};
fs.mkdirSync(path.dirname(outPath),{recursive:true});fs.writeFileSync(outPath,JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify({pass:result.pass,blockers:blockers.length,source_entry_count:source.size,extracted_file_count:files.length,output:outPath},null,2));
if(blockers.length)process.exitCode=2;