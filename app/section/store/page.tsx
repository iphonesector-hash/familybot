"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import {Icon,IconOrb} from "../../ui";
import Accordion from "../../ui/Accordion";
import StoreItemArt from "../../StoreItemArt";
import {STORE_ITEMS} from "@/lib/storeCatalog";
import {STORE_GROUPS} from "@/lib/storeGroups";

type Owned={id:string;item_id:string;item_name:string;item_kind:string};
type Profile={coins?:number;is_founder?:boolean};
const fa=(n:number)=>new Intl.NumberFormat("fa-IR").format(n||0);

export default function StorePage(){
 const[profile,setProfile]=useState<Profile>({});
 const[owned,setOwned]=useState<Owned[]>([]);
 const[busy,setBusy]=useState("");
 const[note,setNote]=useState("");
 const[qty,setQty]=useState<Record<string,number>>({});
 const[focus,setFocus]=useState("");
 const load=useCallback(()=>{const s=sessionStorage.getItem("familybot.session");if(!s)return;Promise.all([
  fetch("/api/family/dashboard",{headers:{authorization:`Bearer ${s}`},cache:"no-store"}).then(r=>r.json()),
  fetch("/api/family/house",{headers:{authorization:`Bearer ${s}`},cache:"no-store"}).then(r=>r.json()).catch(()=>null)
 ]).then(([x,h])=>{if(x.ok&&x.dashboard){setProfile(x.dashboard.profile||{});setOwned(x.dashboard.ownedItems||[])}if(h?.ok&&h.data?.materials){const m:Record<string,number>={};for(const row of h.data.materials)m[String(row.material)]=Number(row.quantity||0);setQty(m)}}).catch(()=>{})},[]);
 useEffect(()=>{load();const q=new URLSearchParams(location.search).get("tab")||"";setFocus(q)},[load]);
 async function buy(id:string){const s=sessionStorage.getItem("familybot.session");if(!s)return setNote("Mini App را از داخل بله باز کن.");setBusy(id);const item=STORE_ITEMS.find(x=>x.id===id);try{
  if(item?.stackable&&item.material){
    const r=await fetch("/api/family/house",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${s}`},body:JSON.stringify({type:"buy_material",material:item.material})});
    const x=await r.json();if(!r.ok||!x.ok)throw new Error(x.error);setNote(`+${item.packQty||0} ${item.name} به انبار اضافه شد.`);load();return;
  }
  const r=await fetch("/api/family/action",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${s}`},body:JSON.stringify({action:"store.purchase",payload:{itemId:id}})});const x=await r.json();if(!r.ok||!x.ok)throw new Error(x.error);setNote(x.data.alreadyOwned?"این آیتم رو قبلاً داری.":"خرید انجام شد.");load()
 }catch(e){setNote(e instanceof Error&&e.message==="insufficient_coins"?"سکه کافی نداری.":"خرید انجام نشد.")}finally{setBusy("")}}
 const own=new Set(owned.map(x=>x.item_id));
 const founder=Boolean(profile.is_founder);
 const inventory=useMemo(()=>{
  const unique=owned.map(row=>{
    const item=STORE_ITEMS.find(x=>x.id===row.item_id);
    return {id:row.item_id,name:row.item_name||item?.name||row.item_id,kind:row.item_kind,qty:1,stackable:false};
  });
  const mats=STORE_ITEMS.filter(i=>i.stackable&&i.material).map(i=>({id:i.id,name:i.name,kind:"material",qty:qty[i.material||""]||0,stackable:true})).filter(x=>x.qty>0);
  return [...mats, ...unique];
 },[owned,qty]);
 return <main className="appShell storePage">
  <div className="ambient ambientA"/><div className="starField"/>
  <header className="appHeader"><a className="roundButton" href="/">←</a><div className="wordmark"><b>فروشگاه جهانی</b><span>{founder?"∞":fa(Number(profile.coins||0))} Family Coin</span></div><IconOrb name="store" tone="violet"/></header>
  <section className="premiumPanel" style={{padding:16}}><span className="eyebrow"><Icon name="coins" size={14}/> موجودی {founder?"∞":fa(Number(profile.coins||0))}</span><h1 style={{fontSize:24,margin:"8px 0 4px"}}>فروشگاه JAHANI</h1><p style={{margin:0,fontSize:12,color:"#c9bfd8"}}>مصالح قابل تکرار هستند؛ دکور و پوشیدنی‌ها یکتا می‌مانند.</p></section>
  <Accordion title="دارایی‌های من" summary={inventory.length?`${fa(inventory.length)} مورد`:"هنوز چیزی خریداری نشده"} icon={<Icon name="store" size={18}/>} defaultOpen>
   {inventory.length?<div className="storeGrid" style={{marginTop:4}}>{inventory.map(i=><article className="dashboardCard storeAssetCard" key={`${i.id}-${i.stackable?"mat":"own"}`}>
     <StoreItemArt itemId={i.id} size={64} label={i.name}/>
     <div><h2>{i.name}</h2><p>{i.stackable?`موجودی انبار: ${fa(i.qty)}`:"آیتم یکتا"}</p></div>
   </article>)}</div>:<p style={{fontSize:12,color:"#c9bfd8"}}>بعد از خرید، آیتم‌ها و مصالح اینجا دیده می‌شوند.</p>}
  </Accordion>
  {STORE_GROUPS.map((g,idx)=>{
    const items=STORE_ITEMS.filter(g.match);
    if(!items.length)return null;
    const open=focus==="sagool"?g.id==="care"||g.id==="toys"||g.id==="accessories":focus==="profile"?g.id==="profile":idx<2;
    return <Accordion key={g.id} title={g.title} summary={`${g.summary} · ${fa(items.length)} آیتم`} defaultOpen={open}>
      <div className="storeGrid" style={{marginTop:4}}>{items.map(i=>{
        const stacked=Boolean(i.stackable);
        const have=own.has(i.id);
        const stock=i.material?qty[i.material]||0:0;
        return <article className={`dashboardCard storeAssetCard rarity-${i.rarity}`} key={i.id}>
          <StoreItemArt itemId={i.id} size={72} label={i.name}/>
          <div>
            <h2>{i.name}</h2>
            <p>{i.description}</p>
            {stacked&&<small>موجودی انبار: {fa(stock)}</small>}
            <b className="storePrice">{founder?"∞":`${fa(i.price)} سکه`}</b>
            <button className="primaryCta" disabled={busy===i.id||(!stacked&&have)} onClick={()=>void buy(i.id)}>
              {!stacked&&have?"خریداری شده":busy===i.id?"...":founder?"دریافت":stacked?"خرید بسته":"خرید"}
            </button>
          </div>
        </article>})}
      </div>
    </Accordion>
  })}
  {note&&<div className="motionToast show">{note}</div>}
 </main>;
}
