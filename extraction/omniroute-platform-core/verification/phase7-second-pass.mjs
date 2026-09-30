#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
const root=path.resolve(process.argv[2]||".");
const out=path.resolve(process.argv[3]||"extraction/omniroute-platform-core/verification/phase7-second-pass.json");
const PIN="453918ab64f147604576e72d33e2bbfc12b2d1af", TREE="76f3546d48a7293b199b7571d13808bebadb6d1f";
const blockers=[];
const git=a=>{const r=spawnSync("git",a,{cwd:root,encoding:"utf8"});return r.status===0?r.stdout.trim():null};
const commit=git(["rev-parse","HEAD"]), tree=git(["rev-parse","HEAD^{tree}"]);
if(commit!==PIN) blockers.push({kind:"wrong-checkout-commit",actual:commit,expected:PIN});
if(tree!==TREE) blockers.push({kind:"wrong-checkout-tree",actual:tree,expected:TREE});
function walk(rel="."){const d=path.join(root,rel);if(!fs.existsSync(d))return[];const a=[];for(const e of fs.readdirSync(d,{withFileTypes:true})){if(["node_modules",".git",".next","dist","build","coverage"].includes(e.name))continue;const p=path.join(rel,e.name);e.isDirectory()?a.push(...walk(p)):a.push(p.replaceAll(path.sep,"/"))}return a}
const files=walk(), source=files.filter(f=>/\.(ts|tsx|js|jsx|mjs|cjs|json|sql)$/i.test(f));
const read=f=>{try{return fs.readFileSync(path.join(root,f),"utf8")}catch{return""}};
const categories={
 realtime_websocket_voice:[/\b(?:src\/server\/ws|websocket|realtime|voice|audio|live|sse)\b/i,/\b(?:WebSocket|WebSocketServer|WebRTC|realtime|voice|speech|audio|SSE|streaming)\b/i],
 visual_editing_collaboration:[/\b(?:collab|collaboration|presence|yjs|crdt|editor|canvas|visual)\b/i,/\b(?:Yjs|Y\.Doc|CRDT|presence|collaborat|shared\s+(?:state|document)|cursor|awareness)\b/i],
 attachments_media_generation:[/\b(?:attachment|upload|download|media|image|video|audio|ocr|vision|multimodal|file)\b/i,/\b(?:attachment|multipart|image_url|image generation|generateImage|OCR|vision|multimodal|media)\b/i],
 project_runtime_generation:[/\b(?:project|runtime|sandbox|scaffold|generator|codegen|template|workspace|executor|execution)\b/i,/\b(?:generate(?:d|s)?\s+(?:project|code|app)|scaffold|sandbox|execute|runtime|workspace)\b/i],
 templates_scaffolding_frameworks:[/\b(?:template|templates|scaffold|starter|preset|framework|boilerplate)\b/i,/\b(?:Next\.js|React|Vue|Svelte|Angular|framework|template|scaffold|starter|preset)\b/i],
 version_control_diff_restore:[/\b(?:version|versions|snapshot|diff|restore|rollback|backup|sync|history|revision)\b/i,/\b(?:git\\b|commit|diff|restore|rollback|snapshot|backup|version)\b/i],
 analytics_usage_credits:[/\b(?:analytics|usage|credit|quota|meter|cost|billing|pricing|telemetry|metrics)\b/i,/\b(?:usage|credits?|quota|meter(?:ing)?|cost|analytics|telemetry|metrics)\b/i],
 notifications_email:[/\b(?:notification|email|mail|webhook|event|alert)\b/i,/\b(?:sendEmail|mailer|notification|webhook|event bus|alert)\b/i],
 browser_cli_cloud_agents:[/\b(?:browser|playwright|puppeteer|cli|cloud.?agent|remote.?agent|agent)\b/i,/\b(?:Playwright|Puppeteer|browser|CLI|remote agent|cloud agent|child_process|spawn|exec)\b/i],
 mcp_plugins_integrations:[/\b(?:mcp|a2a|plugin|plugins|skill|skills|integration|connector|tool)\b/i,/\b(?:MCP|Model Context Protocol|A2A|plugin|integration|connector|tool registry|skill)\b/i],
 ai_planning_clarification_evals:[/\b(?:planning|planner|clarif|eval|evaluation|feedback|orchestration|conductor|agentic)\b/i,/\b(?:plan|planner|clarif|evaluation|eval run|agentic|orchestrat|feedback)\b/i],
 security_audit_observability:[/\b(?:security|audit|trace|tracing|observability|monitor|guardrail|policy|authz|permission)\b/i,/\b(?:audit|trace|OpenTelemetry|OTel|guardrail|policy|authorization|permission|PII)\b/i],
 persistence_search_memory_rag:[/\b(?:memory|memories|vector|qdrant|rag|retriev|embedding|search|context|knowledge)\b/i,/\b(?:Qdrant|vector|embedding|retriev|RAG|semantic|memory|context window)\b/i]
};
const findings={};
for(const [name,[pr,tr]] of Object.entries(categories)){
 const hits=[];
 for(const f of files){const s=read(f),ps=pr.test(f),ts=tr.test(s);if(ps||ts)hits.push({file:f,path_signal:ps,text_signal:ts})}
 findings[name]={count:hits.length,files:hits};
}
const empty=Object.entries(findings).filter(([,v])=>v.count===0).map(([k])=>k);
if(empty.length)blockers.push({kind:"unexpected-empty-second-pass-category",categories:empty});
const routes=files.filter(f=>f.startsWith("src/app/api/")).reduce((a,f)=>{const k=f.split("/").slice(0,6).join("/");(a[k]??=[]).push(f);return a},{});
const report={schema_version:1,pinned_source_commit:PIN,pinned_source_tree:TREE,actual_checkout:{commit,tree},purpose:"Independent second-pass discovery of reusable application-platform capabilities outside the initial Tier-1 closure.",blockers,categories:findings,api_route_families:Object.fromEntries(Object.entries(routes).map(([k,v])=>[k,v.length])),acceptance:{no_category_may_be_silently_ignored:true,candidate_files_must_be_reviewed:true,product_only_does_not_mean_source_can_be_deleted:true,phase2_requires_phase1_gate_pass_first:true}};
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+"\n");console.log(JSON.stringify({pass:blockers.length===0,blockers:blockers.length,output:out},null,2));if(blockers.length)process.exitCode=2;
