"use client";
import {useCallback,useEffect,useState} from "react";
import {useParams} from "next/navigation";
import {legacyGet} from "../../legacyClient";
import {Comments,Engage,LegacyChrome} from "../../LegacyChrome";

export default function PersonDetail(){
  const {id}=useParams<{id:string}>();
  const[d,setD]=useState<any>(null),[err,setErr]=useState("");
  const load=useCallback(()=>{if(!id)return;legacyGet("person",{id:String(id)}).then(setD).catch(e=>setErr(e instanceof Error?e.message:""))},[id]);
  useEffect(()=>load(),[load]);
  if(err||!d)return <LegacyChrome title="معرفی اعضا"><div className="legacyEmpty">{err?"این معرفی در دسترس تو نیست.":"در حال بارگذاری..."}</div></LegacyChrome>;
  const p=d.profile;
  const name=[p.first_name,p.last_name].filter(Boolean).join(" ")||d.member?.display_name||"عضو خانواده";
  return <LegacyChrome title={name} subtitle={p.relationship_label||"عضو خانواده"} icon="profile" tone="pink">
    {p.photo_url?<img src={p.photo_url} alt="" style={{width:"100%",height:220,objectFit:"cover",borderRadius:24}}/>:null}
    <section className="premiumPanel" style={{padding:16}}>
      {p.occupation?<p>شغل: {p.occupation}</p>:null}
      {p.city?<p>شهر: {p.city}</p>:null}
      {p.family_branch?<p>شاخه: {p.family_branch}</p>:null}
      {p.short_bio?<div className="legacyArticle">{p.short_bio}</div>:null}
    </section>
    {p.personal_story?<article className="premiumPanel" style={{padding:16,marginTop:12}}><h2>داستان</h2><div className="legacyArticle">{p.personal_story}</div></article>:null}
    <a className="primaryCta" href="/section/tree">شجره‌نامه</a>
    <Engage targetType="profile" targetId={p.id} reactions={d.reactions} onDone={load}/>
    <Comments targetType="profile" targetId={p.id} items={d.comments} onDone={load}/>
  </LegacyChrome>;
}
