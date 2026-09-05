"use client";
import {ReactNode} from "react";
import {Icon, IconName, IconOrb} from "../../ui";
import "./legacy.css";

export function LegacyChrome({title, subtitle, tone="gold", icon="family", memorial=false, children, extra}:{title:string;subtitle?:string;tone?:"violet"|"blue"|"pink"|"gold"|"cyan";icon?:IconName;memorial?:boolean;children:ReactNode;extra?:ReactNode}){
  return <main className="appShell">
    <div className="ambient ambientA"/><div className="starField"/>
    <header className="appHeader"><a className="roundButton" href="/section/legacy">←</a><div className="wordmark"><b>{title}</b><span>{subtitle||"خانواده ما"}</span></div><IconOrb name={icon} tone={tone}/></header>
    {extra}
    <div className={memorial?"legacyMemorial":undefined}>{children}</div>
  </main>;
}

export function Empty({text,cta,href}:{text:string;cta?:string;href?:string}){
  return <div className="legacyEmpty">{text}{href&&cta?<div style={{marginTop:10}}><a className="primaryCta" href={href}>{cta}</a></div>:null}</div>;
}

export function PrivacySelect({value,onChange}:{value:string;onChange:(v:string)=>void}){
  return <select value={value} onChange={e=>onChange(e.target.value)}>
    <option value="family">همه اعضای خانواده</option>
    <option value="close_family">بستگان نزدیک</option>
    <option value="private">فقط خودم</option>
    <option value="admins">مدیران خانواده</option>
  </select>;
}

export function StatusSelect({value,onChange,admin}:{value:string;onChange:(v:string)=>void;admin?:boolean}){
  return <select value={value} onChange={e=>onChange(e.target.value)}>
    <option value="draft">پیش‌نویس</option>
    <option value="pending">ارسال برای تأیید</option>
    {admin?<>
      <option value="approved">تأییدشده</option>
      <option value="rejected">رد شده</option>
      <option value="archived">بایگانی</option>
    </>:null}
  </select>;
}

export function Engage({targetType,targetId,reactions,onDone}:{targetType:string;targetId:string;reactions?:{counts:Record<string,number>};onDone?:()=>void}){
  const emojis=targetType==="memorial"?["❤️","🕊️"]:["❤️","👏","🥹","🕊️"];
  return <div style={{display:"flex",gap:8,flexWrap:"wrap",margin:"12px 0"}}>
    {emojis.map(e=><button key={e} className="ghostCta" style={{minWidth:64}} onClick={()=>void import("./legacyClient").then(m=>m.legacyAct("reaction.toggle",{targetType,targetId,emoji:e}).then(()=>onDone?.()).catch(()=>undefined))}>{e} {reactions?.counts?.[e]||""}</button>)}
  </div>;
}

export function Comments({targetType,targetId,items,onDone}:{targetType:string;targetId:string;items?:Array<{id:string;body:string;author?:string;created_at:string}>;onDone?:()=>void}){
  return <section className="premiumPanel" style={{padding:16,marginTop:14}}>
    <h2>گفتگوهای خانواده</h2>
    <div style={{display:"grid",gap:10,margin:"10px 0"}}>
      {items?.length?items.map(c=><article key={c.id}><b style={{fontSize:12}}>{c.author}</b><p style={{margin:"4px 0 0",lineHeight:1.8}}>{c.body}</p></article>):<p style={{color:"#b9b0cf"}}>هنوز نظری نوشته نشده.</p>}
    </div>
    <form className="legacyForm" onSubmit={e=>{e.preventDefault();const f=e.currentTarget;const body=String(new FormData(f).get("body")||"");void import("./legacyClient").then(m=>m.legacyAct("comment.add",{targetType,targetId,body}).then(()=>{f.reset();onDone?.()}).catch(()=>undefined))}}>
      <textarea name="body" rows={3} placeholder="چند خط محترمانه بنویس..." required/>
      <button className="adminSave">ارسال نظر</button>
    </form>
  </section>;
}
