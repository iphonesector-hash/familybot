"use client";
import {useCallback,useEffect,useState} from "react";
import {useParams} from "next/navigation";
import {legacyAct,legacyGet} from "../../legacyClient";
import {Comments,Engage,LegacyChrome} from "../../LegacyChrome";

export default function ArticleDetail(){
  const {id}=useParams<{id:string}>();
  const[d,setD]=useState<any>(null),[err,setErr]=useState("");
  const load=useCallback(()=>{if(!id)return;legacyGet("article",{id:String(id)}).then(setD).catch(e=>setErr(e instanceof Error?e.message:"not_found"))},[id]);
  useEffect(()=>load(),[load]);
  if(err)return <LegacyChrome title="دانشنامه"><div className="legacyEmpty">این مقاله در دسترس نیست یا هنوز تأیید نشده.</div></LegacyChrome>;
  if(!d)return <LegacyChrome title="دانشنامه"><div className="legacyEmpty">در حال بارگذاری...</div></LegacyChrome>;
  const a=d.article;
  return <LegacyChrome title={a.title} subtitle={a.category} extra={a.cover_url?<img src={a.cover_url} alt="" style={{width:"100%",height:180,objectFit:"cover",borderRadius:22,marginBottom:12}}/>:undefined}>
    <div className="legacyMeta"><span className="legacySoft">{a.category}</span>{(a.tags||[]).map((t:string)=><span className="legacySoft" key={t}>{t}</span>)}</div>
    <article className="premiumPanel" style={{padding:18,marginTop:12}}><div className="legacyArticle">{a.body}</div></article>
    {d.relatedMembers?.length?<section className="premiumPanel" style={{padding:14,marginTop:12}}><h2>اعضای مرتبط</h2>{d.relatedMembers.map((m:any)=><a key={m.id} href={`/section/tree`} className="legacySoft" style={{display:"inline-block",margin:4}}>{m.name}</a>)}</section>:null}
    {d.relatedArticles?.length?<section className="premiumPanel" style={{padding:14,marginTop:12}}><h2>مقالات مرتبط</h2>{d.relatedArticles.map((x:any)=><a key={x.id} href={`/section/legacy/encyclopedia/${x.id}`} style={{display:"block",marginTop:8}}>{x.title}</a>)}</section>:null}
    <Engage targetType="article" targetId={a.id} reactions={d.reactions} onDone={load}/>
    {d.me?.isAdmin&&a.moderation_status!=="approved"?<button className="primaryCta" onClick={()=>void legacyAct("moderate",{targetType:"article",id:a.id,status:"approved"}).then(load)}>تأیید انتشار</button>:null}
    <Comments targetType="article" targetId={a.id} items={d.comments} onDone={load}/>
  </LegacyChrome>;
}
