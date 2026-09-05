"use client";
import {FormEvent,useCallback,useEffect,useState} from "react";
import {JOURNAL_KINDS} from "@/lib/familyLegacyPrivacy";
import {legacyAct,legacyGet} from "../legacyClient";
import {Empty,LegacyChrome} from "../LegacyChrome";

export default function JournalPage(){
  const[items,setItems]=useState<any[]>([]),[admin,setAdmin]=useState(false),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false);
  const load=useCallback(()=>{legacyGet("journal").then(d=>{setItems(d.items||[]);setAdmin(Boolean(d.me?.isAdmin))}).catch(()=>undefined)},[]);
  useEffect(()=>load(),[load]);
  async function save(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setMsg("");
    try{
      const f=new FormData(e.currentTarget);
      await legacyAct("journal.save",{title:f.get("title"),body:f.get("body"),kind:f.get("kind"),tags:String(f.get("tags")||"").split("،"),happened_on:f.get("happened_on")||null,happened_precision:f.get("happened_on")?"full":"unknown",visibility:f.get("visibility"),moderation_status:f.get("status")});
      setMsg("نوشته ذخیره شد.");(e.target as HTMLFormElement).reset();load();
    }catch(err){setMsg(err instanceof Error?err.message:"خطا")}finally{setBusy(false)}
  }
  return <LegacyChrome title="خاطرات و دلنوشته‌ها" subtitle="دفتر خانواده" icon="gift">
    <section style={{display:"grid",gap:12}}>{items.length?items.map(i=><a key={i.id} href={`/section/legacy/journal/${i.id}`} className="premiumPanel" style={{padding:16,display:"block"}}><small>{i.kind}</small><h2 style={{margin:"6px 0"}}>{i.title}</h2><p>{String(i.body||"").slice(0,160)}</p></a>):<Empty text="هنوز خاطره‌ای ثبت نشده"/>}</section>
    <section className="premiumPanel" style={{padding:16,marginTop:16}}>
      <h2>نوشتن</h2>
      <form className="legacyForm" onSubmit={save}>
        <input name="title" placeholder="عنوان" required/>
        <select name="kind" defaultValue="خاطره">{JOURNAL_KINDS.map(k=><option key={k}>{k}</option>)}</select>
        <textarea name="body" rows={8} placeholder="متن آرام و خوانا..." required/>
        <input name="tags" placeholder="برچسب‌ها"/>
        <label>تاریخ رویداد اگر دقیق است<input name="happened_on" type="date"/></label>
        <select name="visibility" defaultValue="family"><option value="family">خانواده</option><option value="close_family">بستگان نزدیک</option><option value="private">فقط خودم</option></select>
        <select name="status" defaultValue={admin?"approved":"pending"}><option value="draft">پیش‌نویس</option><option value="pending">ارسال برای تأیید</option>{admin?<option value="approved">انتشار</option>:null}</select>
        <button className="adminSave" disabled={busy}>ثبت نوشته</button>
      </form>
      {msg&&<div className="adminNotice">{msg}</div>}
    </section>
  </LegacyChrome>;
}
