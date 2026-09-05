"use client";
import {FormEvent,useCallback,useEffect,useState} from "react";
import {legacyAct,legacyGet,uploadLegacyFile} from "../legacyClient";
import {Empty,LegacyChrome} from "../LegacyChrome";

export default function PeoplePage(){
  const[profiles,setProfiles]=useState<any[]>([]),[members,setMembers]=useState<any[]>([]),[circle,setCircle]=useState<any[]>([]),[me,setMe]=useState(""),[admin,setAdmin]=useState(false),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false),[err,setErr]=useState(""),[loading,setLoading]=useState(true);
  const load=useCallback(()=>{
    setLoading(true);setErr("");
    Promise.all([legacyGet("people"),legacyGet("circle")]).then(([d,c])=>{
      setProfiles(d.profiles||[]);setMembers(d.members||[]);setAdmin(Boolean(d.me?.isAdmin));setMe(d.me?.memberId||"");
      setCircle(c.members||[]);
    }).catch(e=>setErr(e instanceof Error?e.message:"بارگذاری انجام نشد.")).finally(()=>setLoading(false));
  },[]);
  useEffect(()=>load(),[load]);
  async function save(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setMsg("");
    try{
      const f=new FormData(e.currentTarget);let photo=String(f.get("photo")||"");
      const file=f.get("file");if(file instanceof File&&file.size)photo=(await uploadLegacyFile(file)).mediaRef;
      await legacyAct("person.save",{
        member_id:f.get("member_id"),first_name:f.get("first_name"),last_name:f.get("last_name"),relationship_label:f.get("relationship_label"),
        short_bio:f.get("short_bio"),occupation:f.get("occupation"),city:f.get("city"),interests:f.get("interests"),hobbies:f.get("hobbies"),
        personal_story:f.get("personal_story"),family_branch:f.get("family_branch"),birthday:f.get("birthday")||null,
        birthday_precision:f.get("birthday")?"full":"unknown",marriage_date:f.get("marriage_date")||null,
        marriage_precision:f.get("marriage_date")?"full":"unknown",visibility:f.get("visibility"),photo_url:photo||null
      });
      setMsg("معرفی ذخیره شد.");load();
    }catch(err){setMsg(err instanceof Error?err.message:"خطا")}finally{setBusy(false)}
  }
  async function addClose(e:FormEvent<HTMLFormElement>){
    e.preventDefault();const id=String(new FormData(e.currentTarget).get("closeMemberId")||"");
    try{const d=await legacyAct("circle.add",{closeMemberId:id});setCircle(d.members||[]);setMsg("به دایره نزدیکان اضافه شد.");}catch(e){setMsg(e instanceof Error?e.message:"خطا")}
  }
  async function removeClose(id:string){
    try{const d=await legacyAct("circle.remove",{closeMemberId:id});setCircle(d.members||[]);setMsg("از دایره نزدیکان حذف شد.");}catch(e){setMsg(e instanceof Error?e.message:"خطا")}
  }
  return <LegacyChrome title="معرفی اعضای خانواده" subtitle="با حفظ حریم خصوصی" icon="profile" tone="pink">
    {loading?<div className="legacyEmpty">در حال بارگذاری...</div>:null}
    {err?<div className="legacyEmpty">{err==="unauthorized"?"Mini App را از داخل بله باز کن.":err}</div>:null}
    <section className="dashboardGrid">{profiles.length?profiles.map(p=><a className="dashboardCard" href={`/section/legacy/people/${p.id}`} key={p.id}><div><h2>{[p.first_name,p.last_name].filter(Boolean).join(" ")||"عضو خانواده"}</h2><p>{p.relationship_label||p.city||p.short_bio||"معرفی خانواده"}</p></div></a>):!loading?<Empty text="هنوز معرفی کاملی ثبت نشده."/>:null}</section>
    <section className="premiumPanel" style={{padding:16,marginTop:16}}>
      <h2>بستگان نزدیک من</h2>
      <p style={{fontSize:12,color:"#b9b0cf"}}>فقط این افراد محتوای «بستگان نزدیک» شما را می‌بینند. کسی نمی‌تواند خودش را به دایره شما اضافه کند.</p>
      <div className="legacyMeta" style={{margin:"10px 0"}}>{circle.length?circle.map((m:any)=><span key={m.id} className="legacySoft">{m.name} <button className="ghostCta" style={{minHeight:36,marginRight:6}} onClick={()=>void removeClose(m.id)}>حذف</button></span>):<span className="legacySoft">هنوز کسی اضافه نشده</span>}</div>
      <form className="legacyForm" onSubmit={addClose}>
        <select name="closeMemberId" required>
          <option value="">انتخاب عضو خانواده</option>
          {members.filter((m:any)=>m.id!==me&&!circle.some((c:any)=>c.id===m.id)).map((m:any)=><option key={m.id} value={m.id}>{m.display_name||m.first_name||"عضو"}</option>)}
        </select>
        <button className="adminSave">افزودن به دایره نزدیکان</button>
      </form>
    </section>
    <section className="premiumPanel" style={{padding:16,marginTop:16}}>
      <h2>معرفی خودم یا یکی از نزدیکان</h2>
      <p style={{fontSize:12,color:"#b9b0cf"}}>شماره تلفن، نشانی و اطلاعات حساس را ننویسید. تاریخ دقیق تولد فقط اگر خودتان بخواهید.</p>
      <form className="legacyForm" onSubmit={save}>
        <select name="member_id" required>{members.map((m:any)=><option key={m.id} value={m.id}>{m.display_name||m.first_name||"عضو"}</option>)}</select>
        <input name="first_name" placeholder="نام"/>
        <input name="last_name" placeholder="نام خانوادگی"/>
        <input name="relationship_label" placeholder="نسبت خانوادگی"/>
        <input name="occupation" placeholder="شغل"/>
        <input name="city" placeholder="شهر"/>
        <input name="family_branch" placeholder="شاخه خانوادگی"/>
        <textarea name="short_bio" rows={3} placeholder="معرفی کوتاه"/>
        <textarea name="interests" rows={2} placeholder="علاقه‌مندی‌ها"/>
        <textarea name="hobbies" rows={2} placeholder="سرگرمی‌ها"/>
        <textarea name="personal_story" rows={5} placeholder="داستان شخصی"/>
        <label>تولد (اختیاری)<input name="birthday" type="date"/></label>
        <label>ازدواج (اختیاری)<input name="marriage_date" type="date"/></label>
        <label className="legacyFile">تصویر
          <input name="file" type="file" accept="image/jpeg,image/png,image/webp"/>
          <span className="legacyHint">فرمت‌های مجاز عکس: JPG، PNG، WebP — حداکثر حجم ۲۰ مگابایت</span>
        </label>
        <select name="visibility" defaultValue="family"><option value="family">همه اعضای خانواده</option><option value="close_family">بستگان نزدیک</option><option value="private">فقط خودم</option><option value="admins">مدیران</option></select>
        <button className="adminSave" disabled={busy}>ذخیره معرفی</button>
      </form>
      {msg&&<div className="adminNotice">{msg}</div>}
      {admin?null:null}
    </section>
  </LegacyChrome>;
}