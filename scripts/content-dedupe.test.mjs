import {readFileSync} from "fs";

function ids(src, prefix){
  const re=new RegExp(`id:"(${prefix}[^"]+)"`,"g");
  return [...src.matchAll(re)].map(m=>m[1]);
}
function pickFresh(list, recent){
  const unused=list.filter(id=>!recent.includes(id));
  if(unused.length) return unused[Math.floor(Math.random()*unused.length)];
  const notLast=list.filter(id=>id!==recent[0]);
  const use=notLast.length?notLast:list;
  return use[Math.floor(Math.random()*use.length)];
}
function run(name, list, n=20){
  const recent=[];
  const seen=new Set();
  let immediate=0, last="";
  for(let i=0;i<n;i++){
    const id=pickFresh(list,recent);
    if(id===last) immediate++;
    last=id;
    seen.add(id);
    recent.unshift(id);
    if(recent.length>24) recent.pop();
  }
  return {name, pool:list.length, unique:seen.size, immediate, calls:n};
}

const fun=readFileSync(new URL("../lib/funBank.ts", import.meta.url),"utf8");
const curated=readFileSync(new URL("../lib/curatedJokes.ts", import.meta.url),"utf8");
const dez=readFileSync(new URL("../lib/dezfuliCulture.ts", import.meta.url),"utf8");

const kinds=[
  run("joke", ids(curated,"j")),
  run("fact", ids(fun,"f")),
  run("riddle", ids(fun,"r")),
  run("motivation", ids(fun,"m")),
  run("hafez", ids(fun,"h")),
  run("proverb", ids(fun,"p")),
  run("poem", ids(fun,"po")),
  run("dezfuli-word", ids(dez,"").filter(x=>!x.includes("-"))),
];

let fail=0;
for(const row of kinds){
  const ok=row.pool>=8 && row.immediate===0;
  if(!ok) fail++;
  console.log(`${row.name.padEnd(16)} pool=${row.pool} unique=${row.unique}/${row.calls} immediate=${row.immediate} ${ok?"PASS":"FAIL"}`);
}
if(fail) process.exit(1);
console.log("content-dedupe: all assertions passed");
