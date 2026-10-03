#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const consumerRoot=path.resolve(process.argv[2]);
if(!consumerRoot) throw new Error("consumer root required");

const packageJson=path.join(consumerRoot,"package.json");
if(!fs.existsSync(packageJson)) throw new Error("immutable package.json missing");

const pkg=JSON.parse(fs.readFileSync(packageJson,"utf8"));
if(pkg.name!=="omniroute"||pkg.version!=="3.8.52") throw new Error("unexpected immutable package identity");

const imported=await import(pathToFileURL(packageJson).href+"?consumer-check=1", { with: { type:"json" } });
if(imported.default?.name!=="omniroute"||imported.default?.version!=="3.8.52") throw new Error("consumer import identity mismatch");

const requiredRoots=["open-sse","src/domain","src/lib","src/models","src/server","src/shared","src/types"];
for(const root of requiredRoots) if(!fs.existsSync(path.join(consumerRoot,root))) throw new Error("missing immutable root: "+root);

console.log(JSON.stringify({
  package_name:pkg.name,
  version:pkg.version,
  imported_identity:imported.default,
  required_roots:requiredRoots
}));
