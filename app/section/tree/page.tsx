"use client";
import {FormEvent,useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {Icon} from "../../ui";
import {
  RELATION_TYPES,
  isTreeOnlyMember,
  layoutFamilyTree,
  memberName,
  type TreeMember,
  type TreeRel,
} from "@/lib/familyTree";
import "./tree.css";

type Mode="view"|"edit"|"add";
const errText:Record<string,string>={
  admin_required:"این تغییر فقط برای مدیر گروه مجازه.",
  self_relation:"هیچ‌کس نمی‌تواند والد خودش باشد.",
  parent_cycle:"این نسبت یک حلقه والد-فرزندی می‌سازد.",
  duplicate_spouse:"این پیوند همسری قبلاً ثبت شده.",
  linked_member:"عضو متصل به بله را نمی‌توان از شجره حذف کرد.",
  name_required:"نام عضو لازم است.",
};

function ageFrom(birthday?:string|null){
  if(!birthday)return "";
  const d=new Date(`${birthday}T00:00:00`);
  if(Number.isNaN(d.getTime()))return "";
  const n=new Date();
  let age=n.getFullYear()-d.getFullYear();
  if(n.getMonth()<d.getMonth()||(n.getMonth()===d.getMonth()&&n.getDate()<d.getDate()))age-=1;
  return age>=0?`${age} سال` : "";
}

export default function TreePage(){
  const[members,setMembers]=useState<TreeMember[]>([]);
  const[rels,setRels]=useState<TreeRel[]>([]);
  const[canManage,setCanManage]=useState(false);
  const[busy,setBusy]=useState(false);
  const[msg,setMsg]=useState("");
  const[mode,setMode]=useState<Mode>("view");
  const[selected,setSelected]=useState<string>("");
  const[scale,setScale]=useState(1);
  const session=()=>sessionStorage.getItem("familybot.session")||"";
  const load=useCallback(async()=>{
    const s=session();if(!s)return;
    const r=await fetch("/api/family/tree",{headers:{authorization:`Bearer ${s}`},cache:"no-store"});
    const d=await r.json();
    if(d.ok){setMembers(d.members||[]);setRels(d.relationships||[]);setCanManage(Boolean(d.canManage))}
  },[]);
  useEffect(()=>{void load()},[load]);
  const layout=useMemo(()=>layoutFamilyTree(members,rels),[members,rels]);
  const current=members.find(m=>m.id===selected)||null;
  async function json(body:Record<string,unknown>){
    const s=session();if(!s)return null;
    setBusy(true);setMsg("");
    try{
      const r=await fetch("/api/family/tree",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${s}`},body:JSON.stringify(body)});
      const d=await r.json();
      if(!r.ok||!d.ok)throw new Error(d.error||"tree_failed");
      setMsg(body.action==="member.delete"?"عضو از شجره‌نامه حذف شد.":"شجره‌نامه به‌روزرسانی شد.");
      await load();
      return d as Record<string,unknown>;
    }catch(e){
      const key=e instanceof Error?e.message:"";
      setMsg(errText[key]||"ذخیره انجام نشد.");
      return null;
    }finally{setBusy(false)}
  }
  async function upload(memberId:string,file:File){
    const s=session();if(!s)return;
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)){setMsg("فقط عکس JPG، PNG یا WebP قابل ذخیره است.");return}
    setBusy(true);setMsg("");
    try{
      const form=new FormData();form.set("memberId",memberId);form.set("file",file);
      const r=await fetch("/api/family/tree",{method:"POST",headers:{authorization:`Bearer ${s}`},body:form});
      const d=await r.json();if(!r.ok||!d.ok)throw new Error();
      setMsg("عکس عضو ذخیره شد.");
      await load();
    }catch{setMsg("آپلود عکس انجام نشد.")}
    finally{setBusy(false)}
  }
  function openMember(id:string){
    setSelected(id);
    if(canManage)setMode("edit");
  }
  return <main className="appShell treePage">
    <div className="ambient ambientA"/><div className="starField"/>
    <header className="appHeader">
      <Link className="roundButton" href="/section/family">←</Link>
      <div className="wordmark"><b>شجره‌نامه</b><span>نمای خانواده</span></div>
      <span className="profileAvatar"><Icon name="tree"/></span>
    </header>
    {msg&&<div className="adminNotice">{msg}</div>}
    <div className="treeToolbar">
      <button className={mode==="view"?"on":""} onClick={()=>setMode("view")}>نمایش</button>
      {canManage&&<button className={mode==="edit"?"on":""} onClick={()=>setMode("edit")}>ویرایش</button>}
      {canManage&&<button className={`treeAdd${mode==="add"?" on":""}`} onClick={()=>setMode("add")}>+ افزودن عضو</button>}
      <button onClick={()=>setScale(s=>Math.max(.7,Number((s-.1).toFixed(2))))}>−</button>
      <button onClick={()=>setScale(s=>Math.min(1.3,Number((s+.1).toFixed(2))))}>+</button>
    </div>
    {!members.length
      ? <section className="premiumPanel treeEmpty">
          <Icon name="tree" size={36}/>
          <h2>شجره‌نامه خانواده هنوز ساخته نشده</h2>
          <p>اولین عضو را اضافه کن تا درخت خانواده شکل بگیرد.</p>
          {canManage&&<button className="primaryCta" onClick={()=>setMode("add")}>اولین عضو را اضافه کن</button>}
        </section>
      : <div className="treeViewport">
          <div className="treeBoard" style={{width:layout.width*scale,height:layout.height*scale}}>
            <div style={{transform:`scale(${scale})`,transformOrigin:"top right",width:layout.width,height:layout.height,position:"relative"}}>
              <svg className="treeLines" viewBox={`0 0 ${layout.width} ${layout.height}`}>
                {layout.parentLines.map((l,i)=><path key={`p${i}`} d={`M${l.x1} ${l.y1} C${l.x1} ${(l.y1+l.y2)/2}, ${l.x2} ${(l.y1+l.y2)/2}, ${l.x2} ${l.y2}`} fill="none" stroke="rgba(186,150,255,.7)" strokeWidth="2"/>)}
                {layout.spouseLines.map((l,i)=><line key={`s${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="rgba(255,214,140,.7)" strokeWidth="2"/>)}
              </svg>
              {layout.nodes.map(n=>(
                <button key={n.member.id} className={`treeNode${selected===n.member.id?" on":""}`} style={{left:n.x,top:n.y}} onClick={()=>openMember(n.member.id)}>
                  <div className="treeAvatar">{n.member.avatar_url?<img src={n.member.avatar_url} alt=""/>:<Icon name="profile" size={22}/>}</div>
                  <b>{memberName(n.member)}</b>
                  <small>{n.member.relation_label||ageFrom(n.member.birthday)||""}</small>
                </button>
              ))}
            </div>
          </div>
        </div>}
    {mode==="add"&&canManage&&<AddSheet busy={busy} members={members} onSave={json} onCancel={()=>setMode("view")}/>}
    {mode==="edit"&&canManage&&current&&<EditSheet member={current} members={members} rels={rels} busy={busy} onSave={json} onUpload={upload} onClose={()=>setMode("view")}/>}
    {mode==="view"&&current&&<section className="premiumPanel treeSheet">
      <span className="eyebrow">برگه عضو</span>
      <h2>{memberName(current)}</h2>
      <p>{current.relation_label||"نسبت ثبت نشده"}{ageFrom(current.birthday)?` · ${ageFrom(current.birthday)}`:""}</p>
      {canManage&&<button className="primaryCta" onClick={()=>setMode("edit")}>ویرایش این عضو</button>}
    </section>}
  </main>;
}

function AddSheet({members,busy,onSave,onCancel}:{members:TreeMember[];busy:boolean;onSave:(x:Record<string,unknown>)=>Promise<Record<string,unknown>|null>;onCancel:()=>void}){
  const[first,setFirst]=useState(""),[last,setLast]=useState(""),[label,setLabel]=useState("فرزند"),[birth,setBirth]=useState(""),[parent,setParent]=useState(""),[spouse,setSpouse]=useState("");
  function submit(e:FormEvent){
    e.preventDefault();
    void (async()=>{
      const created=await onSave({action:"member.create",firstName:first,lastName:last,displayName:[first,last].filter(Boolean).join(" "),relationLabel:label,birthday:birth||null});
      const id=created&&typeof created.memberId==="string"?created.memberId:"";
      if(id&&parent)await onSave({action:"relation.save",fromMemberId:parent,toMemberId:id,relationType:label==="مادر"?"مادر":"پدر"});
      if(id&&spouse)await onSave({action:"relation.save",fromMemberId:id,toMemberId:spouse,relationType:"همسر"});
      if(created)onCancel();
    })();
  }
  return <section className="premiumPanel treeSheet">
    <span className="eyebrow">+ افزودن عضو</span>
    <h2>عضو جدید خانواده</h2>
    <form onSubmit={submit}>
      <input value={first} onChange={e=>setFirst(e.target.value)} placeholder="نام" required/>
      <input value={last} onChange={e=>setLast(e.target.value)} placeholder="نام خانوادگی"/>
      <select value={label} onChange={e=>setLabel(e.target.value)}>{RELATION_TYPES.map(x=><option key={x}>{x}</option>)}</select>
      <input type="date" value={birth} onChange={e=>setBirth(e.target.value)}/>
      {members.length>0&&<>
        <select value={parent} onChange={e=>setParent(e.target.value)}><option value="">والد (اختیاری)</option>{members.map(m=><option key={m.id} value={m.id}>{memberName(m)}</option>)}</select>
        <select value={spouse} onChange={e=>setSpouse(e.target.value)}><option value="">همسر (اختیاری)</option>{members.map(m=><option key={m.id} value={m.id}>{memberName(m)}</option>)}</select>
      </>}
      <div className="treeActions">
        <button className="adminSave" disabled={busy||!first.trim()}>ثبت عضو</button>
        <button type="button" onClick={onCancel}>انصراف</button>
      </div>
    </form>
  </section>;
}

function EditSheet({member,members,rels,busy,onSave,onUpload,onClose}:{member:TreeMember;members:TreeMember[];rels:TreeRel[];busy:boolean;onSave:(x:Record<string,unknown>)=>Promise<Record<string,unknown>|null>;onUpload:(id:string,file:File)=>Promise<void>;onClose:()=>void}){
  const[first,setFirst]=useState(member.first_name||"");
  const[last,setLast]=useState(member.last_name||"");
  const[label,setLabel]=useState(member.relation_label||"");
  const[birth,setBirth]=useState((member.birthday||"").slice(0,10));
  const[from,setFrom]=useState(member.id);
  const[to,setTo]=useState("");
  const[type,setType]=useState("پدر");
  useEffect(()=>{
    setFirst(member.first_name||"");
    setLast(member.last_name||"");
    setLabel(member.relation_label||"");
    setBirth((member.birthday||"").slice(0,10));
    setFrom(member.id);
  },[member]);
  const mine=rels.filter(r=>r.from_member_id===member.id||r.to_member_id===member.id);
  const names=new Map(members.map(m=>[m.id,memberName(m)]));
  return <section className="premiumPanel treeSheet">
    <span className="eyebrow">ویرایش عضو</span>
    <h2>{memberName(member)}</h2>
    <div className="treePhotoRow">
      {member.avatar_url?<img src={member.avatar_url} alt=""/>:<span className="ph"><Icon name="profile"/></span>}
      <label className="primaryCta">تغییر عکس
        <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)void onUpload(member.id,f);e.currentTarget.value=""}}/>
      </label>
      {member.avatar_url&&<button disabled={busy} onClick={()=>void onSave({action:"member.photo.remove",memberId:member.id})}>حذف عکس</button>}
    </div>
    <div className="treeFields">
      <input value={first} onChange={e=>setFirst(e.target.value)} placeholder="نام"/>
      <input value={last} onChange={e=>setLast(e.target.value)} placeholder="نام خانوادگی"/>
      <input value={label} onChange={e=>setLabel(e.target.value)} placeholder="نسبت"/>
      <input type="date" value={birth} onChange={e=>setBirth(e.target.value)}/>
      <button className="adminSave" disabled={busy} onClick={()=>void onSave({action:"member.update",memberId:member.id,firstName:first,lastName:last,displayName:[first,last].filter(Boolean).join(" "),relationLabel:label,birthday:birth||null})}>ذخیره مشخصات</button>
    </div>
    <h3>نسبت‌ها</h3>
    {mine.map(r=><div className="dashboardCard relationRow" key={r.id} style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:8,alignItems:"center"}}>
      <span>{names.get(r.from_member_id)} ← {r.relation_type} → {names.get(r.to_member_id)}</span>
      <button className="treeDanger" disabled={busy} onClick={()=>{if(window.confirm("این رابطه حذف شود؟"))void onSave({action:"relation.delete",relationId:r.id})}}>حذف</button>
    </div>)}
    <div className="treeFields" style={{marginTop:10}}>
      <select value={from} onChange={e=>setFrom(e.target.value)}>{members.map(m=><option key={m.id} value={m.id}>{memberName(m)}</option>)}</select>
      <select value={type} onChange={e=>setType(e.target.value)}>{RELATION_TYPES.map(x=><option key={x}>{x}</option>)}</select>
      <select value={to} onChange={e=>setTo(e.target.value)}><option value="">عضو مقابل</option>{members.filter(m=>m.id!==from).map(m=><option key={m.id} value={m.id}>{memberName(m)}</option>)}</select>
      <button className="adminSave" disabled={busy||!to} onClick={()=>void onSave({action:"relation.save",fromMemberId:from,toMemberId:to,relationType:type})}>ثبت نسبت</button>
    </div>
    <div className="treeActions">
      {isTreeOnlyMember(member)&&<button className="treeDanger" disabled={busy} onClick={()=>{if(window.confirm("این عضو از شجره‌نامه حذف شود؟"))void onSave({action:"member.delete",memberId:member.id})}}>حذف عضو</button>}
      <button onClick={onClose}>بستن</button>
    </div>
  </section>;
}
