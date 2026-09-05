"use client";
import {FormEvent,useCallback,useEffect,useState} from "react";
import {ARTICLE_CATEGORIES} from "@/lib/familyLegacyPrivacy";
import {legacyAct,legacyGet,uploadLegacyFile} from "../legacyClient";
import {Empty,LegacyChrome,PrivacySelect,StatusSelect} from "../LegacyChrome";

type Item={id:string;title:string;category:string;moderation_status:string;featured?:boolean;cover_url?:string|null};
export default function EncyclopediaPage(){
  const[items,setItems]=useState<Item[]>([]),[cat,setCat]=useState(""),[admin,setAdmin]=useState(false),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false);
  const load=useCallback(()=>{legacyGet("articles",cat?{category:cat}:{}).then(d=>{setItems(d.items||[]);setAdmin(Boolean(d.me?.isAdmin))}).catch(()=>undefined)},[cat]);
  useEffect(()=>load(),[load]);
  async function save(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setMsg("");
    try{
      const f=new FormData(e.currentTarget);let cover=String(f.get("cover")||"");
      const file=f.get("file");if(file instanceof File&&file.size)cover=(await uploadLegacyFile(file)).mediaRef;
      await legacyAct("article.save",{title:f.get("title"),body:f.get("body"),category:f.get("category"),tags:String(f.get("tags")||"").split("،"),visibility:f.get("visibility"),moderation_status:f.get("status"),cover_url:cover||null,featured:admin&&f.get("featured")==="1"});
      setMsg("مقاله ذخیره شد.");(e.target as HTMLFormElement).reset();load();
    }catch(err){setMsg(err instanceof Error?err.message:"خطا")}finally{setBusy(false)}
  }
  return <LegacyChrome title="دانشنامه خانواده" subtitle="تاریخ و ریشه‌ها" icon="memories">
    <div className="storeTabs" style={{overflowX:"auto"}}>
      <button className={!cat?"active":""} onClick={()=>setCat("")}>همه</button>
      {ARTICLE_CATEGORIES.map(c=><button key={c} className={cat===c?"active":""} onClick={()=>setCat(c)}>{c}</button>)}
    </div>
    <section className="dashboardGrid">{items.length?items.map(i=><a className="dashboardCard" href={`/section/legacy/encyclopedia/${i.id}`} key={i.id}><div><h2>{i.title}</h2><p>{i.category} · {i.moderation_status==="approved"?"منتشرشده":i.moderation_status==="draft"?"پیش‌نویس":"در انتظار تأیید"}</p></div></a>):<Empty text="هنوز مطلبی در دانشنامه خانواده وجود ندارد"/>}</section>
    <section className="premiumPanel" style={{padding:16,marginTop:16}}>
      <h2>نوشتن مقاله</h2>
      <form className="legacyForm" onSubmit={save}>
        <input name="title" placeholder="عنوان" required/>
        <select name="category" defaultValue={ARTICLE_CATEGORIES[0]}>{ARTICLE_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
        <textarea name="body" rows={8} placeholder="متن مقاله. ساده و خوانا بنویسید." required/>
        <input name="tags" placeholder="برچسب‌ها با ،"/>
        <input name="file" type="file" accept="image/jpeg,image/png,image/webp"/>
        <PrivacySelect value={"family"} onChange={()=>undefined}/>
        <select name="visibility" defaultValue="family"><option value="family">همه اعضای خانواده</option><option value="close_family">بستگان نزدیک</option><option value="private">فقط خودم</option><option value="admins">مدیران</option></select>
        <StatusSelect value="pending" onChange={()=>undefined} admin={admin}/>
        <select name="status" defaultValue={admin?"approved":"pending"}><option value="draft">پیش‌نویس</option><option value="pending">ارسال برای تأیید</option>{admin?<option value="approved">انتشار</option>:null}</select>
        {admin?<label><input type="checkbox" name="featured" value="1"/> مقاله برگزیده</label>:null}
        <button className="adminSave" disabled={busy}>{busy?"در حال ذخیره...":"ذخیره مقاله"}</button>
      </form>
      {msg&&<div className="adminNotice">{msg}</div>}
    </section>
  </LegacyChrome>;
}
