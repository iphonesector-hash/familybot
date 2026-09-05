import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url),root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
export function loader(overrides={},globals={}){
  const cache=new Map();
  function load(file){
    const abs=path.resolve(root,file);if(cache.has(abs))return cache.get(abs).exports;
    const module={exports:{}};cache.set(abs,module);
    if(abs.endsWith(".json")){module.exports=JSON.parse(fs.readFileSync(abs,"utf8"));return module.exports;}
    const code=ts.transpileModule(fs.readFileSync(abs,'utf8'),{compilerOptions:{esModuleInterop:true,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
    const localRequire=id=>{
      if(Object.hasOwn(overrides,id))return overrides[id];
      if(id.startsWith('.')||id.startsWith('@/')){
        const base=id.startsWith('@/')?path.join(root,id.slice(2)):path.resolve(path.dirname(abs),id);
        const resolved=[base,base+'.ts',base+'.tsx',path.join(base,'index.ts')].find(p=>fs.existsSync(p)&&fs.statSync(p).isFile());
        if(resolved)return load(resolved);
      }
      return require(id);
    };
    vm.runInNewContext(code,{module,exports:module.exports,require:localRequire,process,Buffer,console,URL,Date,Intl,AbortSignal,fetch:(...a)=>fetch(...a),setTimeout,clearTimeout,...globals},{filename:abs});
    return module.exports;
  }
  return load;
}

export async function probe({offline=false}={}){
  const load=loader({},{console:{info(){},error(){},log(){}},...(offline?{fetch:async()=>{throw Error("offline")}}:{})});
  const {resolveContentAsync}=load("lib/contentRemote.ts"),{rememberHash}=load("lib/contentHash.ts");
  const result={mode:offline?"offline imported pools (not live QA)":"real resolver; available environment",kinds:{}};
  for(const [kind,n] of [["poem",30],["proverb",30],["fact",30],["joke",30],["dezfuli-proverb",15],["dezfuli-poem",15]]){
    let recent=[];const seen=new Set(),distribution={};let errors=0;const outputs=[];
    for(let i=0;i<n;i++)try{const row=await resolveContentAsync(kind,recent);recent=rememberHash(recent,row.contentHash);seen.add(row.contentHash);const k=`${row.source}/${row.sourceMode}`;distribution[k]=(distribution[k]||0)+1;outputs.push({text:row.text,source:row.source,sourceMode:row.sourceMode,sourceUrl:row.sourceUrl,contentHash:row.contentHash});}catch{errors++;}
    result.kinds[kind]={requests:n,unique:seen.size,errors,distribution,outputs};
  }
  return result;
}
if(process.argv[1]===new URL(import.meta.url).pathname)console.log(JSON.stringify(await probe({offline:process.argv.includes("--offline")}),null,2));
