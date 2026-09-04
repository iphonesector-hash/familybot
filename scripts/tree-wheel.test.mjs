function isTreeOnlyMember(m){
  return m.bale_user_id==null||Number(m.bale_user_id)<0;
}
function treeOnlyMemberInsert(fields){
  return {...fields,bale_user_id:null};
}
function validateRelation(rels,from,to,type){
  const PARENT=new Set(["پدر","مادر","پدربزرگ","مادربزرگ"]);
  const CHILD=new Set(["فرزند","نوه"]);
  const SPOUSE=new Set(["همسر"]);
  if(!from||!to)return "invalid_relation";
  if(from===to)return "self_relation";
  function edge(rel){
    if(PARENT.has(rel.relation_type))return [rel.from_member_id,rel.to_member_id];
    if(CHILD.has(rel.relation_type))return [rel.to_member_id,rel.from_member_id];
    return null;
  }
  const next={from_member_id:from,to_member_id:to,relation_type:type};
  const e=edge(next);
  if(e){
    const map=new Map();
    for(const rel of rels){
      const x=edge(rel);if(!x)continue;
      const list=map.get(x[0])||[];list.push(x[1]);map.set(x[0],list);
    }
    const seen=new Set();const stack=[e[1]];
    while(stack.length){
      const id=stack.pop();
      if(seen.has(id))continue;seen.add(id);
      for(const c of map.get(id)||[])stack.push(c);
    }
    if(seen.has(e[0]))return "parent_cycle";
  }
  if(SPOUSE.has(type)&&rels.some(r=>SPOUSE.has(r.relation_type)&&((r.from_member_id===from&&r.to_member_id===to)||(r.from_member_id===to&&r.to_member_id===from))))return "duplicate_spouse";
  return null;
}
function matchWheelIndex(labels,won){
  return Math.max(0,labels.findIndex(x=>x.kind===won.kind&&(won.kind==="item"?x.itemId===won.itemId:x.amount===won.amount)));
}
function wheelDelta(current,index,count,turns=6){
  const slice=360/Math.max(1,count);
  const center=index*slice+slice/2;
  const now=((current%360)+360)%360;
  const desired=((360-center)%360+360)%360;
  let delta=desired-now;
  if(delta<=0)delta+=360;
  return turns*360+delta;
}

const created=treeOnlyMemberInsert({family_id:"fam",first_name:"علی"});
if(created.bale_user_id!==null)throw new Error("new tree member must use null bale_user_id");
if(Object.values(created).some(v=>typeof v==="number"&&v<0))throw new Error("no negative sentinel in create payload");
if(isTreeOnlyMember({bale_user_id:12345}))throw new Error("positive bale member is not tree-only");
if(!isTreeOnlyMember({bale_user_id:null}))throw new Error("null is tree-only");
if(!isTreeOnlyMember({bale_user_id:-991}))throw new Error("legacy negative is tree-only");

const rels=[{from_member_id:"a",to_member_id:"b",relation_type:"پدر"}];
if(validateRelation(rels,"a","a","پدر")!=="self_relation")throw new Error("self parent");
if(validateRelation(rels,"b","a","پدر")!=="parent_cycle")throw new Error("cycle");
if(validateRelation([{from_member_id:"a",to_member_id:"b",relation_type:"همسر"}],"b","a","همسر")!=="duplicate_spouse")throw new Error("spouse");
if(validateRelation(rels,"a","c","پدر")!==null)throw new Error("valid parent");

const labels=[{kind:"coins",amount:15},{kind:"xp",amount:10},{kind:"item",amount:1,itemId:"sagool_bone"}];
if(matchWheelIndex(labels,{kind:"xp",amount:10})!==1)throw new Error("xp index");
if(matchWheelIndex(labels,{kind:"item",itemId:"sagool_bone"})!==2)throw new Error("item index");
const d=wheelDelta(0,1,10,6);
if(d<2160||d>=2520)throw new Error("delta range "+d);
const landed=(((0+d)%360)+360)%360;
const want=(360-(1*36+18)+360)%360;
if(Math.abs(landed-want)>0.01)throw new Error("land mismatch "+landed+" "+want);
console.log("tree-wheel: validation and wheel landing assertions passed");
