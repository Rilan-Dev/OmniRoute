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
  for (const e of EXTS) candidates.push(path.join(basePath,"index"+e));
  for (const c of candidates) if (fs.existsSync(c) && fs.statSync(c).isFile()) return {kind:"first-party",path:rel(c)};
  return {kind:"unresolved",spec};
}

const edges=[], unresolved=[];
const importRE=/(?:import\s+(?:[^'"]+?\s+from\s+)?|export\s+[^'"]*?\s+from\s+|require\s*\(\s*|import\s*\(\s*)(['"])([^'"]+)\1/g;
for (const file of sourceFiles) {
  const text=fs.readFileSync(file,"utf8");
  for (const m of text.matchAll(importRE)) {
    const spec=m[2], r=resolveImport(file,spec);
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
