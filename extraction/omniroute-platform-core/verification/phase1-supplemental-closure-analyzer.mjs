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

const blockers=[], dynamic=[], boundedDynamic=[], runtimeDynamic=[], runtimeFs=[], dbRefs=[], migrations=[], ui=[], tests=[], packages=[];
const env=new Map();
function repositoryBoundedTarget(expression) {
  const e=expression.replace(/\s+/g,"");
  let m=e.match(/^projectFileUrl\(["']([^"']+)["']\)$/);
  if (m) {
    const target=path.resolve(ROOT,m[1]);
    return fs.existsSync(target) ? target : null;
  }
  m=e.match(/^pathToFileURL\((?:path\.)?(?:join|resolve)\((ROOT|PROJECT_ROOT|REPO),(.+)\)\)\.href$/);
  if (!m) m=e.match(/^(?:path\.)?join\(REPO,(.+)\)$/);
  if (!m) return null;
  const tail=m[2] ?? m[1];
  const segments=[...tail.matchAll(/"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'/g)].map(x=>x[1]??x[2]);
  if (!segments.length) return null;
  const normalized=tail.replace(/"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'/g,(_,a,b)=>JSON.stringify(a??b)).replace(/,/g,",");
  const reconstructed=segments.map(s=>JSON.stringify(s)).join(",");
  if (normalized !== reconstructed) return null;
  const target=path.resolve(ROOT,...segments);
  return fs.existsSync(target) ? target : null;
}

function knownRuntimeDynamicEvidence(file, expression) {
  const e=expression.replace(/^\s*\/\*[^]*?\*\/\s*/,"").trim();
  if (/^["'](?:node:sqlite|bun:sqlite)["']\s+as\s+never$/.test(e)) {
    return {kind:"type-only-import-expression",evidence:"TypeScript import type query; no runtime module edge."};
  }
  if ((file==="src/app/global-error.tsx" && e.startsWith("`../i18n/messages/${") && e.endsWith("}.json`")) ||
      (file==="src/i18n/request.ts" && e.startsWith("`./messages/${") && e.endsWith("}.json`"))) {
    return {kind:"finite-repository-locale-loader",evidence:"Locale message imports are constrained to repository JSON files under the i18n messages directory."};
  }
  if (file==="src/i18n/request.ts" && (e==="`./messages/${FALLBACK_LOCALE}.json`" || e==="`./messages/${DEFAULT_LOCALE}.json`")) {
    return {kind:"repository-locale-constant-loader",evidence:"Locale constants resolve to repository JSON message files."};
  }
  if (file==="src/lib/db/adapters/sqljsAdapter.ts" && e==="moduleName") {
    return {kind:"declared-external-dependency-loader",evidence:"moduleName is constructed as sql.js; package.json declares sql.js."};
  }
  if (file==="src/lib/memory/embedding/transformersLocal.ts" && e==="specifier") {
    return {kind:"declared-external-dependency-loader",evidence:"specifier is constructed as @huggingface/transformers; package.json declares @huggingface/transformers."};
  }
  if (file==="open-sse/services/browserPool.ts" || file==="packages/browser-pool/src/services/browserPool.ts") {
    if (e==="getCloakbrowserModuleId()") return {kind:"optional-runtime-enhancer",evidence:"Source explicitly documents cloakbrowser as an optional runtime enhancer and catches failed loading."};
  }
  if (file==="open-sse/services/compression/engines/llmlingua/onnxWorker.ts" && e==="specifier") {
    return {kind:"runtime-supplied-optional-module",evidence:"ONNX worker intentionally receives the module specifier at runtime and marks the import bundler-ignored."};
  }
  if (file==="bin/aliasResolver.mjs" && e==="hookUrl.href" && /aliasResolverHook\\.mjs/.test(read(path.join(ROOT,"bin/aliasResolver.mjs")))) {
    const target=path.join(ROOT,"bin","aliasResolverHook.mjs");
    if (fs.existsSync(target)) return {kind:"repository-runtime-loader",evidence:"hookPath is a sibling repository file and the exact target exists."};
  }
  if (file==="bin/chatgpt-web-codex-mcp.mjs" && e==="pathToFileURL(entry).href") {
    const target=path.join(ROOT,"open-sse","vendor","codex-chatgpt-web","adapters","chatgpt-web","mcp-server.ts");
    if (fs.existsSync(target)) return {kind:"repository-runtime-loader",evidence:"entry is selected only from the repository's documented source/dist candidates; source candidate exists."};
  }
  if (file==="bin/cli/commands/doctor.mjs" && /^pathToFileURL\\(path\\.join\\(rootDir, "bin", "nodeRuntimeSupport\\.mjs"\\)\\)\\.href$/.test(e)) {
    const target=path.join(ROOT,"bin","nodeRuntimeSupport.mjs");
    if (fs.existsSync(target)) return {kind:"repository-runtime-loader",evidence:"doctor resolves a fixed repository-relative runtime support module."};
  }
  if (file==="bin/cli/commands/doctor.mjs" && /^pathToFileURL\\(path\\.join\\(rootDir, "scripts", "build", "native-binary-compat\\.mjs"\\)\\)\\.href$/.test(e)) {
    const target=path.join(ROOT,"scripts","build","native-binary-compat.mjs");
    if (fs.existsSync(target)) return {kind:"repository-runtime-loader",evidence:"doctor resolves a fixed repository-relative native compatibility module."};
  }
  if (file==="bin/cli/plugins.mjs" && e==="pathToFileURL(entryPath).href") {
    return {kind:"user-plugin-runtime-loader",evidence:"entryPath is derived from discovered ~/.omniroute/plugins or OMNIROUTE_PLUGIN_PATH packages whose names are constrained by PLUGIN_PREFIX_RE."};
  }
  if (file==="bin/cli/runtime/sqliteRuntime.mjs" && e==="pathToFileURL(pkgRoot).href") {
    return {kind:"runtime-installed-dependency-loader",evidence:"pkgRoot is the validated runtime node_modules/better-sqlite3 package root and package.json is required before import."};
  }
  if (file==="bin/cli/runtime/trayRuntime.ts" && e==="systrayModuleSpecifier(RUNTIME_DIR)") {
    return {kind:"runtime-installed-dependency-loader",evidence:"systrayModuleSpecifier targets the lazily installed pinned systray2 package under the runtime directory."};
  }
  return null;
}

function add(map,key,value) {
  if (!map.has(key)) map.set(key,[]);
  map.get(key).push(value);
}

for (const file of source) {
  const r=rel(file);
  let t;
  try { t=read(file); } catch { continue; }

  // JSON is data, not executable source; strings inside JSON can contain examples\n  // such as `import(` that must never become runtime-loader blockers.\n  if (path.extname(file) !== ".json") {\n  // Code-aware dynamic-loader scan. This prevents examples inside comments
  // (for example a documented require()) from becoming false blockers, and
  // balances nested parentheses in path.join()/path.resolve() expressions.
  // Preserve source offsets while masking non-code regions. A one-character
  // replacement shifts every later match and corrupts the extracted expression.
  const blankPreservingOffsets = (match) =>
    match.replace(/[^\n]/g, " ");
  const masked=t
    .replace(/\/\*[\s\S]*?\*\//g, blankPreservingOffsets)
    .replace(/\/\/[^\n]*/g, blankPreservingOffsets)
    .replace(/"(?:\\.|[^"\\])*"/g, blankPreservingOffsets)
    .replace(/'(?:\\.|[^'\\])*'/g, blankPreservingOffsets)
    .replace(/\`(?:\\.|[^\`\\])*\`/g, blankPreservingOffsets);
  for (const re of [/\bimport\s*\(/g,/\brequire\s*\(/g]) {
    const kind=re.source.startsWith("\\bimport")?"import":"require";
    let m;
    while((m=re.exec(masked))){
      let depth=1,j=m.index+m[0].length;
      while(j<masked.length&&depth){
        if(masked[j]==="(") depth++;
        else if(masked[j]===")") depth--;
        j++;
      }
      const expr=t.slice(m.index+m[0].length,j-1).trim();
      // A webpack/vite directive comment may legally occur between import( and
      // its argument. Ignore only leading comments for literal classification;
      // keep the original expression for evidence.
      const executableExpr=expr
        .replace(/^(?:\/\*[\s\S]*?\*\/|\/\/[^\n]*(?:\n|$))\s*/g,"")
        .trim();
      const literal=/^["'][^"']+["']$/.test(executableExpr);
      const boundedTarget = repositoryBoundedTarget(executableExpr);
      const bounded = Boolean(boundedTarget);
      const runtimeEvidence = knownRuntimeDynamicEvidence(r, executableExpr);
      if (literal) {
        dynamic.push({file:r,kind,expression:expr,literal:true});
      } else if (bounded) {
        dynamic.push({file:r,kind,expression:expr,literal:false,bounded_repository:true});
        boundedDynamic.push({file:r,kind,expression:expr,target:rel(boundedTarget)});
      } else if (runtimeEvidence) {
        dynamic.push({file:r,kind,expression:expr,literal:false,runtime_resolved:true});
        runtimeDynamic.push({file:r,kind,expression:expr,...runtimeEvidence});
      } else {
        dynamic.push({file:r,kind,expression:expr,literal:false});
        blockers.push({kind:kind==="import"?"dynamic-import":"dynamic-require",file:r,detail:expr});
      }
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
  repository_bounded_dynamic_imports:boundedDynamic,
  runtime_resolved_dynamic_imports:runtimeDynamic,
  runtime_filesystem_signals:[...new Map(runtimeFs.map(x=>[JSON.stringify(x),x])).values()],
  environment_references:Object.fromEntries([...env.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>[k,[...new Set(v)].sort()])),
  database:{references:dbRefs,migration_files:[...new Set(migrations)].sort()},
  dashboard:{state_signals:ui},tests,packages,blockers
};
const out=path.resolve(process.argv[3]??"phase1-supplemental-closure.json");
fs.writeFileSync(out,JSON.stringify(result,null,2)+"\n");
const blockerSummary=Object.fromEntries([...blockers.reduce((m,b)=>{m.set(b.kind,(m.get(b.kind)||0)+1);return m;},new Map())].sort((a,b)=>a[0].localeCompare(b[0])));
const blockerSample=blockers.slice(0,25);
console.log(JSON.stringify({
  blocker_summary:blockerSummary,blocker_sample:blockerSample,
  scanned_files:result.scanned_files,source_files:result.source_files,
  dynamic_imports:dynamic.length,repository_bounded_dynamic_imports:boundedDynamic.length,runtime_resolved_dynamic_imports:runtimeDynamic.length,runtime_filesystem_signals:result.runtime_filesystem_signals.length,
  db_references:dbRefs.length,dashboard_files:ui.length,tests:tests.length,
  packages:packages.length,blockers:blockers.length,output:out
},null,2));
if (blockers.length) process.exitCode=2;
