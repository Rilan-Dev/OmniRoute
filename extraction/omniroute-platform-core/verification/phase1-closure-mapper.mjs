#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root=path.resolve(process.argv[2]||".");
const out=path.resolve(process.argv[3]||"extraction/omniroute-platform-core/verification/phase1-closure-map.json");
const PIN="453918ab64f147604576e72d33e2bbfc12b2d1af";
const blockers=[], warnings=[];
const git=(args)=>{const x=spawnSync("git",args,{cwd:root,encoding:"utf8"});return x.status===0?x.stdout.trim():null};
const actualCommit=git(["rev-parse","HEAD"]); const actualTree=git(["rev-parse","HEAD^{tree}"]);
if(actualCommit!==PIN) blockers.push({kind:"wrong-checkout-commit",actual:actualCommit,expected:PIN});
if(actualTree && actualTree!=="76f3546d48a7293b199b7571d13808bebadb6d1f") blockers.push({kind:"wrong-checkout-tree",actual:actualTree,expected:"76f3546d48a7293b199b7571d13808bebadb6d1f"});
const abs=p=>path.join(root,p);
const exists=p=>fs.existsSync(abs(p));
if(!exists("src")||!exists("open-sse")||!exists("package.json"))
  blockers.push({kind:"incomplete-checkout",detail:"src/open-sse/package.json must exist"});

function walk(rel){
  const dir=abs(rel); if(!fs.existsSync(dir)) return [];
  const out=[];
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(["node_modules",".git",".next","dist","build","coverage"].includes(ent.name)) continue;
    const p=path.join(rel,ent.name);
    if(ent.isDirectory()) out.push(...walk(p)); else out.push(p);
  }
  return out;
}
const all=walk(".");
const textFiles=all.filter(p=>/\.(ts|tsx|js|jsx|mjs|cjs|json|sql|md)$/i.test(p));
const rels=new Set(all.map(p=>p.replaceAll(path.sep,"/")));
const read=p=>{try{return fs.readFileSync(abs(p),"utf8")}catch{return ""}};
const norm=p=>p.replaceAll(path.sep,"/");
function resolveInternal(from,spec){
  if(!spec.startsWith(".")&&!spec.startsWith("@/")) return null;
  let base=spec.startsWith("@/")?path.join("src",spec.slice(2)):path.join(path.dirname(from),spec);
  base=norm(path.normalize(base));
  const candidates=[base,base+".ts",base+".tsx",base+".js",base+".jsx",base+".mjs",base+".cjs",base+".json",
    path.join(base,"index.ts"),path.join(base,"index.tsx"),path.join(base,"index.js"),path.join(base,"index.jsx")];
  return candidates.map(norm).find(x=>rels.has(x))||null;
}
const imports=[], unresolved=[];
for(const f of textFiles.filter(x=>/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(x))){
  const s=read(f), re=/(?:import\s+(?:[^'"]+?\s+from\s+)?|export\s+(?:[^'"]+?\s+from\s+)?|require\s*\(|import\s*\()(['"])(.*?)\1/g;
  let m; while((m=re.exec(s))){
    const spec=m[2], target=resolveInternal(f,spec);
    if(target) imports.push({from:f,spec,target,dynamic:/import\s*\(/.test(m[0])});
    else if(spec.startsWith(".")||spec.startsWith("@/")) unresolved.push({from:f,spec});
  }
}
const dynamic=[], runtimeFilesystem=[];
for(const f of textFiles.filter(x=>/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(x))){
  const s=read(f);
  if(/\b(?:import|require)\s*\(\s*[^'"]/.test(s)) dynamic.push({file:f,kind:"non-literal-import-or-require"});
  const hits=s.match(/(?:readdir(?:Sync)?|readFile(?:Sync)?|glob(?:Sync)?|fast-glob|opendir(?:Sync)?|createRequire\s*\()/g);
  if(hits) runtimeFilesystem.push({file:f,signals:[...new Set(hits)]});
}
if(dynamic.length) blockers.push({kind:"non-literal-dynamic-loaders",count:dynamic.length});
if(unresolved.length) blockers.push({kind:"unresolved-first-party-imports",count:unresolved.length});

const env=[];
for(const f of textFiles){const s=read(f),re=/process\.env\.([A-Z0-9_]+)/g;let m;while((m=re.exec(s)))env.push({file:f,name:m[1]});}

const dbModules=[], migrations=[], schemaTables=new Map();
for(const f of textFiles){
  const s=read(f);
  if(f.startsWith("src/lib/db/")){
    const tables=new Set();
    for(const m of s.matchAll(/\b(?:FROM|JOIN|UPDATE|INTO|DELETE\s+FROM|CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?|ALTER\s+TABLE)\s+["']?([A-Za-z0-9_.$-]+)/gi)) tables.add(m[1]);
    if(tables.size) dbModules.push({module:f,tables:[...tables]});
  }
  if(/(^|\/)migrations?(\/|$)/i.test(f)) migrations.push(f);
}
for(const f of migrations) for(const m of read(f).matchAll(/\b(?:CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?|ALTER\s+TABLE)\s+["']?([A-Za-z0-9_.$-]+)/gi)){
  const t=m[1];
  if(!schemaTables.has(t)) schemaTables.set(t,[]);
  schemaTables.get(t).push(f);
}
const unknownDb=dbModules.flatMap(x=>x.tables.filter(t=>!schemaTables.has(t)).map(t=>({module:x.module,table:t})));
if(unknownDb.length) blockers.push({kind:"db-table-not-found-in-migrations",count:unknownDb.length});
if(!migrations.length) warnings.push({kind:"no-migration-directory-detected"});

const dashboard=all.filter(f=>f.startsWith("src/app/(dashboard)/dashboard/")&&/\.(tsx|ts|jsx|js)$/.test(f));
const dashboardMap=dashboard.map(f=>{
  const s=read(f);
  const direct=imports.filter(x=>x.from===f).map(x=>x.target).filter(Boolean);
  const components=direct.filter(x=>/\.(?:tsx|jsx)$/.test(x));
  const hooks=direct.filter(x=>/(?:^|\/)(?:use[A-Z]|hooks?)(?:[^/]*)(?:\.ts|\.tsx|\.js|\.jsx)$/.test(x));
  const stores=direct.filter(x=>/(?:store|stores|state|zustand|redux)/i.test(x));
  const dialogs=direct.filter(x=>/(?:dialog|modal|drawer|sheet)/i.test(x));
  const stateRules={
    loading:/\b(?:loading|isLoading|pending|skeleton)\b/i,
    empty:/\b(?:empty|no\s+(?:data|results|items)|nothing\s+found)\b/i,
    error:/\b(?:error|failed|failure)\b/i,
    disabled:/\bdisabled\b/i,
    success:/\b(?:success|succeeded|completed)\b/i,
    permission:/\b(?:permission|forbidden|unauthorized|can[A-Z]|allowed)\b/i
  };
  return {routeFile:f,imports:direct,components,hooks,stores,dialogs,states:Object.keys(stateRules).filter(k=>stateRules[k].test(s))};
});

const tests=all.filter(f=>/(^|\/)(tests?|__tests__)(\/|$)|\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f))
  .map(f=>({file:f,imports:imports.filter(x=>x.from===f).map(x=>x.target).filter(Boolean)}));

const packageFiles=all.filter(f=>path.basename(f)==="package.json");
const packages=packageFiles.map(f=>{
  let j={};try{j=JSON.parse(read(f))}catch{blockers.push({kind:"invalid-package-json",file:f})}
  return {file:f,name:j.name||null,workspaces:j.workspaces||null,dependencies:j.dependencies||{},devDependencies:j.devDependencies||{},peerDependencies:j.peerDependencies||{},optionalDependencies:j.optionalDependencies||{}};
});
const workspaceRefs=[];
for(const p of packages) for(const sec of ["dependencies","devDependencies","peerDependencies","optionalDependencies"])
  for(const [name,version] of Object.entries(p[sec]||{}))
    if(String(version).startsWith("workspace:")) workspaceRefs.push({package:p.file,name,version});
const lockfiles=all.filter(f=>/^(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb)$/.test(path.basename(f)));

const boundaryPatterns=[
  ["network",/https?:\/\//i],["subprocess",/(child_process|execFile|spawnSync|execSync)/i],
  ["native",/(node-gyp|better-sqlite3|\.node\b|TPROXY)/i],["secrets",/(API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY|CLIENT_SECRET)/i]
];
const hostBoundaries=[];
for(const f of textFiles){const s=read(f),kinds=boundaryPatterns.filter(x=>x[1].test(s)).map(x=>x[0]);if(kinds.length)hostBoundaries.push({file:f,kinds:[...new Set(kinds)]});}

const report={schema_version:2,pinned_source_commit:PIN,actual_checkout:{commit:actualCommit,tree:actualTree},generated_at:"deterministic-run-required",
blockers,warnings,first_party_imports:{count:imports.length,unresolved},dynamic_loaders:dynamic,runtime_filesystem:runtimeFilesystem,
environment_references:env,database:{modules:dbModules,migrations,table_migration_history:Object.fromEntries(schemaTables),unknown_tables:unknownDb},dashboard:dashboardMap,tests,
packages:{manifests:packages,workspace_references:workspaceRefs,lockfiles},host_boundaries:hostBoundaries};
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({pass:blockers.length===0,blockers:blockers.length,output:out},null,2));
if(blockers.length)process.exitCode=2;
