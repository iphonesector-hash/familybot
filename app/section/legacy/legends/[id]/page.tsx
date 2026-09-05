"use client";
import {useCallback,useEffect,useState} from "react";
import {useParams} from "next/navigation";
import {legacyAct,legacyGet} from "../../legacyClient";
import {Comments,Engage,LegacyChrome} from "../../LegacyChrome";

export default function LegendDetail(){
  const {id}=useParams<{id:string}>();
  const[d,setD]=useState<any>(null),[err,setErr]=useState("");
  const load=useCallback(()=>{if(!id)return;legacyGet("legend",{id:String(id)}).then(setD).catch(e=>setErr(e instanceof Error?e.message:""))},[id]);
  useEffect(()=>load(),[load]);
  if(err||!d)return <LegacyChrome title="چهره‌های ماندگار"><div className="legacyEmpty">{err?"این پرونده در دسترس نیست.":"در حال بارگذاری..."}</div></LegacyChrome>;
  const i=d.item;
  return <LegacyChrome title={i.full_name} subtitle={i.occupation||"چهره ماندگار"} icon="trophy" tone="violet">
    {i.photo_url?<img src={i.photo_url} alt="" style={{width:"100%",height:220,objectFit:"cover",borderRadius:24}}/>:null}
    {i.why_important?<section className="premiumPanel" style={{padding:16,marginTop:12}}><h2>چرا برای خانواده مهم است</h2><p className="legacyArticle">{i.why_important}</p></section>:null}
    {i.biography?<article className="premiumPanel" style={{padding:16,marginTop:12}}><div className="legacyArticle">{i.biography}</div></article>:null}
    {i.achievements?<section className="premiumPanel" style={{padding:16,marginTop:12}}><h2>دستاوردها</h2><p className="legacyArticle">{i.achievements}</p></section>:null}
    {i.member_id?<a className="primaryCta" href="/section/tree">مشاهده در شجره‌نامه</a>:null}
    {d.me?.isAdmin&&i.moderation_status!=="approved"?<button className="primaryCta" onClick={()=>void legacyAct("moderate",{targetType:"legend",id:i.id,status:"approved"}).then(load)}>تأیید نمایش</button>:null}
    <Engage targetType="legend" targetId={i.id} reactions={d.reactions} onDone={load}/>
    <Comments targetType="legend" targetId={i.id} items={d.comments} onDone={load}/>
  </LegacyChrome>;
}
