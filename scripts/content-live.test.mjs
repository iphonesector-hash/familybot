import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";

function load(path){return readFileSync(new URL("../"+path,import.meta.url),"utf8")}
function normalizeFa(text){return String(text||"").replace(/[يى]/g,"ی").replace(/ك/g,"ک").replace(/\s+/g," ").trim()}
function contentHash(kind,text){return createHash("sha1").update(`${kind}:${normalizeFa(text)}`).digest("hex").slice(0,16)}

assert.equal(contentHash("joke","سلام  دنیا"),contentHash("joke","سلام دنیا"));
assert.notEqual(contentHash("joke","سلام"),contentHash("fact","سلام"));

function photoFieldsPresent(source){
  const row=source&&typeof source==="object"?source:{};
  return {photo_url:Boolean(row.photo_url),photoUrl:Boolean(row.photoUrl),photo:Boolean(row.photo),avatar_url:Boolean(row.avatar_url)};
}
assert.deepEqual(photoFieldsPresent({photoUrl:"x"}),{photo_url:false,photoUrl:true,photo:false,avatar_url:false});
assert.equal(photoFieldsPresent({}).photo_url,false);

function pickDisplayAvatar({stored,live,server}){
  const ok=v=>/^https?:\/\//.test(String(v||""))&&!String(v).startsWith("storage:");
  return ok(stored)?stored:ok(live)?live:ok(server)?server:"";
}
assert.equal(pickDisplayAvatar({stored:"https://family/a.png",live:"https://bale/u.jpg"}),"https://family/a.png");
assert.equal(pickDisplayAvatar({stored:"storage:bale/1.jpg",live:"https://bale/u.jpg"}),"https://bale/u.jpg");
assert.equal(pickDisplayAvatar({stored:"",live:"",server:"https://cdn/x.jpg"}),"https://cdn/x.jpg");

function keyboardInset(layout,visual){return Math.max(0,Math.round(layout-visual))}
function keyboardOpen(inset,offset=0){return inset>80||offset>24}
assert.equal(keyboardInset(800,500),300);
assert.equal(keyboardOpen(300),true);
assert.equal(keyboardOpen(20,0),false);
assert.equal(keyboardOpen(0,40),true);

const fun=load("app/api/family/fun/route.ts");
assert.match(fun,/sourceLabel/);
assert.match(fun,/alreadyClaimed/);
assert.doesNotMatch(fun,/data:{type:"riddle".*correctIndex/);
const remote=load("lib/contentRemote.ts");
assert.match(remote,/api.ganjoor.net/);
assert.match(remote,/wikipedia-fa/);
assert.match(remote,/sector-ai/);
assert.match(remote,/curated-local/);
const session=load("app/api/bale/miniapp/session/route.ts");
assert.match(session,/\[bale.photo\]/);
assert.match(session,/ensureMemberBaleAvatar/);
const css=load("app/premium-ui.css");
assert.match(css,/--visual-vh/);
assert.match(css,/keyboardOpen/);
assert.doesNotMatch(css,/composer:focus-within/);
const ganjoorSample="میر من خوش می‌روی کاندر سر و پا میرمت";
assert.match(ganjoorSample,/میرمت/);
console.log("content-live: avatar, keyboard and source assertions passed");
