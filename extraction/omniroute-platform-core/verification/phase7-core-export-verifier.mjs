#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root=path.resolve(process.argv[2]||".");
const out=path.resolve(process.argv[3]||"extraction/omniroute-platform-core/verification/phase7-core-export-report.json");
const PIN="453918ab64f147604576e72d33e2bbfc12b2d1af";
const TREE="76f3546d48a7293b199b7571d13808bebadb6d1f";
const blockers=[], warnings=[];
const abs=p=>path.join(root,p);
const readJson=p=>{try{return JSON.parse(fs.readFileSync(abs(p),"utf8"))}catch{return null}};
const exists=p=>fs.existsSync(abs(p));
const sha256=s=>crypto.createHash("sha256").update(s).digest("hex");

const requiredReports=[
  "extraction/omniroute-platform-core/verification/phase1-gate.json",
  "extraction/omniroute-platform-core/verification/extraction-integrity-report.json",
  "extraction/omniroute-platform-core/verification/phase3-exact-source-manifest.json",
  "extraction/omniroute-platform-core/verification/phase3-capability-root-inventory.json",
  "extraction/omniroute-platform-core/verification/phase4-adapter-contract-report.json",
  "extraction/omniroute-platform-core/verification/phase5-adapter-contract-report.json",
  "extraction/omniroute-platform-core/verification/phase6-host-integration-report.json"
];
for(const p of requiredReports) if(!exists(p)) blockers.push({kind:"missing-verification-report",file:p});

const phase1=readJson(requiredReports[0]), integrity=readJson(requiredReports[1]), sourceManifest=readJson(requiredReports[2]);
const capability=readJson(requiredReports[3]), phase4=readJson(requiredReports[4]), phase5=readJson(requiredReports[5]), phase6=readJson(requiredReports[6]);

function requirePass(name,r){
  if(!r) return;
  const pass=r.pass===true || r.status==="PASS";
  if(!pass) blockers.push({kind:"upstream-verification-not-pass",name,status:r.status??null,pass:r.pass??null});
  if(r.source_commit && r.source_commit!==PIN) blockers.push({kind:"wrong-source-commit",name,actual:r.source_commit,expected:PIN});
  if(r.source_tree && r.source_tree!==TREE) blockers.push({kind:"wrong-source-tree",name,actual:r.source_tree,expected:TREE});
  if(Array.isArray(r.blockers)&&r.blockers.length) blockers.push({kind:"upstream-blockers",name,count:r.blockers.length,sample:r.blockers.slice(0,5)});
}
requirePass("phase1-gate",phase1);
requirePass("extraction-integrity",integrity);
requirePass("phase3-exact-source-manifest",sourceManifest);
requirePass("phase3-capability-root-inventory",capability);
requirePass("phase4-adapter-contracts",phase4);
requirePass("phase5-adapter-validation",phase5);
requirePass("phase6-host-integration",phase6);

if(sourceManifest?.commit && sourceManifest.commit!==PIN) blockers.push({kind:"manifest-pin-mismatch",actual:sourceManifest.commit,expected:PIN});
if(sourceManifest?.tree && sourceManifest.tree!==TREE) blockers.push({kind:"manifest-tree-mismatch",actual:sourceManifest.tree,expected:TREE});
if(integrity?.source_entry_count!==integrity?.extracted_file_count) blockers.push({kind:"integrity-count-mismatch",source:integrity?.source_entry_count,extracted:integrity?.extracted_file_count});

const immutableRoot="extraction/omniroute-platform-core/omniroute-source";
if(!exists(immutableRoot)) blockers.push({kind:"missing-immutable-source-root"});
const hostRoot="extraction/omniroute-platform-core/host-adapters";
const forbiddenInImmutable=["host-adapters/","contracts/","adapters/","capabilities/","external-dependencies/"];
if(exists(immutableRoot)){
  const files=[];
  const walk=(rel)=>{const d=abs(rel);for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(rel,e.name);if(e.isDirectory()){if(!["node_modules",".git",".next","dist","coverage"].includes(e.name))walk(p)}else files.push(p.replaceAll(path.sep,"/"));}};
  walk(immutableRoot);
  const leaked=files.filter(f=>forbiddenInImmutable.some(x=>f.includes("/"+x)||f.endsWith("/"+x.replace(/\/$/,""))));
  if(leaked.length) blockers.push({kind:"host-policy-leakage-in-immutable-package",count:leaked.length,sample:leaked.slice(0,10)});
}

const packageInputs=requiredReports.map(p=>({file:p,sha256:sha256(fs.readFileSync(abs(p)))}));
const packageDescriptor={
  schema_version:1,
  source:{repository:"Rilan-Dev/OmniRoute",commit:PIN,tree:TREE},
  immutable_source:{root:immutableRoot,entry_count:sourceManifest?.entry_count??null,manifest_sha256:sourceManifest?.manifest_sha256??null},
  host_owned_roots:[hostRoot,"extraction/omniroute-platform-core/verification"],
  package_inputs:packageInputs,
  policy:{
    immutable_source_rewrite:false,
    vendor_dependencies:false,
    host_policy_inside_immutable:false,
    provider_routing_semantics_rewrite:false
  }
};
const descriptorCanonical=JSON.stringify(packageDescriptor);
const report={schema_version:1,pass:blockers.length===0,source_commit:PIN,source_tree:TREE,immutable_entry_count:packageDescriptor.immutable_source.entry_count,package_descriptor_sha256:sha256(descriptorCanonical),package_descriptor:packageDescriptor,blockers,warnings};
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({pass:report.pass,blockers:blockers.length,source_commit:PIN,source_tree:TREE,immutable_entry_count:packageDescriptor.immutable_source.entry_count,output:out},null,2));
if(blockers.length) process.exitCode=2;
