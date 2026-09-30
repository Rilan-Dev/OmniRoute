#!/usr/bin/env node
/**
 * Phase 1 supplemental closure analyzer.
 * Read-only. Designed for the exact pinned OmniRoute checkout.
 * It detects closure edges a basic import resolver cannot prove.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.argv[2]||".");
const SOURCE_ROOTS = ["src","open-sse","@omniroute","packages","bin","scripts","config"];
const CODE_EXTS = new Set([".ts",".tsx",".js",".jsx",".mjs",".cjs",".json"]);
const IGNORE = new Set(["node_modules",".git",".next","dist","build","coverage"]);
const rel = p => path.relative(ROOT,p).replaceAll(path.sep,"/");

function walk(dir, out=[]) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir,{withFileTypes:true})) {
    if (IGNORE.has(ent.name)) continue;
    const p=path.join(dir,ent.name);
    if (ent.isDirectory()) walk(p,out); else out.push(p);
  }
  return out;
}
const all=walk(ROOT);
const code=all.filter(p=>CODE_EXTS.has(path.extname(p)));
const source=code.filter(p=>SOURCE_ROOTS.some(r=>rel(p)===r||rel(p).startsWith(r+"/")));
const read=p=>fs.readFileSync(p,"utf8");

const blockers=[], dynamic=[], runtimeFs=[], dbRefs=[], migrations=[], ui=[], tests=[], packages=[];
const env=new Map();
function add(map,key,value) {
  if (!map.has(key)) map.set(key,[]);
  map.get(key).push(value);
}

for (const file of source) {
  const r=rel(file);
  let t;
  try { t=read(file); } catch { continue; }

  for (const m of t.matchAll(/\bimport\s*\(([^)]*)\)/g)) {
    const expr=m[1].trim();
    const literal=/^["'][^"']+["']$/.test(expr);
    dynamic.push({file:r,expression:expr,literal});
    if (!literal) blockers.push({kind:"dynamic-import",file:r,detail:expr});
  }
  for (const m of t.matchAll(/\brequire\s*\(([^)]*)\)/g)) {
    const expr=m[1].trim();
    if (!/^["'][^"']+["']$/.test(expr)) {
      dynamic.push({file:r,expression:expr,literal:false,kind:"require"});
      blockers.push({kind:"dynamic-require",file:r,detail:expr});
    }
  }

  const fsPatterns=[
    /(?:readdir|readdirSync|glob|globSync|fastGlob)\s*\(/g,
    /(?:readFile|readFileSync)\s*\(/g,
    /(?:existsSync|statSync|accessSync)\s*\(/g,
    /(?:createRequire|require\.resolve)\s*\(/g,
    /(?:path\.(?:join|resolve|dirname|basename))\s*\(/g
  ];
  for (const re of fsPatterns) {
    if (re.test(t)) runtimeFs.push({file:r,pattern:re.source});
    re.lastIndex=0;
  }

  for (const m of t.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) add(env,m[1],r);

  if (r.startsWith("src/lib/db/")) {
    const sql=/\b(?:FROM|JOIN|INTO|UPDATE|TABLE|REFERENCES|DELETE\s+FROM)\s+["']?([A-Za-z_][A-Za-z0-9_]*)/gi;
    for (const m of t.matchAll(sql)) dbRefs.push({file:r,table:m[1]});
    if (/migrations?|CREATE\s+TABLE|ALTER\s+TABLE/i.test(t)) migrations.push(r);
  }

  if (r.startsWith("src/app/(dashboard)/dashboard/")) {
    const signals=[];
    if (/useState|useReducer|zustand|jotai|redux|store/i.test(t)) signals.push("state");
    if (/loading|isLoading|pending|skeleton/i.test(t)) signals.push("loading");
    if (/empty|no results|no data|not found/i.test(t)) signals.push("empty");
    if (/error|failed|catch\s*\(/i.test(t)) signals.push("error");
    if (/disabled|aria-disabled|isDisabled/i.test(t)) signals.push("disabled");
    if (/success|saved|completed/i.test(t)) signals.push("success");
    if (/permission|authorize|forbidden|role|can[A-Z]|hasPermission/i.test(t)) signals.push("permission");
    if (signals.length) ui.push({file:r,signals:[...new Set(signals)]});
  }

  if (/^tests\//.test(r) || /(?:^|\/)__tests__(?:\/|$)/.test(r) || /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(r)) {
    const imports=[];
    for (const m of t.matchAll(/(?:from\s+|import\s*\(\s*|require\s*\(\s*)["']([^"']+)["']/g)) imports.push(m[1]);
    tests.push({file:r,imports:[...new Set(imports)]});
  }
}

for (const p of all.filter(p=>path.basename(p)==="package.json")) {
  try {
    const j=JSON.parse(read(p));
    packages.push({
      file:rel(p),name:j.name??null,version:j.version??null,workspace:j.workspaces??null,
      dependencies:j.dependencies??{},devDependencies:j.devDependencies??{},
      peerDependencies:j.peerDependencies??{},optionalDependencies:j.optionalDependencies??{}
    });
  } catch { blockers.push({kind:"invalid-package-json",file:rel(p)}); }
}

const packageByName=new Map(packages.filter(p=>p.name).map(p=>[p.name,p]));
for (const p of packages) {
  for (const [section,deps] of Object.entries({
    dependencies:p.dependencies,devDependencies:p.devDependencies,
    peerDependencies:p.peerDependencies,optionalDependencies:p.optionalDependencies
  })) for (const [name,version] of Object.entries(deps??{})) {
    if (String(version).startsWith("workspace:") && !packageByName.has(name))
      blockers.push({kind:"unresolved-workspace-package",file:p.file,dependency:name,section});
  }
}

if (dbRefs.length && !migrations.length)
  for (const x of dbRefs) blockers.push({kind:"db-migration-mapping-missing",module:x.file,table:x.table});

const result={
  schema_version:3,
  pinned_source_required:"453918ab64f147604576e72d33e2bbfc12b2d1af",
  scanned_files:all.length,source_files:source.length,
  dynamic_imports:dynamic,
  runtime_filesystem_signals:[...new Map(runtimeFs.map(x=>[JSON.stringify(x),x])).values()],
  environment_references:Object.fromEntries([...env.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>[k,[...new Set(v)].sort()])),
  database:{references:dbRefs,migration_files:[...new Set(migrations)].sort()},
  dashboard:{state_signals:ui},tests,packages,blockers
};
const out=path.resolve(process.argv[3]??"phase1-supplemental-closure.json");
fs.writeFileSync(out,JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify({
  scanned_files:result.scanned_files,source_files:result.source_files,
  dynamic_imports:dynamic.length,runtime_filesystem_signals:result.runtime_filesystem_signals.length,
  db_references:dbRefs.length,dashboard_files:ui.length,tests:tests.length,
  packages:packages.length,blockers:blockers.length,output:out
},null,2));
if (blockers.length) process.exitCode=2;
