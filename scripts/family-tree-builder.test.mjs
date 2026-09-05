import assert from "node:assert/strict";

const PARENT=new Set(["پدر","مادر","پدربزرگ","مادربزرگ"]);
const CHILD=new Set(["فرزند","نوه"]);
const SPOUSE=new Set(["همسر"]);
const SIBLING=new Set(["برادر","خواهر"]);
function parentEdge(rel){
  if(PARENT.has(rel.relation_type))return [rel.from_member_id,rel.to_member_id];
  if(CHILD.has(rel.relation_type))return [rel.to_member_id,rel.from_member_id];
  return null;
}
function walk(start,edges){
  const seen=new Set();const stack=[start];
  while(stack.length){const id=stack.pop();if(seen.has(id))continue;seen.add(id);for(const c of edges.get(id)||[])stack.push(c)}
  return seen;
}
function validateRelation(rels,from,to,type){
  if(!from||!to)return "invalid_relation";
  if(from===to){
    if(SPOUSE.has(type))return "self_spouse";
    if(SIBLING.has(type))return "self_sibling";
    if(CHILD.has(type))return "self_child";
    if(PARENT.has(type))return "self_parent";
    return "self_relation";
  }
  if(rels.some(r=>r.from_member_id===from&&r.to_member_id===to&&r.relation_type===type))return "duplicate_relation";
  const next={from_member_id:from,to_member_id:to,relation_type:type};
  const edge=parentEdge(next);
  if(edge){
    const parents=[];
    const map=new Map();
    for(const rel of rels){
      const e=parentEdge(rel);if(!e)continue;
      if(e[1]===edge[1])parents.push({id:e[0],type:rel.relation_type});
      const list=map.get(e[0])||[];list.push(e[1]);map.set(e[0],list);
    }
    if(parents.some(p=>p.id===edge[0]))return "duplicate_parent";
    if(type==="پدر"&&parents.some(p=>p.type==="پدر"))return "duplicate_parent";
    if(type==="مادر"&&parents.some(p=>p.type==="مادر"))return "duplicate_parent";
    if(walk(edge[1],map).has(edge[0]))return "parent_cycle";
  }
  if(SPOUSE.has(type)&&rels.some(r=>SPOUSE.has(r.relation_type)&&((r.from_member_id===from&&r.to_member_id===to)||(r.from_member_id===to&&r.to_member_id===from))))return "duplicate_spouse";
  if(SIBLING.has(type)&&rels.some(r=>SIBLING.has(r.relation_type)&&((r.from_member_id===from&&r.to_member_id===to)||(r.from_member_id===to&&r.to_member_id===from))))return "duplicate_sibling";
  return null;
}
function treeOnlyMemberInsert(fields){return {...fields,bale_user_id:null}}
function isTreeOnlyMember(m){return m.bale_user_id==null||Number(m.bale_user_id)<0}
function canDeleteTreeMember(m){return isTreeOnlyMember(m)}
function normalizePersianName(input){
  return String(input||"").replace(/ي/g,"ی").replace(/ك/g,"ک").replace(/[\u200c\u200f\u200e]/g," ").replace(/\s+/g," ").trim().toLowerCase();
}
function searchMembers(members,query){
  const q=normalizePersianName(query);
  if(!q)return members;
  return members.filter(m=>normalizePersianName([m.display_name,m.first_name,m.last_name,m.relation_label].filter(Boolean).join(" ")).includes(q));
}
function planSiblingLinks(rels,personId,siblingId,opts={}){
  if(personId===siblingId)return {error:"self_sibling",edges:[]};
  const parents=[];
  for(const rel of rels){const e=parentEdge(rel);if(e&&e[1]===personId)parents.push({id:e[0],type:rel.relation_type})}
  if(parents.length)return {error:null,edges:parents.map(p=>({from:p.id,to:siblingId,type:p.type==="مادر"?"مادر":"پدر"}))};
  const type=opts.siblingType==="برادر"||opts.siblingType==="خواهر"?opts.siblingType:opts.gender==="male"?"برادر":opts.gender==="female"?"خواهر":null;
  if(!type)return {error:"sibling_type_required",edges:[]};
  return {error:null,edges:[{from:personId,to:siblingId,type}]};
}
function memberNameKey(m){
  const display=normalizePersianName(m.display_name||"");
  const full=normalizePersianName([m.first_name,m.last_name].filter(Boolean).join(" "));
  return display||full;
}
function findSameNameMembers(members,candidate){
  const key=memberNameKey(candidate);
  if(!key)return [];
  return members.filter(m=>memberNameKey(m)===key);
}
function layoutGens(members,rels){
  const parents=new Map();const children=new Map();const spouses=new Map();
  for(const rel of rels){
    const e=parentEdge(rel);
    if(e){const ps=parents.get(e[1])||new Set();ps.add(e[0]);parents.set(e[1],ps);const cs=children.get(e[0])||new Set();cs.add(e[1]);children.set(e[0],cs)}
    if(SPOUSE.has(rel.relation_type)){
      const a=spouses.get(rel.from_member_id)||new Set();a.add(rel.to_member_id);spouses.set(rel.from_member_id,a);
      const b=spouses.get(rel.to_member_id)||new Set();b.add(rel.from_member_id);spouses.set(rel.to_member_id,b);
    }
  }
  const level=new Map();
  const roots=members.filter(m=>!parents.has(m.id));
  const q=(roots.length?roots:members).map(m=>[m.id,0]);
  while(q.length){const [id,l]=q.shift();if(level.has(id)&&level.get(id)<=l)continue;level.set(id,l);for(const c of children.get(id)||[])q.push([c,l+1])}
  return {level,spouses,parents};
}

const created=treeOnlyMemberInsert({family_id:"fam",first_name:"نرگس"});
assert.equal(created.bale_user_id,null);
assert.equal(isTreeOnlyMember({bale_user_id:12}),false);
assert.equal(isTreeOnlyMember({bale_user_id:null}),true);
assert.equal(canDeleteTreeMember({bale_user_id:99}),false);
assert.equal(canDeleteTreeMember({bale_user_id:null}),true);

const people=[{id:"a",first_name:"علي",display_name:"علی رضایی",relation_label:"پدر"},{id:"b",first_name:"مریم"}];
assert.equal(searchMembers(people,"علی")[0].id,"a");
assert.equal(searchMembers(people,"علي")[0].id,"a");

assert.equal(validateRelation([],"a","a","پدر"),"self_parent");
assert.equal(validateRelation([],"a","a","فرزند"),"self_child");
assert.equal(validateRelation([],"a","a","همسر"),"self_spouse");
assert.equal(validateRelation([],"a","a","برادر"),"self_sibling");
assert.equal(validateRelation([{from_member_id:"f",to_member_id:"c",relation_type:"پدر"}],"f","c","پدر"),"duplicate_relation");
assert.equal(validateRelation([{from_member_id:"f",to_member_id:"c",relation_type:"پدر"}],"f2","c","پدر"),"duplicate_parent");
assert.equal(validateRelation([{from_member_id:"a",to_member_id:"b",relation_type:"همسر"}],"b","a","همسر"),"duplicate_spouse");
assert.equal(validateRelation([{from_member_id:"a",to_member_id:"b",relation_type:"برادر"}],"b","a","خواهر"),"duplicate_sibling");
assert.equal(validateRelation([{from_member_id:"a",to_member_id:"b",relation_type:"پدر"},{from_member_id:"b",to_member_id:"c",relation_type:"پدر"}],"c","a","پدر"),"parent_cycle");
assert.equal(validateRelation([],"a","b","پدر"),null);
assert.equal(validateRelation([],"a","b","همسر"),null);

const sib=planSiblingLinks([{from_member_id:"f",to_member_id:"a",relation_type:"پدر"}],"a","s");
assert.deepEqual(sib.edges,[{from:"f",to:"s",type:"پدر"}]);
assert.equal(planSiblingLinks([],"a","a").error,"self_sibling");
assert.equal(planSiblingLinks([],"a","b",{gender:"male"}).edges[0].type,"برادر");
assert.equal(planSiblingLinks([],"a","b",{gender:"female"}).edges[0].type,"خواهر");
assert.equal(planSiblingLinks([],"a","b").error,"sibling_type_required");
assert.equal(planSiblingLinks([],"a","b",{siblingType:"خواهر"}).edges[0].type,"خواهر");

const twins=[
  {id:"p1",first_name:"علی",last_name:"محمدی",display_name:"علی محمدی",bale_user_id:11},
  {id:"p2",first_name:"علی",last_name:"محمدی",display_name:"علی محمدی",bale_user_id:null},
];
const hits=searchMembers(twins,"علی محمدی");
assert.equal(hits.length,2);
assert.notEqual(hits[0].id,hits[1].id);
assert.equal(findSameNameMembers(twins,{first_name:"علی",last_name:"محمدی",display_name:"علی محمدی"}).length,2);
assert.equal(findSameNameMembers(twins,{first_name:"علي",last_name:"محمدی",display_name:"علی محمدی"}).length,2);
assert.equal(isTreeOnlyMember(twins[0]),false);
assert.equal(isTreeOnlyMember(twins[1]),true);


const gens=layoutGens(
  [{id:"gf"},{id:"gm"},{id:"f"},{id:"m"},{id:"c"}],
  [
    {from_member_id:"gf",to_member_id:"f",relation_type:"پدر"},
    {from_member_id:"gm",to_member_id:"f",relation_type:"مادر"},
    {from_member_id:"f",to_member_id:"m",relation_type:"همسر"},
    {from_member_id:"f",to_member_id:"c",relation_type:"پدر"},
  ]
);
assert.equal(gens.level.get("gf"),0);
assert.equal(gens.level.get("f"),1);
assert.equal(gens.level.get("c"),2);
assert.ok(gens.spouses.get("f").has("m"));

assert.equal(validateRelation([{from_member_id:"a",to_member_id:"b",relation_type:"پدر"}],"a","b","پدر"),"duplicate_relation");

import {readFileSync} from "node:fs";
const page=readFileSync(new URL("../app/section/tree/page.tsx",import.meta.url),"utf8");
assert.ok(page.includes("ثبت فرد به‌صورت دستی"));
assert.ok(page.includes("انتخاب از اعضای خانواده"));
assert.ok(page.includes("افزودن ${k}")||page.includes("افزودن پدر"));
assert.ok(page.includes("افزودن خواهر/برادر"));
assert.equal(page.includes("اتصال به عضو خانواده"),false);
assert.equal(page.includes("member.link"),false);
assert.ok(page.includes("حذف ارتباط"));
assert.ok(page.includes("حذف فرد دستی"));
assert.ok(page.includes("عضو متصل به بله"));
assert.ok(page.includes("این فرد شخص دیگری است"));
assert.ok(page.includes("استفاده از فرد موجود"));
assert.ok(page.includes("در شجره موجود است"));
assert.ok(page.includes("فردی با نام مشابه در خانواده وجود دارد"));
assert.ok(page.includes("مشخص کنید این فرد برادر است یا خواهر"));


console.log("family-tree-builder tests passed");
