"use client";
import {useCallback,useEffect,useState} from "react";
import {useParams} from "next/navigation";
import {legacyAct,legacyGet} from "../../legacyClient";
import {Comments,Engage,LegacyChrome} from "../../LegacyChrome";

export default function JournalDetail(){
  const {id}=useParams<{id:string}>();
  const[d,setD]=useState<any>(null),[err,setErr]=useState("");
  const load=useCallback(()=>{if(!id)return;legacyGet("journalItem",{id:String(id)}).then(setD).catch(e=>setErr(e instanceof Error?e.message:""))},[id]);
  useEffect(()=>load(),[load]);
  if(err||!d)return <LegacyChrome title="دلنوشته"><div className="legacyEmpty">{err?"این نوشته در دسترس نیست.":"در حال بارگذاری..."}</div></LegacyChrome>;
  const i=d.item;
  return <LegacyChrome title={i.title} subtitle={i.kind} icon="gift">
    <article className="premiumPanel" style={{padding:22}}><div className="legacyArticle">{i.body}</div></article>
    {d.me?.isAdmin&&i.moderation_status!=="approved"?<button className="primaryCta" onClick={()=>void legacyAct("moderate",{targetType:"journal",id:i.id,status:"approved"}).then(load)}>تأیید نوشته</button>:null}
    <Engage targetType="journal" targetId={i.id} reactions={d.reactions} onDone={load}/>
    <Comments targetType="journal" targetId={i.id} items={d.comments} onDone={load}/>
  </LegacyChrome>;
}
