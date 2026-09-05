"use client";
import {FormEvent,PointerEvent,TouchEvent,useCallback,useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import {Icon} from "../../ui";
import {
  isTreeOnlyMember,
  layoutFamilyTree,
  memberName,
  searchMembers,
  type TreeMember,
  type TreeRel,
} from "@/lib/familyTree";
import "./tree.css";

type Sheet="view"|"edit"|"add"|"pick"|"actions"|null;
const errText:Record<string,string>={
  admin_required:"فقط مدیر یا مؤسس خانواده می‌تواند شجره را ویرایش کند.",
  self_relation:"نسبت با خود فرد مجاز نیست.",
  self_parent:"هیچ‌کس نمی‌تواند پدر یا مادر خودش باشد.",
  self_child:"هیچ‌کس نمی‌تواند فرزند خودش باشد.",
  self_spouse:"نمی‌توان همسر خود فرد را ثبت کرد.",
  self_sibling:"نمی‌توان خواهر یا برادر خود فرد را ثبت کرد.",
  parent_cycle:"این نسبت حلقه نسلی می‌سازد و رد شد.",
  duplicate_spouse:"پیوند همسری تکراری است.",
  duplicate_parent:"این والد قبلاً ثبت شده.",
  duplicate_sibling:"این نسبت خواهر/برادری تکراری است.",
  duplicate_relation:"این ارتباط قبلاً ثبت شده.",
  linked_member:"عضو متصل به بله از شجره حذف نمی‌شود.",
  name_required:"نام لازم است.",
  invalid_link:"اتصال فقط از فرد دستی به عضو ثبت‌شده ممکن است.",
};

function ageFrom(birthday?:string|null){
  if(!birthday)return "";
  const d=new Date(`${birthday}T00:00:00`);
  if(Number.isNaN(d.getTime()))return "";
  const n=new Date();
  let age=n.getFullYear()-d.getFullYear();
  if(n.getMonth()<d.getMonth()||(n.getMonth()===d.getMonth()&&n.getDate()<d.getDate()))age-=1;
  return age>=0?`${age} سال`:"";
}

export default function TreePage(){
  const[members,setMembers]=useState<TreeMember[]>([]);
  const[rels,setRels]=useState<TreeRel[]>([]);
  const[canManage,setCanManage]=useState(false);
  const[busy,setBusy]=useState(false);
  const[msg,setMsg]=useState("");
  const[loading,setLoading]=useState(true);
  const[sheet,setSheet]=useState<Sheet>("view");
  const[selected,setSelected]=useState("");
  const[editing,setEditing]=useState(false);
  const[scale,setScale]=useState(1);
  const[pan,setPan]=useState({x:0,y:0});
  const[links,setLinks]=useState<{profileId?:string|null;legendId?:string|null;memorialId?:string|null}|null>(null);
  const drag=useRef<{x:number;y:number;px:number;py:number;moved:boolean}|null>(null);
  const pinch=useRef<{dist:number;scale:number}|null>(null);
  const session=()=>sessionStorage.getItem("familybot.session")||"";
  const load=useCallback(async(memberId?:string)=>{
    const s=session();if(!s){setLoading(false);setMsg("برای دیدن شجره، Mini App را از بله باز کن.");return}
    const q=memberId?`?memberId=${encodeURIComponent(memberId)}`:"";
    const r=await fetch(`/api/family/tree${q}`,{headers:{authorization:`Bearer ${s}`},cache:"no-store"});
    const d=await r.json();
    if(d.ok){setMembers(d.members||[]);setRels(d.relationships||[]);setCanManage(Boolean(d.canManage));if(d.links)setLinks(d.links)}
    setLoading(false);
  },[]);
  useEffect(()=>{void load()},[load]);
  const layout=useMemo(()=>layoutFamilyTree(members,rels),[members,rels]);
  const current=members.find(m=>m.id===selected)||null;
  async function json(body:Record<string,unknown>){
    const s=session();if(!s)return null;
    if(busy)return null;
    setBusy(true);setMsg("");
    try{
      const r=await fetch("/api/family/tree",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${s}`},body:JSON.stringify(body)});
      const d=await r.json();
      if(!r.ok||!d.ok)throw new Error(d.error||"tree_failed");
      setMsg(body.action==="member.delete"?"فرد دستی از شجره جدا شد.":"شجره‌نامه به‌روزرسانی شد.");
      await load(selected);
      return d as Record<string,unknown>;
    }catch(e){
      const key=e instanceof Error?e.message:"";
      setMsg(errText[key]||"ثبت ارتباط انجام نشد.");
      return null;
    }finally{setBusy(false)}
  }
  async function upload(memberId:string,file:File){
    const s=session();if(!s)return;
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)){setMsg("فرمت این عکس پشتیبانی نمی‌شود. از JPG، PNG یا WebP استفاده کنید.");return}
    if(file.size>4*1024*1024){setMsg("حجم فایل بیشتر از ۴ مگابایت است.");return}
    setBusy(true);setMsg("");
    try{
      const form=new FormData();form.set("memberId",memberId);form.set("file",file);
      const r=await fetch("/api/family/tree",{method:"POST",headers:{authorization:`Bearer ${s}`},body:form});
      const d=await r.json();if(!r.ok||!d.ok)throw new Error();
      setMsg("عکس ذخیره شد.");await load(selected);
    }catch{setMsg("آپلود عکس انجام نشد.")}
    finally{setBusy(false)}
  }
  function fit(){
    const box=document.querySelector(".treeViewport")?.clientWidth||320;
    const next=Math.max(.55,Math.min(1.15,box/(layout.width+24)));
    setScale(next);setPan({x:0,y:0});
  }
  function onPointerDown(e:PointerEvent<HTMLDivElement>){
    if((e.target as HTMLElement).closest(".treeNode"))return;
    drag.current={x:pan.x,y:pan.y,px:e.clientX,py:e.clientY,moved:false};
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e:PointerEvent<HTMLDivElement>){
    if(!drag.current)return;
    const dx=e.clientX-drag.current.px,dy=e.clientY-drag.current.py;
    if(Math.abs(dx)+Math.abs(dy)>8)drag.current.moved=true;
    setPan({x:drag.current.x+dx,y:drag.current.y+dy});
  }
  function onTouchStart(e:TouchEvent<HTMLDivElement>){
    if(e.touches.length===2){
      const a=e.touches[0],b=e.touches[1];
      pinch.current={dist:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),scale};
    }
  }
  function onTouchMove(e:TouchEvent<HTMLDivElement>){
    if(e.touches.length===2&&pinch.current){
      const a=e.touches[0],b=e.touches[1];
      const dist=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
      setScale(Math.max(.5,Math.min(1.6,pinch.current.scale*(dist/pinch.current.dist))));
    }
  }
  function openMember(id:string){
    if(drag.current?.moved)return;
    setSelected(id);setSheet(editing&&canManage?"actions":"view");void load(id);
  }
  return <main className="appShell treePage">
    <div className="ambient ambientA"/><div className="starField"/>
    <header className="appHeader">
      <Link className="roundButton" href="/">←</Link>
      <div className="wordmark"><b>شجره‌نامه</b><span>{editing?"حالت ویرایش":"درخت خانواده"}</span></div>
      <span className="profileAvatar"><Icon name="tree"/></span>
    </header>
    {msg&&<div className="adminNotice">{msg}</div>}
    <div className="treeToolbar">
      <button className={!editing?"on":""} onClick={()=>{setEditing(false);setSheet("view")}}>نمایش</button>
      {canManage&&<button className={editing?"on":""} onClick={()=>setEditing(true)}>ویرایش</button>}
      {canManage&&<button className="treeAdd" onClick={()=>setSheet("add")}>افزودن فرد</button>}
      <button onClick={()=>setScale(s=>Math.max(.5,Number((s-.12).toFixed(2))))} aria-label="کوچک">−</button>
      <button onClick={()=>setScale(s=>Math.min(1.6,Number((s+.12).toFixed(2))))} aria-label="بزرگ">+</button>
      <button onClick={fit}>جا شدن</button>
      <button onClick={()=>{setScale(1);setPan({x:0,y:0})}}>بازنشانی</button>
    </div>
    {loading?<section className="premiumPanel treeEmpty">در حال بارگذاری شجره‌نامه…</section>
      :!members.length
        ? <section className="premiumPanel treeEmpty">
            <Icon name="tree" size={36}/>
            <h2>هنوز شجره‌نامه‌ای ساخته نشده</h2>
            <p>اولین عضو خانواده را اضافه کنید.</p>
            {canManage&&<button className="primaryCta" onClick={()=>setSheet("add")}>افزودن فرد</button>}
          </section>
        : <div className="treeViewport" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={()=>{drag.current=null}} onTouchStart={onTouchStart} onTouchMove={onTouchMove}>
            <div className="treeStage" style={{transform:`translate(${pan.x}px,${pan.y}px) scale(${scale})`}}>
              <svg className="treeArt" viewBox={`0 0 ${layout.width} ${layout.height}`} width={layout.width} height={layout.height}>
                <defs>
                  <linearGradient id="bark" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c48a3a"/><stop offset="100%" stopColor="#5a3112"/></linearGradient>
                  <linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f3d08a"/><stop offset="100%" stopColor="#8a5cff"/></linearGradient>
                </defs>
                {layout.branches.filter(b=>b.kind==="root").map((b,i)=><path key={`r${i}`} d={b.d} fill={i===0?"url(#bark)":"none"} stroke={i?"#c49a5a":"none"} strokeWidth={i?3:0} opacity=".9"/>)}
                {layout.branches.filter(b=>b.kind==="parent").map((b,i)=><path key={`p${i}`} d={b.d} fill="none" stroke="url(#leaf)" strokeWidth="3"/>)}
                {layout.branches.filter(b=>b.kind==="spouse").map((b,i)=><path key={`s${i}`} d={b.d} fill="none" stroke="#ffd27a" strokeWidth="2.4"/>)}
              </svg>
              {layout.nodes.map(n=>(
                <button key={n.member.id} className={`treeNode${selected===n.member.id?" on":""}${n.member.death_date?" gone":""}`} style={{left:n.x,top:n.y}} onClick={()=>openMember(n.member.id)}>
                  <div className="treeAvatar">{n.member.avatar_url?<img src={n.member.avatar_url} alt=""/>:<Icon name="profile" size={22}/>}</div>
                  <b>{memberName(n.member)}</b>
                  <small>{n.member.relation_label||ageFrom(n.member.birthday)||(isTreeOnlyMember(n.member)?"ثبت دستی":"")}</small>
                </button>
              ))}
            </div>
          </div>}
    {sheet==="add"&&canManage&&<AddSheet members={members} busy={busy} onSave={json} onPickExisting={()=>setSheet("pick")} onCancel={()=>setSheet("view")}/>}
    {sheet==="pick"&&canManage&&<PickSheet members={members} rels={rels} onPick={id=>{setSelected(id);setSheet("actions")}} onCancel={()=>setSheet("add")}/>}
    {sheet==="actions"&&canManage&&current&&<ActionSheet member={current} members={members} busy={busy} onSave={json} onEdit={()=>setSheet("edit")} onClose={()=>setSheet("view")}/>}
    {sheet==="edit"&&canManage&&current&&<EditSheet member={current} members={members} rels={rels} busy={busy} onSave={json} onUpload={upload} onClose={()=>setSheet("view")}/>}
    {sheet==="view"&&current&&<section className="premiumPanel treeSheet">
      <span className="eyebrow">برگه فرد</span>
      <h2>{memberName(current)}</h2>
      <p>{current.relation_label||(isTreeOnlyMember(current)?"فرد دستی":"عضو خانواده")}{ageFrom(current.birthday)?` · ${ageFrom(current.birthday)}`:""}{current.death_date?` · درگذشت ${current.death_date}`:""}</p>
      <div className="treeLegacyLinks">
        <Link href={`/section/legacy/people${links?.profileId?`/${links.profileId}`:""}`}>معرفی اعضا</Link>
        <Link href="/section/legacy/legends">چهره‌های ماندگار</Link>
        {current.death_date||links?.memorialId?<Link href={links?.memorialId?`/section/legacy/memorials/${links.memorialId}`:"/section/legacy/memorials"}>آسمانی‌ها</Link>:null}
        <Link href="/section/legacy/gallery">تصاویر</Link>
        <Link href="/section/legacy/journal">خاطرات</Link>
        <Link href="/section/legacy/encyclopedia">دانشنامه</Link>
      </div>
      {canManage&&editing&&<button className="primaryCta" onClick={()=>setSheet("actions")}>اقدامات ویرایش</button>}
    </section>}
  </main>;
}

function AddSheet({members,busy,onSave,onPickExisting,onCancel}:{members:TreeMember[];busy:boolean;onSave:(x:Record<string,unknown>)=>Promise<Record<string,unknown>|null>;onPickExisting:()=>void;onCancel:()=>void}){
  const[tab,setTab]=useState<"choose"|"manual">("choose");
  const[first,setFirst]=useState(""),[last,setLast]=useState(""),[label,setLabel]=useState(""),[birth,setBirth]=useState(""),[death,setDeath]=useState(""),[gender,setGender]=useState("");
  function submit(e:FormEvent){
    e.preventDefault();
    void onSave({action:"member.create",firstName:first,lastName:last,displayName:[first,last].filter(Boolean).join(" "),relationLabel:label,birthday:birth||null,deathDate:death||null,gender:gender||null}).then(d=>{if(d)onCancel()});
  }
  return <section className="premiumPanel treeSheet">
    <span className="eyebrow">افزودن فرد</span>
    <h2>چگونه اضافه شود؟</h2>
    <div className="treeChoice">
      <button type="button" className={tab==="choose"?"on":""} onClick={()=>{setTab("choose");onPickExisting()}}>انتخاب از اعضای خانواده</button>
      <button type="button" className={tab==="manual"?"on":""} onClick={()=>setTab("manual")}>ثبت فرد به‌صورت دستی</button>
    </div>
    {tab==="manual"&&<form onSubmit={submit}>
      <label>نام<input value={first} onChange={e=>setFirst(e.target.value)} required/></label>
      <label>نام خانوادگی<input value={last} onChange={e=>setLast(e.target.value)}/></label>
      <label>نسبت (اختیاری)<input value={label} onChange={e=>setLabel(e.target.value)}/></label>
      <label>جنسیت (برای نمایش)
        <select value={gender} onChange={e=>setGender(e.target.value)}><option value="">نامشخص</option><option value="male">مرد</option><option value="female">زن</option></select>
      </label>
      <label>تاریخ تولد (اختیاری)<input type="date" value={birth} onChange={e=>setBirth(e.target.value)}/></label>
      <label>تاریخ فوت (اختیاری)<input type="date" value={death} onChange={e=>setDeath(e.target.value)}/></label>
      <p className="treeHint">فرمت‌های مجاز عکس بعد از ثبت: JPG، PNG، WebP — حداکثر ۴ مگابایت</p>
      {members.length===0?<p className="treeHint">این فرد می‌تواند ریشه شجره باشد.</p>:null}
      <div className="treeActions">
        <button className="adminSave" disabled={busy||!first.trim()}>ثبت فرد دستی</button>
        <button type="button" onClick={onCancel}>انصراف</button>
      </div>
    </form>}
  </section>;
}

function PickSheet({members,rels,onPick,onCancel}:{members:TreeMember[];rels:TreeRel[];onPick:(id:string)=>void;onCancel:()=>void}){
  const[q,setQ]=useState("");
  const connected=new Set(rels.flatMap(r=>[r.from_member_id,r.to_member_id]));
  const list=searchMembers(members,q);
  return <section className="premiumPanel treeSheet">
    <span className="eyebrow">اعضای خانواده</span>
    <h2>انتخاب از اعضای خانواده</h2>
    <input value={q} onChange={e=>setQ(e.target.value)} placeholder="جستجوی نام"/>
    <div className="treePickList">
      {list.map(m=><button key={m.id} className="treePick" onClick={()=>onPick(m.id)}>
        <span className="treeAvatar sm">{m.avatar_url?<img src={m.avatar_url} alt=""/>:<Icon name="profile" size={18}/>}</span>
        <span><b>{memberName(m)}</b><small>{m.relation_label||""} · {connected.has(m.id)?"متصل به شجره":isTreeOnlyMember(m)?"ثبت دستی":"عضو بله"}</small></span>
      </button>)}
    </div>
    <button onClick={onCancel}>بازگشت</button>
  </section>;
}

function ActionSheet({member,members,busy,onSave,onEdit,onClose}:{member:TreeMember;members:TreeMember[];busy:boolean;onSave:(x:Record<string,unknown>)=>Promise<Record<string,unknown>|null>;onEdit:()=>void;onClose:()=>void}){
  const[kind,setKind]=useState<"پدر"|"مادر"|"همسر"|"فرزند"|"برادر"|"">("");
  const[target,setTarget]=useState("");
  const[make,setMake]=useState(false);
  const[first,setFirst]=useState("");
  async function apply(){
    let id=target;
    if(make){
      const created=await onSave({action:"member.create",firstName:first,displayName:first,relationLabel:kind});
      id=created&&typeof created.memberId==="string"?created.memberId:"";
    }
    if(!id||!kind)return;
    if(kind==="پدر"||kind==="مادر")await onSave({action:"relation.save",fromMemberId:id,toMemberId:member.id,relationType:kind});
    else if(kind==="فرزند")await onSave({action:"relation.save",fromMemberId:member.id,toMemberId:id,relationType:"فرزند"});
    else if(kind==="همسر")await onSave({action:"relation.save",fromMemberId:member.id,toMemberId:id,relationType:"همسر"});
    else await onSave({action:"relation.sibling",fromMemberId:member.id,toMemberId:id});
    setKind("");setTarget("");setMake(false);setFirst("");
  }
  return <section className="premiumPanel treeSheet">
    <span className="eyebrow">اقدامات</span>
    <h2>{memberName(member)}</h2>
    <div className="treeActions">
      <button onClick={onEdit}>ویرایش فرد</button>
      {(["پدر","مادر","همسر","فرزند","برادر"] as const).map(k=><button key={k} className={kind===k?"on":""} onClick={()=>setKind(k)}>{k==="برادر"?"افزودن خواهر/برادر":`افزودن ${k}`}</button>)}
      <button onClick={onClose}>مشاهده جزئیات</button>
    </div>
    {kind&&<>
      <p className="treeHint">{kind==="برادر"?"خواهر یا برادر را انتخاب یا ثبت کن.":`برای افزودن ${kind} یک عضو موجود را انتخاب کن یا فرد دستی بساز.`}</p>
      <label className="treeCheck"><input type="checkbox" checked={make} onChange={e=>setMake(e.target.checked)}/> ثبت فرد به‌صورت دستی</label>
      {make?<input value={first} onChange={e=>setFirst(e.target.value)} placeholder="نام فرد جدید"/>:
        <select value={target} onChange={e=>setTarget(e.target.value)}><option value="">انتخاب از اعضای خانواده</option>{members.filter(m=>m.id!==member.id).map(m=><option key={m.id} value={m.id}>{memberName(m)}</option>)}</select>}
      <button className="adminSave" disabled={busy||(make?!first.trim():!target)} onClick={()=>void apply()}>ثبت ارتباط</button>
    </>}
  </section>;
}

function EditSheet({member,members,rels,busy,onSave,onUpload,onClose}:{member:TreeMember;members:TreeMember[];rels:TreeRel[];busy:boolean;onSave:(x:Record<string,unknown>)=>Promise<Record<string,unknown>|null>;onUpload:(id:string,file:File)=>Promise<void>;onClose:()=>void}){
  const[first,setFirst]=useState(member.first_name||"");
  const[last,setLast]=useState(member.last_name||"");
  const[label,setLabel]=useState(member.relation_label||"");
  const[birth,setBirth]=useState((member.birthday||"").slice(0,10));
  const[death,setDeath]=useState((member.death_date||"").slice(0,10));
  const[linkTo,setLinkTo]=useState("");
  useEffect(()=>{
    setFirst(member.first_name||"");setLast(member.last_name||"");setLabel(member.relation_label||"");
    setBirth((member.birthday||"").slice(0,10));setDeath((member.death_date||"").slice(0,10));
  },[member]);
  const mine=rels.filter(r=>r.from_member_id===member.id||r.to_member_id===member.id);
  const names=new Map(members.map(m=>[m.id,memberName(m)]));
  const registered=members.filter(m=>!isTreeOnlyMember(m)&&m.id!==member.id);
  return <section className="premiumPanel treeSheet">
    <span className="eyebrow">ویرایش فرد</span>
    <h2>{memberName(member)}</h2>
    <div className="treePhotoRow">
      {member.avatar_url?<img src={member.avatar_url} alt=""/>:<span className="ph"><Icon name="profile"/></span>}
      <label className="primaryCta">تغییر عکس
        <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)void onUpload(member.id,f);e.currentTarget.value=""}}/>
      </label>
    </div>
    <p className="treeHint">فرمت‌های مجاز عکس: JPG، PNG، WebP — حداکثر حجم ۴ مگابایت</p>
    <div className="treeFields">
      <input value={first} onChange={e=>setFirst(e.target.value)} placeholder="نام"/>
      <input value={last} onChange={e=>setLast(e.target.value)} placeholder="نام خانوادگی"/>
      <input value={label} onChange={e=>setLabel(e.target.value)} placeholder="نسبت"/>
      <input type="date" value={birth} onChange={e=>setBirth(e.target.value)}/>
      <input type="date" value={death} onChange={e=>setDeath(e.target.value)}/>
      <button className="adminSave" disabled={busy} onClick={()=>void onSave({action:"member.update",memberId:member.id,firstName:first,lastName:last,displayName:[first,last].filter(Boolean).join(" "),relationLabel:label,birthday:birth||null,deathDate:death||null})}>ذخیره مشخصات</button>
    </div>
    <h3>حذف ارتباط از شجره</h3>
    {mine.map(r=><div className="relationRow" key={r.id}>
      <span>{names.get(r.from_member_id)} · {r.relation_type} · {names.get(r.to_member_id)}</span>
      <button className="treeDanger" disabled={busy} onClick={()=>{if(window.confirm("فقط این ارتباط حذف شود؟ حساب کاربری پاک نمی‌شود."))void onSave({action:"relation.delete",relationId:r.id})}}>حذف ارتباط</button>
    </div>)}
    {isTreeOnlyMember(member)&&registered.length>0&&<>
      <h3>اتصال به عضو خانواده</h3>
      <p className="treeHint">فرد دستی را به عضو بله وصل می‌کند؛ روابط حفظ می‌شوند.</p>
      <select value={linkTo} onChange={e=>setLinkTo(e.target.value)}><option value="">انتخاب عضو ثبت‌شده</option>{registered.map(m=><option key={m.id} value={m.id}>{memberName(m)}</option>)}</select>
      <button disabled={busy||!linkTo} onClick={()=>void onSave({action:"member.link",offlineId:member.id,registeredId:linkTo})}>اتصال بدون حذف تاریخچه</button>
    </>}
    <div className="treeActions">
      {isTreeOnlyMember(member)&&<button className="treeDanger" disabled={busy} onClick={()=>{if(window.confirm("فرد دستی از شجره حذف شود؟ عضو بله حذف نمی‌شود."))void onSave({action:"member.delete",memberId:member.id})}}>حذف فرد دستی</button>}
      <button onClick={onClose}>بستن</button>
    </div>
  </section>;
}
