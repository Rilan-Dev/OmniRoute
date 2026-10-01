#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root=path.resolve(process.argv[2]||".");
const out=path.resolve(process.argv[3]||"extraction/omniroute-platform-core/verification/phase1-closure-map.json");
const PIN="453918ab64f147604576e72d33e2bbfc12b2d1af", TREE="76f3546d48a7293b199b7571d13808bebadb6d1f";
const blockers=[], warnings=[];
const git=(args)=>{const x=spawnSync("git",args,{cwd:root,encoding:"utf8"});return x.status===0?x.stdout.trim():null};
const actualCommit=git(["rev-parse","HEAD"]), actualTree=git(["rev-parse","HEAD^{tree}"]);
if(actualCommit!==PIN) blockers.push({kind:"wrong-checkout-commit",actual:actualCommit,expected:PIN});
if(actualTree!==TREE) blockers.push({kind:"wrong-checkout-tree",actual:actualTree,expected:TREE});
const abs=p=>path.join(root,p), exists=p=>fs.existsSync(abs(p));
if(!exists("src")||!exists("open-sse")||!exists("package.json")) blockers.push({kind:"incomplete-checkout"});
function walk(rel){const dir=abs(rel);if(!fs.existsSync(dir))return[];const out=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(["node_modules",".git",".next","dist","coverage"].includes(e.name))continue;const p=path.join(rel,e.name);e.isDirectory()?out.push(...walk(p)):out.push(p)}return out}
const all=walk("."), rels=new Set(all.map(p=>p.replaceAll(path.sep,"/")));
const textFiles=all.filter(p=>/\.(ts|tsx|js|jsx|mjs|cjs|json|sql|md|yaml|yml)$/i.test(p)), codeFiles=textFiles.filter(p=>/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(p));
const read=p=>{try{return fs.readFileSync(abs(p),"utf8")}catch{return""}}, norm=p=>p.replaceAll(path.sep,"/");
const workspacePackages=new Map();
for(const pf of all.filter(f=>path.basename(f)==="package.json")){
  try { const pkg=JSON.parse(read(pf)); if(pkg?.name) workspacePackages.set(pkg.name,{root:norm(path.dirname(pf)),pkg}); } catch {}
}
function resolveInternal(from,spec){
  if(!spec.startsWith(".")&&!spec.startsWith("@/")&&!spec.startsWith("@omniroute/"))return null;
  let base;
  if(spec.startsWith("@/")) base=path.join("src",spec.slice(2));
  else if(spec==="@omniroute/open-sse"||spec.startsWith("@omniroute/open-sse/")) base=path.join("open-sse",spec.slice("@omniroute/open-sse".length).replace(/^\//,""));
  else if(spec==="@omniroute/browser-pool"||spec.startsWith("@omniroute/browser-pool/")) base=path.join("packages/browser-pool/src",spec.slice("@omniroute/browser-pool".length).replace(/^\//,""));
  else {
    const name=[...workspacePackages.keys()].find(name=>spec===name||spec.startsWith(`${name}/`));
    const workspace=name ? workspacePackages.get(name) : null;
    if(workspace){
      const subpath=name && spec.length>name.length ? spec.slice(name.length).replace(/^\//,"") : "";
      base=path.join(workspace.root,subpath || "src/index");
    } else base=path.join(path.dirname(from),spec);
  }
  base=norm(path.normalize(base));
  const extMap={".js":[".js",".ts",".tsx",".jsx",".mjs",".cjs"],".jsx":[".jsx",".tsx",".js"],".mjs":[".mjs",".ts",".js"],".cjs":[".cjs",".ts",".js"],".ts":[".ts",".tsx",".js"],".tsx":[".tsx",".ts",".js"]};
  const ext=path.extname(base),stem=ext?base.slice(0,-ext.length):base;
  const variants=ext&&extMap[ext]?extMap[ext].map(e=>stem+e):[];
  const c=[base,...variants,base+".ts",base+".tsx",base+".js",base+".jsx",base+".mjs",base+".cjs",base+".json",path.join(base,"index.ts"),path.join(base,"index.tsx"),path.join(base,"index.js"),path.join(base,"index.jsx")];
  return [...new Set(c.map(norm))].find(x=>rels.has(x))||null;
}
function collectLiteralImports(text){
  const out=[];
  const n=text.length;
  const isIdStart=c=>/[A-Za-z_$]/.test(c||"");
  const isIdChar=c=>/[A-Za-z0-9_$]/.test(c||"");
  const skipSpaceAndComments=i=>{while(i<n){while(i<n&&/\s/.test(text[i]))i++;if(text.startsWith("//",i)){const e=text.indexOf("\n",i+2);i=e<0?n:e+1;continue}if(text.startsWith("/*",i)){const e=text.indexOf("*/",i+2);i=e<0?n:e+2;continue}break}return i};
  const readQuoted=i=>{const q=text[i];if(q!=="'"&&q!=="\"")return null;let value="",j=i+1;while(j<n){const c=text[j];if(c==="\\"){if(j+1<n){value+=text[j+1];j+=2;continue}j++;continue}if(c===q)return{value,next:j+1};value+=c;j++}return null};
  const readImportTarget=i=>{i=skipSpaceAndComments(i);if(text[i]==="("){const q=readQuoted(skipSpaceAndComments(i+1));return q}const q=readQuoted(i);if(q)return q;let j=i,depth=0;while(j<n){if(text.startsWith("//",j)){const e=text.indexOf("\n",j+2);j=e<0?n:e+1;continue}if(text.startsWith("/*",j)){const e=text.indexOf("*/",j+2);j=e<0?n:e+2;continue}const ch=text[j];if(ch==="'"||ch==="\""){const qv=readQuoted(j);if(!qv)return null;j=qv.next;continue}if(ch==="("||ch==="["||ch==="{")depth++;else if(ch===")"||ch==="]"||ch==="}")depth=Math.max(0,depth-1);if(depth===0&&text.slice(j,j+4)==="from"&&!isIdChar(text[j-1])&&!isIdChar(text[j+4]))return readQuoted(skipSpaceAndComments(j+4));if(depth===0&&ch===";")break;j++}return null};
  let i=0;
  while(i<n){
    const c=text[i];
    if(c==="'"||c==="\""){const q=readQuoted(i);i=q?q.next:i+1;continue}
    if(c==="\x60"){let j=i+1;while(j<n){if(text[j]==="\\"){j+=2;continue}if(text[j]==="\x60"){j++;break}j++}i=j;continue}
    if(text.startsWith("//",i)){const e=text.indexOf("\n",i+2);i=e<0?n:e+1;continue}
    if(text.startsWith("/*",i)){const e=text.indexOf("*/",i+2);i=e<0?n:e+2;continue}
    if(isIdStart(c)){let j=i+1;while(j<n&&isIdChar(text[j]))j++;const word=text.slice(i,j);if(word==="import"||word==="export"||word==="require"){const target=readImportTarget(j);if(target)out.push({spec:target.value,dynamic:word==="require"||text[j]=== "("})}i=j;continue}
    i++;
  }
  return out;
}
const imports=[], unresolved=[], generatedRuntimeReferences=[];
for(const f of codeFiles){
  for(const item of collectLiteralImports(read(f))){
    const spec=item.spec;const resolutionSpec=/^[.#]?(?:[^?#]*)(?:[?#].*)?$/.test(spec)&&/^(?:\.|@\/|@omniroute\/)/.test(spec)?spec.replace(/[?#].*$/,""):spec;const runtimeRootRelative=f==="scripts/check/check-docs-counts-sync.mjs"&&resolutionSpec.startsWith("./");const target=runtimeRootRelative?resolveInternal("root",resolutionSpec):resolveInternal(f,resolutionSpec);
    if(target) imports.push({from:f,spec,target,dynamic:item.dynamic});
    else if(spec.startsWith(".")||spec.startsWith("@/")||spec.startsWith("@omniroute/")){
      const candidate=norm(path.normalize(runtimeRootRelative?resolutionSpec.slice(2):path.join(path.dirname(f),resolutionSpec)));
      if(/(?:^|\/)dist\//.test(resolutionSpec)||candidate==="dist"||candidate.startsWith("dist/")||candidate===".next"||candidate.startsWith(".next/")||candidate===".build"||candidate.startsWith(".build/")||candidate.startsWith(".source/")||candidate.startsWith("obsidian-plugin/")||(f==="scripts/dev/standalone-server-ws.mjs"&&resolutionSpec==="./server.js"))
        generatedRuntimeReferences.push({from:f,spec,candidate});
      else if(f==="scripts/build/prepublish.ts"&&spec==="./http-method-guard.cjs")
        generatedRuntimeReferences.push({from:f,spec,candidate});
      else unresolved.push({from:f,spec});
    }
  }
}
const dynamic=[],runtimeFilesystem=[];
for(const f of codeFiles){const s=read(f);if(/\b(?:import|require)\s*\(\s*[^'"]/.test(s))dynamic.push({file:f,kind:"non-literal-import-or-require"});const h=s.match(/(?:readdir(?:Sync)?|readFile(?:Sync)?|glob(?:Sync)?|fast-glob|opendir(?:Sync)?|createRequire\s*\()/g);if(h)runtimeFilesystem.push({file:f,signals:[...new Set(h)]})}
if(dynamic.length)warnings.push({kind:"non-literal-dynamic-loaders",count:dynamic.length,sample:dynamic.slice(0,12)});if(generatedRuntimeReferences.length)warnings.push({kind:"generated-runtime-references",count:generatedRuntimeReferences.length,sample:generatedRuntimeReferences.slice(0,12)});if(unresolved.length)blockers.push({kind:"unresolved-first-party-imports",count:unresolved.length,sample:unresolved.slice(0,12)});
const env=[];for(const f of textFiles){const s=read(f),re=/process\.env\.([A-Z0-9_]+)/g;let m;while((m=re.exec(s)))env.push({file:f,name:m[1]})}

/* DB schema evidence: modules, columns, indexes, foreign keys and create/alter/drop history. */
const dbModules=[],migrations=[],migrationOps=[],schema=new Map(),migrationFiles=all.filter(f=>/(^|\/)migrations?(\/|$)/i.test(f)&&/\.(sql|ts|tsx|js|mjs|cjs)$/.test(f));
const add=(table,op,file,detail)=>{if(!schema.has(table))schema.set(table,[]);schema.get(table).push({op,file,...detail});migrationOps.push({table,op,file,...detail})};
for(const f of migrationFiles){const s=read(f);migrations.push(f);
 for(const m of s.matchAll(/\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["']?([A-Za-z0-9_.$-]+)["']?\s*\(([^;]*?)\)\s*;?/gis)){const body=m[2];add(m[1],"create-table",f,{columns:[...body.matchAll(/(?:^|,)\s*["']?([A-Za-z_][A-Za-z0-9_]*)["']?\s+([A-Za-z][A-Za-z0-9_() ,.-]*)/g)].map(x=>x[1]).filter(x=>!["PRIMARY","UNIQUE","CONSTRAINT","FOREIGN","CHECK"].includes(x.toUpperCase())),indexes:[...body.matchAll(/(?:UNIQUE\s+)?(?:INDEX|KEY)\s+["']?([A-Za-z0-9_-]+)/gi)].map(x=>x[1]),foreign_keys:[...body.matchAll(/FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+["']?([A-Za-z0-9_.$-]+)["']?\s*\(([^)]+)\)/gi)].map(x=>({columns:x[1].split(",").map(v=>v.trim()),references_table:x[2],references_columns:x[3].split(",").map(v=>v.trim())}))})}
 for(const m of s.matchAll(/\bALTER\s+TABLE\s+["']?([A-Za-z0-9_.$-]+)["']?\s+([\s\S]*?);/gi)){const body=m[2],columns=[...body.matchAll(/\b(?:ADD|ALTER)\s+(?:COLUMN\s+)?["']?([A-Za-z_][A-Za-z0-9_]*)["']?/gi)].map(x=>x[1]),drops=[...body.matchAll(/\bDROP\s+(?:COLUMN|CONSTRAINT|INDEX)\s+["']?([A-Za-z0-9_-]+)/gi)].map(x=>x[1]),fk=[...body.matchAll(/FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+["']?([A-Za-z0-9_.$-]+)["']?\s*\(([^)]+)\)/gi)].map(x=>({columns:x[1].split(",").map(v=>v.trim()),references_table:x[2],references_columns:x[3].split(",").map(v=>v.trim())}));add(m[1],"alter-table",f,{columns,drop:drops,foreign_keys:fk})}
 for(const m of s.matchAll(/\b(?:CREATE\s+UNIQUE\s+)?INDEX\s+["']?([A-Za-z0-9_-]+)["']?\s+ON\s+["']?([A-Za-z0-9_.$-]+)["']?\s*\(([^)]+)\)/gi))add(m[2],"create-index",f,{index:m[1],columns:m[3].split(",").map(v=>v.trim())});
 for(const m of s.matchAll(/\bDROP\s+(?:TABLE|INDEX)\s+["']?([A-Za-z0-9_.$-]+)["']?/gi))add(m[1],"drop-object",f,{})}
function stripJsComments(s){let o="",i=0,state="code",quote="";while(i<s.length){const ch=s[i],nx=s[i+1];if(state==="code"&&(ch==='"'||ch==="'"||ch==="`")){state="string";quote=ch;o+=ch;i++;continue}if(state==="string"){o+=ch;if(ch==="\\"){o+=s[i+1]||"";i+=2;continue}if(ch===quote)state="code";i++;continue}if(state==="code"&&ch==="/"&&nx==="/"){state="line";o+="  ";i+=2;continue}if(state==="code"&&ch==="/"&&nx==="*"){state="block";o+="  ";i+=2;continue}if(state==="line"){if(ch==="\n"){state="code";o+="\n"}else o+=" ";i++;continue}if(state==="block"){if(ch==="*"&&nx==="/"){state="code";o+="  ";i+=2;continue}o+=ch==="\n"?"\n":" ";i++;continue}o+=ch;i++}return o} 
function extractSqlStrings(s){const out=[];let i=0;while(i<s.length){const q=s[i];if(q==="\""||q==="'"||q==="\`"){let j=i+1,b="";while(j<s.length){if(s[j]==="\\"){b+=s[j]+(s[j+1]||"");j+=2;continue}if(s[j]===q){out.push(b);i=j+1;break}b+=s[j];j++}if(j>=s.length)i=j;continue}i++}return out}
const SQL_CLAUSE_WORDS=new Set(["SET","WHERE","VALUES","SELECT","RETURNING","FROM","JOIN","ON","GROUP","ORDER","LIMIT","OFFSET","UNION","EXCEPT","INTERSECT"]);
for(const f of codeFiles.filter(f=>f.startsWith("src/lib/db/"))){const s=stripJsComments(read(f)),sqlParts=extractSqlStrings(s),tables=new Set(),columns=new Map();for(const sql of sqlParts){if(!/^\s*(?:SELECT|WITH|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE)\b/i.test(sql))continue;for(const m of sql.matchAll(/\b(?:FROM|JOIN|UPDATE|INTO|DELETE\s+FROM|CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?|ALTER\s+TABLE)\s+["']?([A-Za-z0-9_.$-]+)/gi)){const table=m[1];if(!SQL_CLAUSE_WORDS.has(table.toUpperCase()))tables.add(table)}}for(const m of s.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*\.\s*([A-Za-z_][A-Za-z0-9_]*)\b/g)){if(!columns.has(m[1]))columns.set(m[1],new Set());columns.get(m[1]).add(m[2])}if(tables.size)dbModules.push({module:f,tables:[...tables],qualified_column_usage:Object.fromEntries([...columns].map(([k,v])=>[k,[...v]]))})}
const runtimeSchemaEvidence=[];for(const module of dbModules){const raw=stripJsComments(read(module.module));for(const sql of extractSqlStrings(raw)){for(const m of sql.matchAll(/\bCREATE\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?["']?([A-Za-z_][A-Za-z0-9_.$-]*)["']?/gi)){runtimeSchemaEvidence.push({module:module.module,table:m[1],kind:"runtime-create-table"});}}}
const runtimeTables=new Set(runtimeSchemaEvidence.map(x=>x.table));
const ignoredSqliteTables=new Set(["sqlite_master","sqlite_temp_master","sqlite_sequence"]);
const unknownDb=dbModules.flatMap(x=>x.tables.filter(t=>!schema.has(t)&&!runtimeTables.has(t)&&!ignoredSqliteTables.has(t)&&t!=="$").map(t=>({module:x.module,table:t})));if(unknownDb.length)blockers.push({kind:"db-table-not-found-in-migrations",count:unknownDb.length,sample:unknownDb.slice(0,12)});

/* Recursive dashboard dependency/state evidence. */
const dashboard=all.filter(f=>f.startsWith("src/app/(dashboard)/dashboard/")&&/\.(tsx|ts|jsx|js)$/.test(f)),importMap=new Map();for(const i of imports){if(!importMap.has(i.from))importMap.set(i.from,[]);importMap.get(i.from).push(i.target)}
const stateRules={loading:/\b(?:loading|isLoading|pending|skeleton|spinner)\b/i,empty:/\b(?:empty|no\s+(?:data|results|items)|nothing\s+found)\b/i,error:/\b(?:error|failed|failure|retry)\b/i,disabled:/\bdisabled\b/i,success:/\b(?:success|succeeded|completed|saved|created|updated)\b/i,permission:/\b(?:permission|forbidden|unauthorized|can[A-Z]|allowed|role|access)\b/i,destructive:/\b(?:delete|remove|destroy|revoke|reset|discard|danger|destructive|confirm)\b/i};
function kind(p){const b=path.basename(p);return /\.(tsx|jsx)$/.test(p)?"component":/(?:^|\/)(?:use[A-Z]|hooks?)/.test(p)?"hook":/(?:store|stores|zustand|redux|state)/i.test(p)?"store":/(?:dialog|modal|drawer|sheet)/i.test(p)?"dialog":/(?:layout|page)/i.test(b)?"route-support":"module"}
const dashboardMap=dashboard.map(route=>{const seen=new Set(),q=[route],c=[];while(q.length){const f=q.shift();if(!f||seen.has(f))continue;seen.add(f);const s=read(f);c.push({file:f,kind:kind(f),states:Object.keys(stateRules).filter(k=>stateRules[k].test(s))});for(const t of importMap.get(f)||[])q.push(t)}return{routeFile:route,dependency_closure:c.map(x=>x.file),dependency_kinds:{components:c.filter(x=>x.kind==="component").map(x=>x.file),hooks:c.filter(x=>x.kind==="hook").map(x=>x.file),stores:c.filter(x=>x.kind==="store").map(x=>x.file),dialogs:c.filter(x=>x.kind==="dialog").map(x=>x.file),route_support:c.filter(x=>x.kind==="route-support").map(x=>x.file)},states:[...new Set(c.flatMap(x=>x.states))]}});

/* Tests and package/workspace/lockfile evidence. */
const tests=all.filter(f=>/(^|\/)(tests?|__tests__)(\/|$)|\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f)).map(f=>({file:f,imports:imports.filter(x=>x.from===f).map(x=>x.target).filter(Boolean)}));
const packageFiles=all.filter(f=>path.basename(f)==="package.json"),packages=packageFiles.map(f=>{let j={};try{j=JSON.parse(read(f))}catch{blockers.push({kind:"invalid-package-json",file:f})}return{file:f,name:j.name||null,private:!!j.private,workspaces:j.workspaces||null,dependencies:j.dependencies||{},devDependencies:j.devDependencies||{},peerDependencies:j.peerDependencies||{},optionalDependencies:j.optionalDependencies||{}}}),packageNames=new Map(packages.filter(x=>x.name).map(x=>[x.name,x.file])),workspaceRefs=[];
for(const p of packages)for(const sec of["dependencies","devDependencies","peerDependencies","optionalDependencies"])for(const[name,version]of Object.entries(p[sec]||{}))if(String(version).startsWith("workspace:"))workspaceRefs.push({package:p.file,name,version,owned_workspace:packageNames.get(name)||null,ownership_resolved:packageNames.has(name)});
if(workspaceRefs.some(x=>!x.ownership_resolved))blockers.push({kind:"unresolved-workspace-package",count:workspaceRefs.filter(x=>!x.ownership_resolved).length});
const lockfiles=all.filter(f=>/^(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb)$/.test(path.basename(f))),lockfileEvidence=lockfiles.map(f=>{const s=read(f),kind=path.basename(f),entries=[];if(kind==="package-lock.json"){try{const j=JSON.parse(s);for(const[k,v]of Object.entries(j.packages||{}))entries.push({path:k,name:v.name||null,version:v.version||null,dependencies:Object.keys(v.dependencies||{})})}catch{blockers.push({kind:"invalid-lockfile",file:f})}}else for(const line of s.split(/\r?\n/)){const m=line.match(/^\s{0,8}([^:#@\s][^:]*)@[^:]+:/);if(m)entries.push({specifier:m[1].trim()})}return{file:f,kind,entries:entries.length,sample:entries.slice(0,20)}});if(!lockfiles.length)blockers.push({kind:"missing-lockfile",detail:"No supported package lockfile found"});

/* Host-owned boundary signals. */
const patterns=[["network",/\b(?:https?|wss?):\/\//i],["subprocess",/(child_process|execFile|spawnSync|execSync|fork\s*\()/i],["native",/(node-gyp|better-sqlite3|\.node\b|TPROXY)/i],["filesystem",/(?:readFile|writeFile|readdir|mkdir|rm|cp|rename)(?:Sync)?\s*\(/i],["secrets",/(API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY|CLIENT_SECRET|ENCRYPTION_KEY)/i]],hostBoundaries=[];for(const f of textFiles){const s=read(f),kinds=patterns.filter(x=>x[1].test(s)).map(x=>x[0]);if(kinds.length)hostBoundaries.push({file:f,kinds:[...new Set(kinds)]})}

const report={schema_version:3,pinned_source_commit:PIN,pinned_source_tree:TREE,actual_checkout:{commit:actualCommit,tree:actualTree},generated_at:"deterministic-run-required",blockers,warnings,first_party_imports:{count:imports.length,unresolved},dynamic_loaders:dynamic,runtime_filesystem:runtimeFilesystem,environment_references:env,database:{modules:dbModules,migrations,table_migration_history:Object.fromEntries(schema),migration_operations:migrationOps,runtime_schema_evidence:runtimeSchemaEvidence,unknown_tables:unknownDb},dashboard:dashboardMap,tests,packages:{manifests:packages,workspace_references:workspaceRefs,lockfiles:lockfileEvidence},host_boundaries:hostBoundaries};
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+"\n");console.log(JSON.stringify({pass:blockers.length===0,blockers:blockers.length,blocker_details:blockers,output:out},null,2));if(blockers.length)process.exitCode=2;
