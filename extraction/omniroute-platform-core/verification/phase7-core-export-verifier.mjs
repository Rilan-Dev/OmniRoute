#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const root=path.resolve(process.argv[2]||".");
const verification=path.join(root,"extraction/omniroute-platform-core/verification");
const out=path.resolve(process.argv[3]||"extraction/omniroute-platform-core/verification/phase7-core-export-report.json");
const PIN="453918ab64f147604576e72d33e2bbfc12b2d1af";
const TREE="76f3546d48a7293b199b7571d13808bebadb6d1f";
const blockers=[],warnings=[];
const readJson=name=>{try{return JSON.parse(fs.readFileSync(path.join(verification,name),"utf8"))}catch{return null}};
const git=(args,cwd=root)=>{const r=spawnSync("git",args,{cwd,encoding:"utf8",maxBuffer:16*1024*1024});return r.status===0?r.stdout.trim():null};
const sourceManifest=readJson("phase3-exact-source-manifest.json");
const integrity=readJson("extraction-integrity-report.json");
const phase1=readJson("phase1-gate.json");
const phase3=readJson("phase3-capability-root-inventory.json");
const phase4=readJson("phase4-adapter-contract-report.json");
const phase5=readJson("phase5-adapter-contract-report.json");
const phase6=readJson("phase6-host-integration-report.json");

if(!sourceManifest||sourceManifest.source?.commit!==PIN||sourceManifest.source?.tree!==TREE)
  blockers.push({kind:"exact-source-manifest-mismatch"});
if(!integrity?.pass||integrity.blockers?.length) blockers.push({kind:"extraction-integrity-not-pass"});
if(!phase1?.pass||phase1.blockers?.length) blockers.push({kind:"phase1-gate-not-pass"});
if(!phase3||phase3.pass!==true||phase3.failures?.length) blockers.push({kind:"phase3-capability-inventory-not-pass"});
if(!phase4||phase4.status!=="PASS"||phase4.blockers?.length||phase4.immutable_source_modification!==false)
  blockers.push({kind:"phase4-contracts-not-pass"});
if(!phase5?.pass||phase5.blockers?.length) blockers.push({kind:"phase5-contracts-not-pass"});
if(!phase6||phase6.status!=="PASS"||phase6.blockers?.length) blockers.push({kind:"phase6-host-integration-not-pass"});

const packageEntries=Array.isArray(sourceManifest?.entries)?sourceManifest.entries:[];
const sourceCommit=git(["rev-parse","HEAD"],path.resolve(root,"../omniroute-source"));
const sourceTree=git(["rev-parse","HEAD^{tree}"],path.resolve(root,"../omniroute-source"));
if(sourceCommit!==PIN) blockers.push({kind:"wrong-source-commit",actual:sourceCommit,expected:PIN});
if(sourceTree!==TREE) blockers.push({kind:"wrong-source-tree",actual:sourceTree,expected:TREE});

const forbiddenRoots=["host-adapters/","verification/","EXTRACTION_WORKLOG.md","EXTRACTION_MANIFEST.md","CAPABILITY_INVENTORY.md"];
const policyLeakage=packageEntries.filter(e=>forbiddenRoots.some(p=>e.path===p||e.path.startsWith(p)));
if(policyLeakage.length) blockers.push({kind:"host-policy-leakage",count:policyLeakage.length,sample:policyLeakage.slice(0,20)});

const sourceCount=packageEntries.length;
const integritySource=integrity?.source_entry_count;
const extractedCount=integrity?.extracted_file_count;
if(integritySource!==sourceCount) blockers.push({kind:"source-count-drift",manifest:sourceCount,integrity:integritySource});
if(extractedCount!==sourceCount) blockers.push({kind:"extracted-count-drift",manifest:sourceCount,extracted:extractedCount});

const canonical=packageEntries.map(e=>[e.path,e.mode,e.type,e.blob].join("\t")).sort().join("\n")+"\n";
const descriptor={
  schema_version:1,
  package_kind:"immutable-omniroute-core",
  source:{repository:"Rilan-Dev/OmniRoute",ref:"release/v3.8.52",commit:PIN,tree:TREE},
  immutable:{entry_count:sourceCount,manifest_sha256:sourceManifest?.manifest_sha256||null},
  host_owned_roots:["extraction/omniroute-platform-core/host-adapters/","extraction/omniroute-platform-core/verification/"],
  policy:{source_is_read_only:true,host_identity_tenancy_billing_branding_deployment_are_adapter_owned:true,provider_routing_quota_compression_mcp_a2a_semantics_unchanged:true},
  canonical_membership_sha256:crypto.createHash("sha256").update(canonical).digest("hex")
};
const descriptorSha256=crypto.createHash("sha256").update(JSON.stringify(descriptor)).digest("hex");
const report={schema_version:1,phase:7,status:blockers.length?"FAIL":"PASS",source_commit:PIN,source_tree:TREE,source_entry_count:sourceCount,descriptor_sha256:descriptorSha256,descriptor,blockers,warnings};
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({pass:blockers.length===0,blockers:blockers.length,source_entry_count:sourceCount,descriptor_sha256:descriptorSha256,output:out},null,2));
if(blockers.length)process.exitCode=2;
