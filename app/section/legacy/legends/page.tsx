"use client";
import {FormEvent,useCallback,useEffect,useState} from "react";
import {legacyAct,legacyGet,uploadLegacyFile} from "../legacyClient";
import {Empty,LegacyChrome} from "../LegacyChrome";

export default function LegendsPage(){
  const[items,setItems]=useState<any[]>([]),[admin,setAdmin]=useState(false),[members,setMembers]=useState<any[]>([]),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false);
  const load=useCallback(()=>{legacyGet("legends").then(d=>{setItems(d.items||[]);setAdmin(Boolean(d.me?.isAdmin))});legacyGet("members").then(setMembers).catch(()=>undefined)},[]);
  useEffect(()=>load(),[load]);
  async function save(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setMsg("");
    try{
      const f=new FormData(e.currentTarget);let photo=String(f.get("photo")||"");
      const file=f.get("file");if(file instanceof File&&file.size)photo=(await uploadLegacyFile(file)).mediaRef;
      await legacyAct("legend.save",{full_name:f.get("full_name"),member_id:f.get("member_id")||null,occupation:f.get("occupation"),birth_info:f.get("birth_info"),biography:f.get("biography"),achievements:f.get("achievements"),why_important:f.get("why_important"),visibility:f.get("visibility"),moderation_status:f.get("status"),photo_url:photo||null,featured:admin&&f.get("featured")==="1"});
      setMsg("پرونده برای بررسی ثبت شد.");(e.target as HTMLFormElement).reset();load();
    }catch(err){setMsg(err instanceof Error?err.message:"خطا")}finally{setBusy(false)}
  }
  const shown=items.filter(i=>i.moderation_status==="approved"||admin||true);
  return <LegacyChrome title="چهره‌های ماندگار" subtitle="فقط با معرفی و تأیید" icon="trophy" tone="violet">
    <p style={{color:"#cbbba4",lineHeight:1.9}}>هیچ‌کس به‌صورت خودکار اینجا قرار نمی‌گیرد. معرفی دستی است و پس از تأیید مدیران دیده می‌شود.</p>
    <section className="dashboardGrid">{shown.length?shown.map(i=><a className="dashboardCard" href={`/section/legacy/legends/${i.id}`} key={i.id}><div><h2>{i.full_name}</h2><p>{i.occupation||i.why_important||"چهره خانواده"}{i.moderation_status!=="approved"?" · در انتظار تأیید":""}</p></div></a>):<Empty text="هنوز چهره ماندگاری تأیید نشده است."/>}</section>
    <section className="premiumPanel" style={{padding:16,marginTop:16}}>
      <h2>معرفی یک چهره</h2>
      <form className="legacyForm" onSubmit={save}>
        <input name="full_name" placeholder="نام کامل" required/>
        <select name="member_id" defaultValue=""><option value="">اتصال به شجره‌نامه (اختیاری)</option>{(Array.isArray(members)?members:[]).map((m:any)=><option key={m.id} value={m.id}>{m.name}</option>)}</select>
        <input name="occupation" placeholder="شغل یا نقش"/>
        <input name="birth_info" placeholder="اطلاعات تولد در صورت تمایل"/>
        <textarea name="why_important" rows={3} placeholder="چرا برای خانواده مهم است؟"/>
        <textarea name="achievements" rows={3} placeholder="دستاوردها"/>
        <textarea name="biography" rows={6} placeholder="زندگی‌نامه"/>
        <input name="file" type="file" accept="image/jpeg,image/png,image/webp"/>
        <select name="visibility" defaultValue="family"><option value="family">خانواده</option><option value="close_family">بستگان نزدیک</option><option value="private">فقط خودم</option></select>
        <select name="status" defaultValue="pending"><option value="draft">پیش‌نویس</option><option value="pending">ارسال برای تأیید</option>{admin?<option value="approved">تأیید و انتشار</option>:null}</select>
        {admin?<label><input type="checkbox" name="featured" value="1"/> نمایش ویژه</label>:null}
        <button className="adminSave" disabled={busy}>ثبت معرفی</button>
      </form>
      {msg&&<div className="adminNotice">{msg}</div>}
    </section>
  </LegacyChrome>;
}
