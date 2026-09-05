"use client";
import {FormEvent,useCallback,useEffect,useState} from "react";
import {ALBUM_PRESETS} from "@/lib/familyLegacyPrivacy";
import {legacyAct,legacyGet,uploadLegacyFile} from "../legacyClient";
import {Empty,LegacyChrome} from "../LegacyChrome";

export default function GalleryPage(){
  const[albums,setAlbums]=useState<any[]>([]),[items,setItems]=useState<any[]>([]),[members,setMembers]=useState<any[]>([]),[album,setAlbum]=useState(""),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false);
  const load=useCallback(()=>{legacyGet("gallery",album?{album}:{}).then(d=>{setAlbums(d.albums||[]);setItems(d.items||[])});legacyGet("members").then(setMembers).catch(()=>undefined)},[album]);
  useEffect(()=>load(),[load]);
  async function saveAlbum(e:FormEvent<HTMLFormElement>){
    e.preventDefault();const f=new FormData(e.currentTarget);
    try{await legacyAct("album.save",{title:f.get("title"),album_key:f.get("album_key"),description:f.get("description"),visibility:f.get("visibility")});(e.target as HTMLFormElement).reset();load()}catch(err){setMsg(err instanceof Error?err.message:"")}
  }
  async function saveMedia(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setMsg("");
    try{
      const f=new FormData(e.currentTarget);const file=f.get("file");if(!(file instanceof File)||!file.size)throw new Error("media_required");
      const up=await uploadLegacyFile(file);
      const tagged=[...f.getAll("tagged")].map(String);
      await legacyAct("media.save",{media_url:up.mediaRef,media_kind:up.kind,title:f.get("title"),description:f.get("description"),album_id:f.get("album_id")||null,taken_on:f.get("taken_on")||null,taken_precision:f.get("taken_on")?"full":"unknown",visibility:f.get("visibility"),taggedMemberIds:tagged});
      (e.target as HTMLFormElement).reset();load();
    }catch(err){setMsg(err instanceof Error?err.message:"خطا")}finally{setBusy(false)}
  }
  return <LegacyChrome title="گالری خانواده" subtitle="آلبوم نسل‌ها" icon="memories" tone="blue">
    <div className="legacyTabs">
      <button type="button" className={!album?"active":""} onClick={()=>setAlbum("")}>همه</button>
      {albums.map((a:any)=><button type="button" key={a.id} className={album===a.id?"active":""} onClick={()=>setAlbum(a.id)}>{a.title}</button>)}
    </div>
    <section className="legacyCards">{items.length?items.map((m:any)=><a key={m.id} href={`/section/legacy/gallery/${m.id}`} className="legacyCard" style={{padding:0,overflow:"hidden"}}>{m.media_kind==="video"?<video src={m.media_url||""} preload="metadata" muted playsInline style={{width:"100%",height:150,objectFit:"cover"}}/>:<img src={m.media_url||""} alt={m.title||""} style={{width:"100%",height:150,objectFit:"cover"}}/>}<div style={{padding:10}}><b>{m.title||"بدون عنوان"}</b></div></a>):<Empty text="اولین عکس خانوادگی را اضافه کنید"/>}</section>
    <section className="premiumPanel" style={{padding:16,marginTop:16}}>
      <h2>آلبوم جدید</h2>
      <form className="legacyForm" onSubmit={saveAlbum}>
        <select name="album_key" defaultValue="">{ALBUM_PRESETS.map(p=><option key={p.key} value={p.key}>{p.title}</option>)}</select>
        <input name="title" placeholder="یا عنوان دلخواه"/>
        <textarea name="description" rows={2} placeholder="توضیح کوتاه"/>
        <select name="visibility" defaultValue="family"><option value="family">خانواده</option><option value="close_family">بستگان نزدیک</option><option value="private">فقط خودم</option></select>
        <button className="adminSave">ساخت آلبوم</button>
      </form>
    </section>
    <section className="premiumPanel" style={{padding:16,marginTop:14}}>
      <h2>افزودن عکس یا فیلم</h2>
      <form className="legacyForm" onSubmit={saveMedia}>
        <input name="title" placeholder="عنوان"/>
        <textarea name="description" rows={2} placeholder="شرح"/>
        <select name="album_id" defaultValue=""><option value="">بدون آلبوم</option>{albums.map((a:any)=><option key={a.id} value={a.id}>{a.title}</option>)}</select>
        <label>تاریخ تقریبی یا دقیق<input name="taken_on" type="date"/></label>
        <label className="legacyFile">فایل تصویر یا فیلم MP4
          <input name="file" type="file" accept="image/jpeg,image/png,image/webp,video/mp4" required/>
        </label>
        <div>{(Array.isArray(members)?members:[]).map((m:any)=><label key={m.id} className="legacyCheck"><input type="checkbox" name="tagged" value={m.id}/>{m.name}</label>)}</div>
        <label>سطح دسترسی
        <select name="visibility" defaultValue="family"><option value="family">خانواده</option><option value="close_family">بستگان نزدیک</option><option value="private">فقط خودم</option></select>
        </label>
        <button className="adminSave" disabled={busy}>{busy?"در حال آپلود...":"افزودن به گالری"}</button>
      </form>
      {msg&&<div className="adminNotice">{msg}</div>}
    </section>
  </LegacyChrome>;
}
