"use client";
import {FormEvent,useCallback,useEffect,useState} from "react";
import {legacyAct,legacyGet,uploadLegacyFile} from "../legacyClient";
import {Empty,LegacyChrome} from "../LegacyChrome";

export default function MemorialsPage(){
  const[items,setItems]=useState<any[]>([]),[admin,setAdmin]=useState(false),[members,setMembers]=useState<any[]>([]),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false);
  const load=useCallback(()=>{legacyGet("memorials").then(d=>{setItems(d.items||[]);setAdmin(Boolean(d.me?.isAdmin))});legacyGet("members").then(setMembers).catch(()=>undefined)},[]);
  useEffect(()=>load(),[load]);
  async function save(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setMsg("");
    try{
      const f=new FormData(e.currentTarget);let portrait=String(f.get("portrait")||"");
      const file=f.get("file");if(file instanceof File&&file.size)portrait=(await uploadLegacyFile(file)).mediaRef;
      await legacyAct("memorial.save",{
        name:f.get("name"),member_id:f.get("member_id")||null,biography:f.get("biography"),personal_history:f.get("personal_history"),quotes:f.get("quotes"),cemetery_info:f.get("cemetery_info")||null,
        birth_date:f.get("birth_date")||null,death_date:f.get("death_date")||null,
        birth_precision:f.get("birth_date")?"full":"unknown",death_precision:f.get("death_date")?"full":"unknown",
        visibility:f.get("visibility"),moderation_status:f.get("status"),portrait_url:portrait||null
      });
      setMsg("یادبود ثبت شد.");(e.target as HTMLFormElement).reset();load();
    }catch(err){setMsg(err instanceof Error?err.message:"خطا")}finally{setBusy(false)}
  }
  return <LegacyChrome title="آسمانی‌ها" subtitle="یادبود آرام خانواده" memorial icon="family" tone="cyan">
    <section className="premiumPanel legacyMemorial" style={{padding:18}}>
      <p style={{lineHeight:2,color:"#d5d8e8",margin:0}}>اینجا جای بازی، سکه و جایزه نیست. فقط یاد، احترام و سکوت.</p>
    </section>
    <section className="dashboardGrid" style={{marginTop:14}}>{items.length?items.map(i=><a className="dashboardCard" href={`/section/legacy/memorials/${i.id}`} key={i.id}><div><h2>{i.name}</h2><p>{[i.birth_date,i.death_date].filter(Boolean).join(" — ")||"یادبود خانواده"}</p></div></a>):<Empty text="هنوز یادبودی ثبت نشده."/>}</section>
    <section className="premiumPanel legacyMemorial" style={{padding:16,marginTop:16}}>
      <h2>افزودن یادبود</h2>
      <form className="legacyForm" onSubmit={save}>
        <input name="name" placeholder="نام" required/>
        <select name="member_id" defaultValue=""><option value="">اتصال به شجره‌نامه (اختیاری)</option>{(Array.isArray(members)?members:[]).map((m:any)=><option key={m.id} value={m.id}>{m.name}</option>)}</select>
        <label>تاریخ تولد (فقط اگر دقیق است)<input name="birth_date" type="date"/></label>
        <label>تاریخ درگذشت (فقط اگر دقیق است)<input name="death_date" type="date"/></label>
        <textarea name="biography" rows={4} placeholder="زندگی‌نامه کوتاه"/>
        <textarea name="personal_history" rows={4} placeholder="داستان زندگی"/>
        <textarea name="quotes" rows={2} placeholder="جمله‌ای به یادماندنی"/>
        <textarea name="cemetery_info" rows={2} placeholder="آرامگاه؛ فقط اگر خانواده بخواهد"/>
        <label className="legacyFile">تصویر
          <input name="file" type="file" accept="image/jpeg,image/png,image/webp"/>
          <span className="legacyHint">فرمت‌های مجاز عکس: JPG، PNG، WebP — حداکثر حجم ۲۰ مگابایت</span>
        </label>
        <select name="visibility" defaultValue="family"><option value="family">خانواده</option><option value="close_family">بستگان نزدیک</option><option value="private">فقط خودم</option><option value="admins">مدیران</option></select>
        <select name="status" defaultValue={admin?"approved":"pending"}><option value="draft">پیش‌نویس</option><option value="pending">ارسال برای تأیید</option>{admin?<option value="approved">انتشار محترمانه</option>:null}</select>
        <button className="adminSave" disabled={busy}>ثبت یادبود</button>
      </form>
      {msg&&<div className="adminNotice">{msg}</div>}
    </section>
  </LegacyChrome>;
}
