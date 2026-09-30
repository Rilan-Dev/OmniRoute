#!/usr/bin/env node
/**
 * Phase 1 deterministic closure scanner.
 * Run from the pinned OmniRoute checkout.
 * It never mutates source and fails closed on unresolved first-party imports.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const ROOT = path.resolve(process.argv[2]||".");
const SOURCE_ROOTS = ["src","open-sse","@omniroute","packages","bin","scripts","config"];
const EXTS = [".ts",".tsx",".js",".jsx",".mjs",".cjs",".json"];
const IGNORE = new Set(["node_modules",".git",".next","dist","build","coverage"]);

function walk(dir, out=[]) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir,{withFileTypes:true})) {
    if (IGNORE.has(ent.name)) continue;
    const p=path.join(dir,ent.name);
    if (ent.isDirectory()) walk(p,out);
    else out.push(p);
  }
  return out;
}
const files=walk(ROOT).filter(p=>EXTS.includes(path.extname(p)));
const rel=p=>path.relative(ROOT,p).replaceAll(path.sep,"/");
const fileSet=new Set(files.map(rel));
const sourceFiles=files.filter(p=>SOURCE_ROOTS.some(r=>rel(p)===r||rel(p).startsWith(r+"/")));

function resolveImport(from,spec) {
  if (!spec.startsWith(".") && !spec.startsWith("@/")) return {kind:"external",spec};
  const basePath=spec.startsWith("@/") ? path.join(ROOT,"src",spec.slice(2)) : path.resolve(path.dirname(from),spec);
  const candidates=[basePath];
  for (const e of EXTS) candidates.push(basePath.endsWith(e)?basePath:basePath+e);
  const runtimeExt=path.extname(basePath);
  if ([".js",".jsx",".mjs",".cjs"].includes(runtimeExt)) {
    const stem=basePath.slice(0,-runtimeExt.length);
    for (const e of [".ts",".tsx",".js",".jsx",".mjs",".cjs"]) candidates.push(stem+e);
  }
  for (const e of EXTS) candidates.push(path.join(basePath,"index"+e));
  for (const c of candidates) if (fs.existsSync(c) && fs.statSync(c).isFile()) return {kind:"first-party",path:rel(c)};
  return {kind:"unresolved",spec};
}

function collectLiteralImports(text) {
  const out=[];
  const n=text.length;
  const isIdStart=c=>/[A-Za-z_$]/.test(c||"");
  const isIdChar=c=>/[A-Za-z0-9_$]/.test(c||"");
  const skipSpaceAndComments=i=>{
    while(i<n){
      while(i<n && /\s/.test(text[i])) i++;
      if(text.startsWith("//",i)){const e=text.indexOf("\n",i+2);i=e<0?n:e+1;continue}
      if(text.startsWith("/*",i)){const e=text.indexOf("*/",i+2);i=e<0?n:e+2;continue}
      break;
    }
    return i;
  };
  const readQuoted=i=>{
    const q=text[i]; if(q!=="'"&&q!=="\"") return null;
    let s="",j=i+1;
    while(j<n){
      const c=text[j];
      if(c==="\\"){if(j+1<n){s+=text[j+1];j+=2;continue}j++;continue}
      if(c===q)return {value:s,next:j+1};
      s+=c;j++;
    }
    return null;
  };
  const readImportTarget=i=>{
    i=skipSpaceAndComments(i);
    if(text[i]==="("){i=skipSpaceAndComments(i+1);const q=readQuoted(i);return q?{value:q.value,next:q.next}:null}
    const q=readQuoted(i); if(q)return q;
    let j=i,depth=0;
    while(j<n){
      if(text.startsWith("//",j)){const e=text.indexOf("\n",j+2);j=e<0?n:e+1;continue}
      if(text.startsWith("/*",j)){const e=text.indexOf("*/",j+2);j=e<0?n:e+2;continue}
      const ch=text[j];
      if(ch==="'"||ch==="\""){const qv=readQuoted(j);if(!qv)return null;j=qv.next;continue}
      if(ch==="("||ch==="["||ch==="{")depth++;
      else if(ch===")"||ch==="]"||ch==="}")depth=Math.max(0,depth-1);
      if(depth===0 && text.slice(j,j+4)==="from" && !isIdChar(text[j-1])&&!isIdChar(text[j+4])){
        const qv=readQuoted(skipSpaceAndComments(j+4));return qv||null;
      }
      if(depth===0 && ch===";")break;
      j++;
    }
    return null;
  };
  let i=0,lastSig="",lastWord="";
  while(i<n){
    const c=text[i];
    if(c==="'"||c==="""){const q=readQuoted(i);i=q?q.next:i+1;continue}
    if(c==="\x60"){let j=i+1;while(j<n){if(text[j]==="\\"){j+=2;continue}if(text[j]==="\x60"){j++;break}j++}i=j;continue}
    if(text.startsWith("//",i)){const e=text.indexOf("\n",i+2);i=e<0?n:e+1;continue}
    if(text.startsWith("/*",i)){const e=text.indexOf("*/",i+2);i=e<0?n:e+2;continue}
    if(c==="/" && text[i+1]!=="/" && text[i+1]!=="*" && (["","(","[","{","=",":",",",";","!","?","&","|","+","-","*","%","^","~"].includes(lastSig)||["return","throw","case","yield","await","else","do"].includes(lastWord))){
      let j=i+1,inClass=false;
      while(j<n){
        if(text[j]==="\\"){j+=2;continue}
        if(text[j]==="[")inClass=true;
        else if(text[j]==="]")inClass=false;
        else if(text[j]==="/"&&!inClass){j++;while(j<n&&/[A-Za-z]/.test(text[j]))j++;break}
        j++;
      }
      i=j;lastSig="/";lastWord="";continue;
    }
    if(isIdStart(c)){
      let j=i+1;while(j<n&&isIdChar(text[j]))j++;
      const word=text.slice(i,j);
      if(word==="import"||word==="export"||word==="require"){
        const target=readImportTarget(j);
        if(target)out.push(target.value);
      }
      i=j;lastSig="a";lastWord=word;continue;
    }
    if(!/\s/.test(c))lastSig=c;
    i++;
  }
  return out;
}
const edges=[], unresolved=[];
for (const file of sourceFiles) {
  const text=fs.readFileSync(file,"utf8");
  for (const spec of collectLiteralImports(text)) {
    const r=resolveImport(file,spec);
    edges.push({from:rel(file),to:r.path??r.spec,kind:r.kind});
    if (r.kind==="unresolved") unresolved.push({from:rel(file),spec});
  }
}
const envRefs=new Set();
for (const file of files) {
  const t=fs.readFileSync(file,"utf8");
  for (const m of t.matchAll(/(?:process\.env\.)([A-Z][A-Z0-9_]+)/g)) envRefs.add(m[1]);
}
const packageFiles=files.filter(p=>path.basename(p)==="package.json").map(rel);
const routes=files.filter(p=>rel(p).startsWith("src/app/api/")).map(rel);
const dashboard=files.filter(p=>rel(p).startsWith("src/app/(dashboard)/dashboard/")).map(rel);
const hash= s=>createHash("sha256").update(s).digest("hex");

const result={
 schema_version:2,
 root:ROOT,
 source_roots:SOURCE_ROOTS,
 scanned_files:files.length,
 source_files:sourceFiles.length,
 package_manifests:packageFiles,
 api_route_files:routes.length,
 dashboard_files:dashboard.length,
 edges,
 unresolved,
 environment_references:[...envRefs].sort(),
 source_file_sha256:Object.fromEntries(sourceFiles.map(p=>[rel(p),hash(fs.readFileSync(p))]))
};
const out=path.resolve(process.argv[3]??"phase1-closure-report.json");
fs.writeFileSync(out,JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify({scanned_files:files.length,source_files:sourceFiles.length,edges:edges.length,unresolved:unresolved.length,unresolved_sample:unresolved.slice(0,30),output:out},null,2));
if (unresolved.length) process.exitCode=2;
