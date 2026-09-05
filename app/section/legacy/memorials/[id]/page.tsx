"use client";
import {FormEvent,useCallback,useEffect,useState} from "react";
import {useParams} from "next/navigation";
import {legacyAct,legacyGet} from "../../legacyClient";
import {Comments,Engage,LegacyChrome} from "../../LegacyChrome";

export default function MemorialDetail(){
  const {id}=useParams<{id:string}>();
  const[d,setD]=useState<any>(null),[err,setErr]=useState(""),[msg,setMsg]=useState("");
  const load=useCallback(()=>{if(!id)return;legacyGet("memorial",{id:String(id)}).then(setD).catch(e=>setErr(e instanceof Error?e.message:""))},[id]);
  useEffect(()=>load(),[load]);
  if(err||!d)return <LegacyChrome title="آسمانی‌ها" memorial><div className="legacyEmpty">{err?"این یادبود در دسترس نیست.":"در حال بارگذاری..."}</div></LegacyChrome>;
  const i=d.item;
  async function candle(){try{await legacyAct("memorial.candle",{id:i.id});setMsg("شمع روشن شد. یادش گرامی.");load()}catch(e){setMsg(e instanceof Error?e.message:"")}}
  async function send(e:FormEvent<HTMLFormElement>){e.preventDefault();const body=String(new FormData(e.currentTarget).get("body")||"");try{await legacyAct("memorial.message",{id:i.id,body});(e.target as HTMLFormElement).reset();load()}catch(err){setMsg(err instanceof Error?err.message:"")}}
  return <LegacyChrome title={i.name} subtitle="آسمانی‌ها" memorial tone="cyan">
    {i.portrait_url?<img src={i.portrait_url} alt="" style={{width:"100%",height:260,objectFit:"cover",borderRadius:26,filter:"saturate(.86)"}}/>:null}
    <p style={{textAlign:"center",color:"#c9d0e4"}}>{[i.birth_date,i.death_date].filter(Boolean).join("  ·  ")}</p>
    {i.biography?<article className="premiumPanel legacyMemorial" style={{padding:18}}><div className="legacyArticle">{i.biography}</div></article>:null}
    {i.quotes?<blockquote className="premiumPanel" style={{padding:16,marginTop:12,fontStyle:"italic"}}>{i.quotes}</blockquote>:null}
    {i.cemetery_info?<p style={{color:"#b7bfd4"}}>آرامگاه: {i.cemetery_info}</p>:null}
    <button className="legacyCandle" onClick={()=>void candle()} disabled={d.myCandle}>{d.myCandle?"شمع امروز شما روشن است":"روشن کردن شمع"} · {d.candlesToday||0}</button>
    {i.member_id?<a className="ghostCta" href="/section/tree" style={{display:"inline-flex",marginTop:10}}>مشاهده در شجره‌نامه</a>:null}
    <section className="premiumPanel legacyMemorial" style={{padding:16,marginTop:14}}>
      <h2>پیام‌های یادبود</h2>
      {(d.messages||[]).map((m:any)=><p key={m.id} className="legacyArticle">{m.body}</p>)}
      <form className="legacyForm" onSubmit={send}><textarea name="body" rows={3} placeholder="یادبودی محترمانه بنویس..." required/><button className="adminSave">ثبت پیام</button></form>
    </section>
    <Engage targetType="memorial" targetId={i.id} reactions={d.reactions} onDone={load}/>
    {d.me?.isAdmin&&i.moderation_status!=="approved"?<button className="primaryCta" onClick={()=>void legacyAct("moderate",{targetType:"memorial",id:i.id,status:"approved"}).then(load)}>تأیید یادبود</button>:null}
    <Comments targetType="memorial" targetId={i.id} items={d.comments} onDone={load}/>
    {msg&&<div className="adminNotice">{msg}</div>}
  </LegacyChrome>;
}
