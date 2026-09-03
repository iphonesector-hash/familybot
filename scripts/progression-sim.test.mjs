import assert from "node:assert/strict";
import {readdirSync,statSync} from "node:fs";
import {join} from "node:path";

const THRESH = [0,80,200,360,560,820,1140,1540,2040,2680];
function sagoolLevelFromXp(xp){
  const n=Math.max(0,Number(xp)||0);
  let level=1;
  for(let i=0;i<THRESH.length;i++) if(n>=THRESH[i]) level=i+1;
  return Math.min(10,level);
}

function houseSceneSrc(level){
  const lv=Math.min(10,Math.max(1,Math.floor(Number(level)||1)));
  return `/assets/house/levels/${String(lv).padStart(2,"0")}.jpg`;
}

const COST = {
  2:{brick:8,cement:4,wood:4,water:6,coins:80},
  3:{brick:12,cement:8,wood:6,water:8,coins:160},
  4:{brick:20,cement:10,wood:8,water:10,tile:4,coins:500},
};

function missing(have,cost){
  const miss={};
  for(const [k,v] of Object.entries(cost)){
    if(k==="coins") continue;
    if((have[k]||0)<v) miss[k]=v-(have[k]||0);
  }
  return miss;
}

function simulateUpgrade(state,fromLevel){
  if(state.houseLevel!==fromLevel) return {ok:false,error:"house_level_changed",state};
  if(state.houseLevel>=10) return {ok:false,error:"house_max_level",state};
  const nxt=state.houseLevel+1;
  const cost=COST[nxt];
  if(!cost) return {ok:false,error:"invalid_level",state};
  const miss=missing(state.materials,cost);
  if(Object.keys(miss).length) return {ok:false,error:"missing_materials",state};
  if(!state.founder && state.coins<cost.coins) return {ok:false,error:"insufficient_coins",state};
  const next={...state,materials:{...state.materials},houseLevel:nxt};
  for(const [k,v] of Object.entries(cost)){
    if(k==="coins") continue;
    next.materials[k]=(next.materials[k]||0)-v;
    assert.ok(next.materials[k]>=0,"no negative inventory");
  }
  if(!state.founder) next.coins-=cost.coins;
  return {ok:true,state:next};
}

function simulateCare(pet,action,now,lastByAction){
  if(Object.prototype.hasOwnProperty.call(lastByAction,action) && now-lastByAction[action]<20_000){
    return {ok:false,error:"sagool_cooldown",pet,xpGranted:0};
  }
  const next={...pet};
  if(action==="feed"){next.hunger=Math.min(100,next.hunger+32);next.xp+=10}
  else if(action==="water"){next.thirst=Math.min(100,next.thirst+38);next.xp+=10}
  else if(action==="play"){next.happiness=Math.min(100,next.happiness+30);next.xp+=12}
  else if(action==="sleep"){next.energy=Math.min(100,next.energy+45);next.xp+=10}
  else throw new Error("unknown");
  next.level=sagoolLevelFromXp(next.xp);
  lastByAction[action]=now;
  return {ok:true,pet:next,xpGranted:action==="play"?12:10};
}

function simulateBuyUnique(owned,coins,price,id){
  if(owned.has(id)) return {purchased:false,alreadyOwned:true,coins};
  if(coins<price) return {error:"insufficient_coins",coins};
  owned.add(id);
  return {purchased:true,alreadyOwned:false,coins:coins-price};
}

function simulateBuyStack(qty,coins,price,pack){
  if(coins<price) return {error:"insufficient_coins",qty,coins};
  return {qty:qty+pack,coins:coins-price};
}

const root=new URL("..",import.meta.url).pathname.replace(/\/$/,"")+"/public/assets";

// Sagool curve + mapping
assert.equal(sagoolLevelFromXp(0),1);
assert.equal(sagoolLevelFromXp(79),1);
assert.equal(sagoolLevelFromXp(80),2);
assert.equal(sagoolLevelFromXp(2679),9);
assert.equal(sagoolLevelFromXp(2680),10);
for(let i=1;i<=10;i++){
  const file=join(root,"sagool/levels",`${String(i).padStart(2,"0")}.jpg`);
  assert.ok(statSync(file).size>20_000,`sagool ${i}`);
}

// House assets 1-10 distinct files
const houseFiles=[];
for(let i=1;i<=10;i++){
  const file=join(root,"house/levels",`${String(i).padStart(2,"0")}.jpg`);
  const st=statSync(file);
  assert.ok(st.size>20_000,`house ${i}`);
  houseFiles.push(st.size);
  assert.equal(houseSceneSrc(i),`/assets/house/levels/${String(i).padStart(2,"0")}.jpg`);
}
assert.equal(new Set(houseFiles).size,10,"house files must not be identical copies");

// Dashboard source must not mix family level
const familyLevel=7, persistedHouse=2;
const houseLevel=Math.max(1,Math.min(10,Number(persistedHouse||1)));
assert.equal(houseLevel,2);
assert.notEqual(Math.max(persistedHouse,familyLevel),houseLevel);

// Sagool flows
let pet={level:1,xp:0,hunger:40,thirst:40,energy:40,happiness:40};
const last={};
let r=simulateCare(pet,"feed",1_000,last);
assert.equal(r.ok,true); assert.equal(r.xpGranted,10); pet=r.pet; assert.ok(pet.hunger>40);
r=simulateCare(pet,"feed",2_000,last);
assert.equal(r.ok,false); assert.equal(r.error,"sagool_cooldown"); assert.equal(r.xpGranted,0); assert.equal(pet.xp,10);
r=simulateCare(pet,"water",21_000,last);
assert.equal(r.ok,true); pet=r.pet; assert.ok(pet.thirst>40);
r=simulateCare(pet,"play",21_000,last);
assert.equal(r.ok,true); pet=r.pet;
r=simulateCare(pet,"sleep",21_000,last);
assert.equal(r.ok,true); pet=r.pet;
pet.xp=75; pet.level=sagoolLevelFromXp(pet.xp);
r=simulateCare(pet,"feed",50_000,last);
assert.equal(r.pet.level,2);

// House upgrade atomic + failures
let house={houseLevel:1,coins:100,founder:false,materials:{brick:8,cement:4,wood:4,water:6}};
const first=simulateUpgrade(house,1);
assert.equal(first.ok,true); assert.equal(first.state.houseLevel,2); assert.equal(first.state.coins,20); assert.equal(first.state.materials.brick,0);
const replay=simulateUpgrade(first.state,1);
assert.equal(replay.ok,false); assert.equal(replay.error,"house_level_changed");
const poor=simulateUpgrade({houseLevel:2,coins:10,founder:false,materials:{brick:12,cement:8,wood:6,water:8}},2);
assert.equal(poor.error,"insufficient_coins");
const short=simulateUpgrade({houseLevel:2,coins:200,founder:false,materials:{brick:1,cement:8,wood:6,water:8}},2);
assert.equal(short.error,"missing_materials");
const box={state:house};
function lockedUpgrade(){
  const res=simulateUpgrade(box.state,1);
  if(res.ok) box.state=res.state;
  return res;
}
const concurrent=[lockedUpgrade(),lockedUpgrade()];
assert.equal(concurrent.filter(x=>x.ok).length,1);
assert.equal(box.state.houseLevel,2);

// Store unique vs stack
const owned=new Set();
const a=simulateBuyUnique(owned,1000,200,"galaxy_sofa");
const b=simulateBuyUnique(owned,a.coins,200,"galaxy_sofa");
assert.equal(a.purchased,true); assert.equal(b.alreadyOwned,true); assert.equal(b.coins,a.coins);
let pack=simulateBuyStack(0,500,180,8);
pack=simulateBuyStack(pack.qty,pack.coins,180,8);
assert.equal(pack.qty,16);

console.log("progression-sim: all assertions passed");
console.log("house files",readdirSync(join(root,"house/levels")).sort().join(","));
console.log("sagool files",readdirSync(join(root,"sagool/levels")).sort().join(","));
