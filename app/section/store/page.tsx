"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import {Icon,IconOrb} from "../../ui";
import SpriteAsset from "../../SpriteAsset";
import {STORE_ITEMS,StoreKind} from "@/lib/storeCatalog";
type Owned={id:string;item_id:string;item_name:string;item_kind:string};
type Profile={coins?:number;is_founder?:boolean};
const fa=(n:number)=>new Intl.NumberFormat("fa-IR").format(n||0);
export default function StorePage(){
 const[profile,setProfile]=useState<Profile>({}),[owned,setOwned]=useState<Owned[]>([]),[tab,setTab]=useState<StoreKind>("house"),[busy,setBusy]=useState(""),[note,setNote]=useState("");
 const load=useCallback(()=>{const s=sessionStorage.getItem("familybot.session");if(!s)return;fetch("/api/family/dashboard",{headers:{authorization:`Bearer ${s}`},cache:"no-store"}).then(r=>r.json()).then(x=>{if(x.ok&&x.dashboard){setProfile(x.dashboard.profile||{});setOwned(x.dashboard.ownedItems||[])}}).catch(()=>{})},[]);
 useEffect(()=>{load();const q=new URLSearchParams(location.search).get("tab");if(q==="sagool"||q==="profile"||q==="house")setTab(q)},[load]);
 const items=useMemo(()=>STORE_ITEMS.filter(x=>x.kind===tab),[tab]);
 async function buy(id:string){const s=sessionStorage.getItem("familybot.session");if(!s)return setNote("Mini App را از داخل بله باز کن.");setBusy(id);try{const r=await fetch("/api/family/action",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${s}`},body:JSON.stringify({action:"store.purchase",payload:{itemId:id}})});const x=await r.json();if(!r.ok||!x.ok)throw new Error(x.error);setNote(x.data.alreadyOwned?"این آیتم رو قبلاً داری.":"خرید انجام شد ✨");load()}catch(e){setNote(e instanceof Error&&e.message==="insufficient_coins"?"سکه کافی نداری.":"خرید انجام نشد.")}finally{setBusy("")}}
 const own=new Set(owned.map(x=>x.item_id)),founder=Boolean(profile.is_founder);
 return <main className="appShell"><div className="ambient ambientA"/><div className="starField"/><header className="appHeader"><a className="roundButton" href="/">←</a><div className="wordmark"><b>فروشگاه جهانی</b><span>{founder?"∞":fa(Number(profile.coins||0))} Family Coin</span></div><IconOrb name="store" tone="violet"/></header>
 <section className="premiumPanel" style={{padding:18}}><span className="eyebrow"><Icon name="coins" size={14}/> موجودی {founder?"∞":fa(Number(profile.coins||0))}</span><h1 style={{fontSize:25}}>دنیات رو شخصی کن</h1><p style={{fontSize:12,color:"#aaa0c7"}}>آیتم‌های PNG اختصاصی برای خانه، سگول و پروفایل. خریدها برای همیشه ثبت می‌شوند.</p></section>
 <div className="storeTabs"><button className={tab==="house"?"active":""} onClick={()=>setTab("house")}>خانه</button><button className={tab==="sagool"?"active":""} onClick={()=>setTab("sagool")}>سگول</button><button className={tab==="profile"?"active":""} onClick={()=>setTab("profile")}>پروفایل</button></div>
 <section className="dashboardGrid">{items.map(i=><article className={`dashboardCard storeAssetCard rarity-${i.rarity}`} key={i.id}><SpriteAsset atlas="store" index={i.sprite} size={86} label={i.name}/><div><h2>{i.name}</h2><p>{i.description}</p><b style={{color:"#ffc247",fontSize:12}}>{founder?"∞ / رایگان":`${fa(i.price)} 🪙`}</b><button className="primaryCta" disabled={busy===i.id||own.has(i.id)} onClick={()=>void buy(i.id)}>{own.has(i.id)?"خریداری شده":busy===i.id?"...":founder?"دریافت":"خرید"}</button></div></article>)}</section>
 {note&&<div className="motionToast show">{note}</div>}<section className="premiumPanel" style={{padding:16,margin:"14px 0 100px"}}><h2>دارایی‌های من · {fa(owned.length)}</h2><p style={{fontSize:11,color:"#aaa0c7"}}>آیتم‌های خریداری‌شده در حساب شما باقی می‌مانند.</p></section></main>}
