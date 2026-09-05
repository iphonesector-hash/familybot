"use client";
import {useCallback,useEffect,useState} from "react";
import {useParams} from "next/navigation";
import {legacyAct,legacyGet} from "../../legacyClient";
import {Comments,Engage,LegacyChrome} from "../../LegacyChrome";

export default function MediaDetail(){
  const {id}=useParams<{id:string}>();
  const[d,setD]=useState<any>(null),[err,setErr]=useState(""),[zoom,setZoom]=useState(false);
  const load=useCallback(()=>{if(!id)return;legacyGet("media",{id:String(id)}).then(setD).catch(e=>setErr(e instanceof Error?e.message:""))},[id]);
  useEffect(()=>load(),[load]);
  if(err||!d)return <LegacyChrome title="گالری"><div className="legacyEmpty">{err?"این تصویر در دسترس نیست.":"در حال بارگذاری..."}</div></LegacyChrome>;
  const i=d.item;
  return <LegacyChrome title={i.title||"تصویر خانواده"} subtitle={i.taken_on||""} icon="memories" tone="blue">
    <button onClick={()=>setZoom(true)} style={{padding:0,border:0,background:"transparent",width:"100%"}}>
      {i.media_kind==="video"?<video src={i.media_url||""} controls playsInline preload="metadata" style={{width:"100%",borderRadius:22}}/>:<img src={i.media_url||""} alt="" style={{width:"100%",borderRadius:22,maxHeight:420,objectFit:"contain",background:"#000"}}/>}
    </button>
    {i.description?<p className="legacyArticle">{i.description}</p>:null}
    <div className="legacyMeta">{(d.tags||[]).map((t:any)=><span key={t.id} className="legacySoft"><a href={`/section/legacy/people?member=${t.id}`}>{t.name}</a>{d.me?.isAdmin||d.me?.memberId===i.uploader_member_id||d.me?.memberId===t.id?<button className="ghostCta" style={{minHeight:32,marginRight:6}} onClick={()=>void legacyAct("media.untag",{id:i.id,memberId:t.id}).then(load)}>حذف تگ</button>:null}</span>)}</div>
    <div style={{display:"flex",justifyContent:"space-between",marginTop:10}}>
      {d.prev?<a className="ghostCta" href={`/section/legacy/gallery/${d.prev.id}`}>قبلی</a>:<span/>}
      {d.next?<a className="ghostCta" href={`/section/legacy/gallery/${d.next.id}`}>بعدی</a>:null}
    </div>
    <Engage targetType="media" targetId={i.id} reactions={d.reactions} onDone={load}/>
    <Comments targetType="media" targetId={i.id} items={d.comments} onDone={load}/>
    {zoom?<div className="legacyViewer" onClick={()=>setZoom(false)}><div style={{textAlign:"left"}}><button className="roundButton" onClick={()=>setZoom(false)}>×</button></div>{i.media_kind==="video"?<video src={i.media_url||""} controls playsInline preload="metadata"/>:<img src={i.media_url||""} alt=""/>}<p>{i.title}</p></div>:null}
  </LegacyChrome>;
}
