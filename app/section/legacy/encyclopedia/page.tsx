"use client";
import {FormEvent,useCallback,useEffect,useState} from "react";
import {ARTICLE_CATEGORIES} from "@/lib/familyLegacyPrivacy";
import {legacyAct,legacyGet,uploadLegacyFile} from "../legacyClient";
import {Empty,LegacyChrome} from "../LegacyChrome";

type Item={id:string;title:string;category:string;moderation_status:string;featured?:boolean;cover_url?:string|null};
export default function EncyclopediaPage(){
  const[items,setItems]=useState<Item[]>([]),[cat,setCat]=useState(""),[admin,setAdmin]=useState(false),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false),[status,setStatus]=useState("draft"),[fileName,setFileName]=useState("");
  const load=useCallback(()=>{legacyGet("articles",cat?{category:cat}:{}).then(d=>{setItems(d.items||[]);setAdmin(Boolean(d.me?.isAdmin))}).catch(()=>undefined)},[cat]);
  useEffect(()=>load(),[load]);
  async function save(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setMsg("");
    try{
      const f=new FormData(e.currentTarget);let cover=String(f.get("cover")||"");
      const file=f.get("file");if(file instanceof File&&file.size)cover=(await uploadLegacyFile(file)).mediaRef;
      await legacyAct("article.save",{title:f.get("title"),body:f.get("body"),category:f.get("category"),tags:String(f.get("tags")||"").split("،"),visibility:f.get("visibility"),moderation_status:status,cover_url:cover||null,featured:admin&&f.get("featured")==="1"});
      setMsg(status==="draft"?"پیش‌نویس ذخیره شد.":"برای تأیید ارسال شد.");
      (e.target as HTMLFormElement).reset();setFileName("");setStatus("draft");load();
    }catch(err){setMsg(err instanceof Error?err.message:"خطا")}finally{setBusy(false)}
  }
  return <LegacyChrome title="دانشنامه خانواده" subtitle="تاریخ و ریشه‌ها" icon="memories">
    <div className="legacyTabs" role="tablist">
      <button type="button" className={!cat?"active":""} onClick={()=>setCat("")}>همه</button>
      {ARTICLE_CATEGORIES.map(c=><button type="button" key={c} className={cat===c?"active":""} onClick={()=>setCat(c)}>{c}</button>)}
    </div>
    <section className="legacyCards">{items.length?items.map(i=><a className="legacyCard" href={`/section/legacy/encyclopedia/${i.id}`} key={i.id}><h2>{i.title}</h2><p>{i.category} · {i.moderation_status==="approved"?"منتشرشده":i.moderation_status==="draft"?"پیش‌نویس":"در انتظار تأیید"}</p></a>):<Empty text="هنوز مطلبی در دانشنامه خانواده وجود ندارد"/>}</section>
    <section className="premiumPanel legacyComposer">
      <h2>نوشتن مقاله</h2>
      <form className="legacyForm" onSubmit={save}>
        <label>عنوان<input name="title" required autoComplete="off"/></label>
        <label>دسته‌بندی<select name="category" defaultValue={ARTICLE_CATEGORIES[0]}>{ARTICLE_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label>
        <label>متن مقاله<textarea name="body" rows={8} required placeholder="ساده و خوانا بنویسید."/></label>
        <label>برچسب‌ها<input name="tags" placeholder="با ، جدا کنید"/></label>
        <label className="legacyFile">تصویر اصلی
          <input name="file" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFileName(e.target.files?.[0]?.name||"")}/>
          <span className="legacyFileName">{fileName||"JPG، PNG یا WebP"}</span>
        </label>
        <label>سطح دسترسی
          <select name="visibility" defaultValue="family">
            <option value="family">همه اعضای خانواده</option>
            <option value="close_family">بستگان نزدیک</option>
            <option value="private">فقط خودم</option>
            <option value="admins">مدیران</option>
          </select>
        </label>
        <fieldset className="legacyStatus">
          <legend>وضعیت انتشار</legend>
          <button type="button" className={status==="draft"?"active":""} onClick={()=>setStatus("draft")}>ذخیره پیش‌نویس</button>
          <button type="button" className={status==="pending"?"active":""} onClick={()=>setStatus("pending")}>ارسال برای تأیید</button>
        </fieldset>
        {admin?<label className="legacyCheck"><input type="checkbox" name="featured" value="1"/> مقاله برگزیده</label>:null}
        <button className="adminSave" disabled={busy}>{busy?"در حال ذخیره...":status==="draft"?"ذخیره پیش‌نویس":"ارسال برای تأیید"}</button>
      </form>
      {msg&&<div className="adminNotice">{msg}</div>}
    </section>
  </LegacyChrome>;
}