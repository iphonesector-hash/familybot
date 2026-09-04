import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {createRequire} from "node:module";
import {join} from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/\/$/,"");
const catalog = readFileSync(join(root,"lib/storeCatalog.ts"),"utf8");
const groups = readFileSync(join(root,"lib/storeGroups.ts"),"utf8");
const storeArt = readFileSync(join(root,"lib/storeArt.ts"),"utf8");
const storePage = readFileSync(join(root,"app/section/store/page.tsx"),"utf8");

const ids = [...catalog.matchAll(/id:"([^"]+)"/g)].map(m=>m[1]);
assert.equal(new Set(ids).size, ids.length, "duplicate catalog ids");
assert.ok(ids.length >= 80, `expected full catalog, got ${ids.length}`);

const care = [...groups.matchAll(/"sagool_[^"]+"/g)].map(m=>m[0].replaceAll('"',""));
assert.ok(groups.includes("CARE_IDS") && groups.includes("TOY_IDS") && groups.includes("FURNITURE_IDS"));
assert.ok(storePage.includes("STORE_GROUPS"));
assert.ok(storePage.includes("دارایی‌های من"));
assert.ok(!storeArt.includes(".svg"), "storeArt must not point at replacement SVGs");
assert.match(storeArt, /\.png/);

const classifySrc = groups;
const careIds = [...classifySrc.matchAll(/sagool_[a-z_]+/g)];
// Evaluate classification by extracting ID sets and kinds from catalog.
function parseItems(src){
  return [...src.matchAll(/\{id:"([^"]+)"[\s\S]*?kind:"([^"]+)"/g)].map(m=>({id:m[1],kind:m[2]}));
}
const items = parseItems(catalog);
assert.equal(items.length, ids.length);

function grabSet(name){
  const m = groups.match(new RegExp(`const ${name} = new Set\\(\\[([\\s\\S]*?)\\]\\);`));
  assert.ok(m, name);
  return new Set([...m[1].matchAll(/"([^"]+)"/g)].map(x=>x[1]));
}
const CARE = grabSet("CARE_IDS");
const TOY = grabSet("TOY_IDS");
const FURN = grabSet("FURNITURE_IDS");

function groupOf(item){
  const hits=[];
  if(item.kind==="sagool"&&CARE.has(item.id)) hits.push("care");
  if(item.kind==="sagool"&&TOY.has(item.id)) hits.push("toys");
  if(item.kind==="sagool"&&!CARE.has(item.id)&&!TOY.has(item.id)) hits.push("accessories");
  if(item.kind==="material") hits.push("materials");
  if(item.kind==="house"&&FURN.has(item.id)) hits.push("furniture");
  if(item.kind==="house"&&!FURN.has(item.id)) hits.push("decor");
  if(item.kind==="profile") hits.push("profile");
  return hits;
}

const missing=[], duplicates=[];
const classified=[];
for(const item of items){
  const hits=groupOf(item);
  if(!hits.length) missing.push(item.id);
  else if(hits.length>1) duplicates.push({id:item.id,groups:hits});
  else classified.push(item.id);
}

assert.equal(missing.length, 0, `missing: ${missing.join(",")}`);
assert.equal(duplicates.length, 0, `duplicates: ${JSON.stringify(duplicates)}`);
assert.equal(classified.length, items.length);
assert.equal(items.length, ids.length);

const keys = [...storeArt.matchAll(/"([a-z_]+)"/g)].map(m=>m[1]).filter(k=>k!=="mat_");
for(const key of ["galaxy_sofa","sagool_crown","sagool_armor","cosmic_aquarium","crystal_lantern"]){
  assert.ok(existsSync(join(root,`public/assets/store/items/${key}.png`)), key);
  assert.equal(existsSync(join(root,`public/assets/store/items/${key}.svg`)), false, `${key}.svg should be gone`);
}
for(const mat of ["brick","cement","wood","water","tile","paint"]){
  assert.ok(existsSync(join(root,`public/assets/house/materials/${mat}.png`)));
  assert.equal(existsSync(join(root,`public/assets/house/materials/${mat}.svg`)), false);
}

console.log(`store-integrity: catalog=${items.length} classified=${classified.length} missing=0 duplicates=0`);
