export type TreeMember={
  id:string;
  bale_user_id?:number|null;
  display_name?:string|null;
  first_name?:string|null;
  last_name?:string|null;
  relation_label?:string|null;
  avatar_url?:string|null;
  birthday?:string|null;
  level:number;
};
export type TreeRel={id:string;from_member_id:string;to_member_id:string;relation_type:string};

export const RELATION_TYPES=["پدر","مادر","همسر","فرزند","برادر","خواهر","پدربزرگ","مادربزرگ","عمو","عمه","دایی","خاله","نوه"] as const;
const PARENT_TYPES=new Set(["پدر","مادر","پدربزرگ","مادربزرگ"]);
const CHILD_TYPES=new Set(["فرزند","نوه"]);
const SPOUSE_TYPES=new Set(["همسر"]);

export function isTreeOnlyMember(m:Pick<TreeMember,"bale_user_id">){
  return m.bale_user_id==null||Number(m.bale_user_id)<0;
}

export function memberName(m:TreeMember){
  const full=[m.first_name,m.last_name].filter(Boolean).join(" ");
  return (m.display_name||full||m.first_name||"عضو خانواده").trim();
}

export function parentEdge(rel:TreeRel):[string,string]|null{
  if(PARENT_TYPES.has(rel.relation_type))return [rel.from_member_id,rel.to_member_id];
  if(CHILD_TYPES.has(rel.relation_type))return [rel.to_member_id,rel.from_member_id];
  return null;
}

export function spousePair(rel:TreeRel):[string,string]|null{
  if(!SPOUSE_TYPES.has(rel.relation_type))return null;
  return [rel.from_member_id,rel.to_member_id];
}

function walkChildren(start:string,edges:Map<string,string[]>){
  const seen=new Set<string>();
  const stack=[start];
  while(stack.length){
    const id=stack.pop()!;
    if(seen.has(id))continue;
    seen.add(id);
    for(const child of edges.get(id)||[])stack.push(child);
  }
  return seen;
}

export function validateRelation(rels:TreeRel[],from:string,to:string,type:string){
  if(!from||!to)return "invalid_relation";
  if(from===to)return "self_relation";
  if(!(RELATION_TYPES as readonly string[]).includes(type))return "invalid_relation";
  const next:TreeRel={id:"tmp",from_member_id:from,to_member_id:to,relation_type:type};
  const edge=parentEdge(next);
  if(edge){
    const map=new Map<string,string[]>();
    for(const rel of rels){
      const e=parentEdge(rel);if(!e)continue;
      const list=map.get(e[0])||[];list.push(e[1]);map.set(e[0],list);
    }
    const descendants=walkChildren(edge[1],map);
    if(descendants.has(edge[0]))return "parent_cycle";
  }
  if(SPOUSE_TYPES.has(type)){
    const exists=rels.some(r=>SPOUSE_TYPES.has(r.relation_type)&&((r.from_member_id===from&&r.to_member_id===to)||(r.from_member_id===to&&r.to_member_id===from)));
    if(exists)return "duplicate_spouse";
  }
  return null;
}

export type LaidNode={member:TreeMember;x:number;y:number;cx:number;cy:number};
export type TreeLayout={
  width:number;
  height:number;
  nodes:LaidNode[];
  parentLines:Array<{x1:number;y1:number;x2:number;y2:number}>;
  spouseLines:Array<{x1:number;y1:number;x2:number;y2:number}>;
  generations:TreeMember[][];
};

const NODE_W=92;
const NODE_H=124;
const GAP_X=22;
const GAP_Y=64;
const PAD=18;

export function layoutFamilyTree(members:TreeMember[],rels:TreeRel[]):TreeLayout{
  const parents=new Map<string,Set<string>>();
  const children=new Map<string,Set<string>>();
  const spouses=new Map<string,Set<string>>();
  for(const rel of rels){
    const edge=parentEdge(rel);
    if(edge){
      const ps=parents.get(edge[1])||new Set<string>();ps.add(edge[0]);parents.set(edge[1],ps);
      const cs=children.get(edge[0])||new Set<string>();cs.add(edge[1]);children.set(edge[0],cs);
    }
    const pair=spousePair(rel);
    if(pair){
      const a=spouses.get(pair[0])||new Set<string>();a.add(pair[1]);spouses.set(pair[0],a);
      const b=spouses.get(pair[1])||new Set<string>();b.add(pair[0]);spouses.set(pair[1],b);
    }
  }
  const level=new Map<string,number>();
  const roots=members.filter(m=>!parents.has(m.id));
  const queue:Array<[string,number]>=(roots.length?roots:members).map(m=>[m.id,0]);
  while(queue.length){
    const [id,l]=queue.shift()!;
    if(level.has(id)&&level.get(id)!<=l)continue;
    level.set(id,l);
    for(const child of children.get(id)||[])queue.push([child,l+1]);
  }
  members.forEach(m=>{if(!level.has(m.id))level.set(m.id,0)});
  const max=Math.max(0,...level.values());
  const generations=Array.from({length:max+1},(_,i)=>members.filter(m=>level.get(m.id)===i));
  const used=new Set<string>();
  const rows=generations.map(row=>{
    const clusters:TreeMember[][]=[];
    for(const m of row){
      if(used.has(m.id))continue;
      const partnerId=[...spouses.get(m.id)||[]].find(id=>row.some(x=>x.id===id)&&!used.has(id));
      if(partnerId){
        const partner=row.find(x=>x.id===partnerId)!;
        clusters.push([m,partner]);
        used.add(m.id);used.add(partner.id);
      }else{
        clusters.push([m]);
        used.add(m.id);
      }
    }
    return clusters;
  });
  const rowWidths=rows.map(clusters=>{
    const count=clusters.reduce((n,c)=>n+c.length,0);
    return count*NODE_W+(Math.max(0,count-1))*GAP_X+(clusters.length-1)*8;
  });
  const width=Math.max(280,...rowWidths)+PAD*2;
  const nodes:LaidNode[]=[];
  rows.forEach((clusters,gi)=>{
    const y=PAD+gi*(NODE_H+GAP_Y);
    const rowW=rowWidths[gi];
    let x=PAD+Math.max(0,(width-PAD*2-rowW)/2);
    clusters.forEach(cluster=>{
      cluster.forEach(member=>{
        nodes.push({member,x,y,cx:x+NODE_W/2,cy:y+42});
        x+=NODE_W+GAP_X;
      });
      x+=8;
    });
  });
  const byId=new Map(nodes.map(n=>[n.member.id,n]));
  const parentLines:TreeLayout["parentLines"]=[];
  const spouseLines:TreeLayout["spouseLines"]=[];
  const seenSpouse=new Set<string>();
  for(const rel of rels){
    const edge=parentEdge(rel);
    if(edge){
      const a=byId.get(edge[0]),b=byId.get(edge[1]);
      if(a&&b)parentLines.push({x1:a.cx,y1:a.y+NODE_H-18,x2:b.cx,y2:b.y+8});
    }
    const pair=spousePair(rel);
    if(pair){
      const key=[pair[0],pair[1]].sort().join(":");
      if(seenSpouse.has(key))continue;
      seenSpouse.add(key);
      const a=byId.get(pair[0]),b=byId.get(pair[1]);
      if(a&&b)spouseLines.push({x1:a.cx,y1:a.cy+18,x2:b.cx,y2:b.cy+18});
    }
  }
  return {width,height:PAD*2+generations.length*(NODE_H+GAP_Y)-GAP_Y,nodes,parentLines,spouseLines,generations};
}

export function matchWheelIndex<T extends {kind:string;amount?:number;itemId?:string}>(labels:T[],won:T){
  const exact=labels.findIndex(x=>x.kind===won.kind&&(won.kind==="item"?x.itemId===won.itemId:x.amount===won.amount));
  return Math.max(0,exact);
}

export function wheelDelta(current:number,index:number,count:number,turns=6){
  const slice=360/Math.max(1,count);
  const center=index*slice+slice/2;
  const now=((current%360)+360)%360;
  const desired=((360-center)%360+360)%360;
  let delta=desired-now;
  if(delta<=0)delta+=360;
  return turns*360+delta;
}
