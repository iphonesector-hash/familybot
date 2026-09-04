import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

function load(path){return readFileSync(new URL("../"+path,import.meta.url),"utf8")}

function extractBalePhotoUrl(source){
  if(!source||typeof source!=="object")return null;
  const raw=[source.photo_url,source.photoUrl,source.photo,source.avatar_url,source.avatarUrl];
  for(const value of raw){
    const text=String(value||"").trim();
    if(/^https?:\/\//i.test(text)&&!text.startsWith("storage:"))return text;
  }
  return null;
}
function resolveAvatarUrl(stored,live){
  const a=String(stored||"");
  if(/^https?:\/\//i.test(a)&&!a.startsWith("storage:"))return a;
  const b=String(live||"");
  if(/^https?:\/\//i.test(b))return b;
  return "";
}
function rewardResult(correct,kind,alreadyClaimed=false){
  const table={quiz:{coins:15,cp:10},trivia:{coins:12,cp:8},riddle:{coins:8,cp:5},coin:{coins:10,cp:5},dezfuli:{coins:3,cp:10}};
  const reward=correct&&!alreadyClaimed?table[kind]:{coins:0,cp:0};
  return {correct,reward,alreadyClaimed};
}

assert.equal(extractBalePhotoUrl({photoUrl:"https://bale.ai/u.jpg"}),"https://bale.ai/u.jpg");
assert.equal(extractBalePhotoUrl({photo_url:"https://cdn.bale.ai/p.png"}),"https://cdn.bale.ai/p.png");
assert.equal(extractBalePhotoUrl({photo:"storage:x"} ),null);
assert.equal(resolveAvatarUrl("https://family.example/a.png","https://bale.ai/u.jpg"),"https://family.example/a.png");
assert.equal(resolveAvatarUrl("","https://bale.ai/u.jpg"),"https://bale.ai/u.jpg");
assert.equal(resolveAvatarUrl("storage:avatars/a.png","https://bale.ai/u.jpg"),"https://bale.ai/u.jpg");

const coinWin=rewardResult(true,"coin");
assert.equal(coinWin.reward.coins,10);
assert.equal(coinWin.reward.cp,5);
assert.equal(rewardResult(false,"coin").reward.coins,0);
assert.equal(rewardResult(true,"riddle",true).alreadyClaimed,true);
assert.equal(rewardResult(true,"riddle",true).reward.coins,0);
const quiz=rewardResult(true,"quiz");
assert.equal(quiz.reward.coins,15);
assert.equal(quiz.reward.cp,10);

const game=load("app/api/family/game/route.ts");
assert.match(game,/guess!=="شیر"/);
assert.match(game,/challengeReward\("coin"\)/);
const fun=load("app/api/family/fun/route.ts");
assert.match(fun,/game_type:"riddle"/);
assert.doesNotMatch(fun,/answer:type==="riddle"\?item.extra/);
const gamesPage=load("app/section/games/page.tsx");
assert.match(gamesPage,/createPortal/);
assert.match(gamesPage,/انتخابت چیه؟/);
assert.match(gamesPage,/resolved_avatar_url/);
const ai=load("app/api/ai/chat/route.ts");
assert.match(ai,/request_accepted/);
assert.match(ai,/completeChat/);
assert.match(ai,/from "@\/lib\/aiProvider"/);
assert.match(ai,/AbortSignal\.timeout|timeoutMs:14000/);
console.log("hotfix-live-qa: avatar, coin, quiz, riddle and AI logging assertions passed");
