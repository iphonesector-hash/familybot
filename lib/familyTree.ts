export type TreeMember={
  id:string;
  bale_user_id?:number|null;
  display_name?:string|null;
  first_name?:string|null;
  last_name?:string|null;
  relation_label?:string|null;
  avatar_url?:string|null;
  birthday?:string|null;
  death_date?:string|null;
  gender?:string|null;
  bio?:string|null;
  level:number;
};
export type TreeRel={id:string;from_member_id:string;to_member_id:string;relation_type:string};

export const RELATION_TYPES=["پدر","مادر","همسر","فرزند","برادر","خواهر","پدربزرگ","مادربزرگ","عمو","عمه","دایی","خاله","نوه"] as const;
const PARENT_TYPES=new Set(["پدر","مادر","پدربزرگ","مادربزرگ"]);
const CHILD_TYPES=new Set(["فرزند","نوه"]);
const SPOUSE_TYPES=new Set(["همسر"]);
const SIBLING_TYPES=new Set(["برادر","خواهر"]);
const FATHER_TYPES=new Set(["پدر","پدربزرگ"]);
const MOTHER_TYPES=new Set(["مادر","مادربزرگ"]);

export function isTreeOnlyMember(m:Pick<TreeMember,"bale_user_id">){
  return m.bale_user_id==null||Number(m.bale_user_id)<0;
}

export function treeOnlyMemberInsert(fields:Record<string,unknown>){
  return {...fields,bale_user_id:null};
}

export function memberName(m:Pick<TreeMember,"display_name"|"first_name"|"last_name">){
  const full=[m.first_name,m.last_name].filter(Boolean).join(" ");
  return (m.display_name||full||m.first_name||"عضو خانواده").trim();
}

export function normalizePersianName(input:string){
  return String(input||"").replace(/ي/g,"ی").replace(/ك/g,"ک").replace(/[\u200c\u200f\u200e]/g," ").replace(/\s+/g," ").trim().toLowerCase();
}

export function searchMembers<T extends Pick<TreeMember,"display_name"|"first_name"|"last_name"|"relation_label">>(members:T[],query:string){
  const q=normalizePersianName(query);
  if(!q)return members;
  return members.filter(m=>normalizePersianName([m.display_name,m.first_name,m.last_name,m.relation_label].filter(Boolean).join(" ")).includes(q));
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

export function siblingPair(rel:TreeRel):[string,string]|null{
  if(!SIBLING_TYPES.has(rel.relation_type))return null;
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

function childParentMap(rels:TreeRel[]){
  const parents=new Map<string,Array<{id:string;type:string}>>();
  for(const rel of rels){
    const e=parentEdge(rel);if(!e)continue;
    const list=parents.get(e[1])||[];
    list.push({id:e[0],type:rel.relation_type});
    parents.set(e[1],list);
  }
  return parents;
}

function parentChildEdges(rels:TreeRel[]){
  const map=new Map<string,string[]>();
  for(const rel of rels){
    const e=parentEdge(rel);if(!e)continue;
    const list=map.get(e[0])||[];list.push(e[1]);map.set(e[0],list);
  }
  return map;
}

export function parentsOf(rels:TreeRel[],memberId:string){
  return (childParentMap(rels).get(memberId)||[]).map(p=>p.id);
}

export function inferredSiblings(rels:TreeRel[],memberId:string){
  const mine=parentsOf(rels,memberId);
  if(!mine.length){
    const ids=new Set<string>();
    for(const rel of rels){
      const pair=siblingPair(rel);if(!pair)continue;
      if(pair[0]===memberId)ids.add(pair[1]);
      if(pair[1]===memberId)ids.add(pair[0]);
    }
    return [...ids];
  }
  const kids=new Set<string>();
  for(const rel of rels){
    const e=parentEdge(rel);if(!e)continue;
    if(mine.includes(e[0])&&e[1]!==memberId)kids.add(e[1]);
  }
  return [...kids];
}

export function planSiblingLinks(rels:TreeRel[],personId:string,siblingId:string){
  if(personId===siblingId)return {error:"self_sibling" as const,edges:[] as Array<{from:string;to:string;type:string}>};
  const parents=parentsOf(rels,personId);
  if(parents.length){
    return {
      error:null,
      edges:parents.map(pid=>{
        const existing=rels.find(r=>{
          const e=parentEdge(r);return e&&e[0]===pid&&e[1]===personId;
        });
        const type=existing&&MOTHER_TYPES.has(existing.relation_type)?"مادر":"پدر";
        return {from:pid,to:siblingId,type};
      }),
    };
  }
  return {error:null,edges:[{from:personId,to:siblingId,type:"برادر"}]};
}

export function validateRelation(rels:TreeRel[],from:string,to:string,type:string){
  if(!from||!to)return "invalid_relation";
  if(!(RELATION_TYPES as readonly string[]).includes(type))return "invalid_relation";
  if(from===to){
    if(SPOUSE_TYPES.has(type))return "self_spouse";
    if(SIBLING_TYPES.has(type))return "self_sibling";
    if(CHILD_TYPES.has(type))return "self_child";
    if(PARENT_TYPES.has(type))return "self_parent";
    return "self_relation";
  }
  const exact=rels.some(r=>r.from_member_id===from&&r.to_member_id===to&&r.relation_type===type);
  if(exact)return "duplicate_relation";
  const next:TreeRel={id:"tmp",from_member_id:from,to_member_id:to,relation_type:type};
  const edge=parentEdge(next);
  if(edge){
    const existingParents=childParentMap(rels).get(edge[1])||[];
    if(existingParents.some(p=>p.id===edge[0]))return "duplicate_parent";
    if(FATHER_TYPES.has(type)&&existingParents.some(p=>FATHER_TYPES.has(p.type)))return "duplicate_parent";
    if(MOTHER_TYPES.has(type)&&existingParents.some(p=>MOTHER_TYPES.has(p.type)))return "duplicate_parent";
    const descendants=walkChildren(edge[1],parentChildEdges(rels));
    if(descendants.has(edge[0]))return "parent_cycle";
  }
  if(SPOUSE_TYPES.has(type)){
    const exists=rels.some(r=>SPOUSE_TYPES.has(r.relation_type)&&((r.from_member_id===from&&r.to_member_id===to)||(r.from_member_id===to&&r.to_member_id===from)));
    if(exists)return "duplicate_spouse";
  }
  if(SIBLING_TYPES.has(type)){
    const exists=rels.some(r=>SIBLING_TYPES.has(r.relation_type)&&((r.from_member_id===from&&r.to_member_id===to)||(r.from_member_id===to&&r.to_member_id===from)));
    if(exists)return "duplicate_sibling";
    if(inferredSiblings(rels,from).includes(to))return "duplicate_sibling";
  }
  return null;
}

export function canDeleteTreeMember(member:Pick<TreeMember,"bale_user_id">){
  return isTreeOnlyMember(member);
}

export type LaidNode={member:TreeMember;x:number;y:number;cx:number;cy:number;gen:number};
export type BranchPath={d:string;kind:"parent"|"spouse"|"root"};
export type TreeLayout={
  width:number;
  height:number;
  nodes:LaidNode[];
  parentLines:Array<{x1:number;y1:number;x2:number;y2:number}>;
  spouseLines:Array<{x1:number;y1:number;x2:number;y2:number}>;
  branches:BranchPath[];
  generations:TreeMember[][];
};

const NODE_W=88;
const NODE_H=118;
const GAP_X=28;
const GAP_Y=78;
const PAD=36;

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
    return count*NODE_W+(Math.max(0,count-1))*GAP_X+(clusters.length-1)*16;
  });
  const width=Math.max(320,...rowWidths)+PAD*2;
  const trunkTop=28;
  const nodes:LaidNode[]=[];
  rows.forEach((clusters,gi)=>{
    const y=PAD+trunkTop+gi*(NODE_H+GAP_Y);
    const rowW=rowWidths[gi];
    let x=PAD+Math.max(0,(width-PAD*2-rowW)/2);
    clusters.forEach(cluster=>{
      cluster.forEach(member=>{
        nodes.push({member,x,y,cx:x+NODE_W/2,cy:y+40,gen:gi});
        x+=NODE_W+GAP_X;
      });
      x+=16;
    });
  });
  const byId=new Map(nodes.map(n=>[n.member.id,n]));
  const parentLines:TreeLayout["parentLines"]=[];
  const spouseLines:TreeLayout["spouseLines"]=[];
  const branches:BranchPath[]=[];
  const seenSpouse=new Set<string>();
  const midOf=(ids:string[])=>{
    const pts=ids.map(id=>byId.get(id)).filter(Boolean) as LaidNode[];
    if(!pts.length)return null;
    return {x:pts.reduce((n,p)=>n+p.cx,0)/pts.length,y:pts.reduce((n,p)=>n+p.y+NODE_H-16,0)/pts.length};
  };
  for(const rel of rels){
    const pair=spousePair(rel);
    if(pair){
      const key=[pair[0],pair[1]].sort().join(":");
      if(seenSpouse.has(key))continue;
      seenSpouse.add(key);
      const a=byId.get(pair[0]),b=byId.get(pair[1]);
      if(a&&b){
        spouseLines.push({x1:a.cx,y1:a.cy+20,x2:b.cx,y2:b.cy+20});
        const y=a.cy+20;
        branches.push({kind:"spouse",d:`M${a.cx} ${y} C${(a.cx+b.cx)/2} ${y-10}, ${(a.cx+b.cx)/2} ${y+10}, ${b.cx} ${y}`});
      }
    }
  }
  const drawnChild=new Set<string>();
  for(const child of members){
    const ps=[...parents.get(child.id)||[]];
    if(!ps.length||drawnChild.has(child.id))continue;
    const dest=byId.get(child.id);if(!dest)continue;
    const origin=midOf(ps);if(!origin)continue;
    drawnChild.add(child.id);
    parentLines.push({x1:origin.x,y1:origin.y,x2:dest.cx,y2:dest.y+8});
    const midY=(origin.y+dest.y)/2;
    branches.push({kind:"parent",d:`M${origin.x} ${origin.y} C${origin.x} ${midY+8}, ${dest.cx} ${midY-8}, ${dest.cx} ${dest.y+8}`});
  }
  const rootNodes=nodes.filter(n=>n.gen===0);
  if(rootNodes.length){
    const minX=Math.min(...rootNodes.map(n=>n.cx));
    const maxX=Math.max(...rootNodes.map(n=>n.cx));
    const mid=(minX+maxX)/2;
    const top=Math.min(...rootNodes.map(n=>n.y))-6;
    branches.push({kind:"root",d:`M${mid-18} ${top} C${mid-40} ${top+70}, ${mid-26} ${top+120}, ${mid-10} ${top+168} L${mid+10} ${top+168} C${mid+26} ${top+120}, ${mid+40} ${top+70}, ${mid+18} ${top}`});
    for(const n of rootNodes){
      branches.push({kind:"root",d:`M${n.cx} ${n.y+NODE_H-8} C${n.cx} ${n.y+NODE_H+18}, ${mid} ${top-4}, ${mid} ${top}`});
    }
  }
  return {
    width,
    height:PAD*2+trunkTop+generations.length*(NODE_H+GAP_Y)-GAP_Y+80,
    nodes,
    parentLines,
    spouseLines,
    branches,
    generations,
  };
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
