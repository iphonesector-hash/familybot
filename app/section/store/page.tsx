"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import {Icon,IconOrb} from "../../ui";
import AssetSprite from "../../AssetSprite";
import {STORE_ITEMS,StoreKind,StoreRarity} from "@/lib/storeCatalog";

type Owned={id:string;item_id:string;item_name:string;item_kind:string};
type Profile={coins?:number|null;is_founder?:boolean|null};
const fa=(n:number)=>new Intl.NumberFormat("fa-IR").format(n||0);
const rarity:Record<StoreRarity,string>={common:"معمولی",rare:"کمیاب",epic:"حماسی",legendary:"افسانه‌ای"};

export default function StorePage(){
  const[profile,setProfile]=useState<Profile>({coins:0}),[owned,setOwned]=useState<Owned[]>([]),[tab,setTab]=useState<StoreKind>("house"),[busy,setBusy]=useState(""),[note,setNote]=useState("");
  const load=useCallback(()=>{const s=sessionStorage.getItem("familybot.session");if(!s)return;fetch("/api/family/dashboard",{headers:{authorization:`Bearer ${s}`},cache:"no-store"}).then(r=>r.json()).then(x=>{if(x.ok&&x.dashboard){setProfile(x.dashboard.profile||{});setOwned(x.dashboard.ownedItems||[])}}).catch(()=>{})},[]);
  useEffect(()=>{load();const q=new URLSearchParams(location.search).get("tab");if(q==="sagool"||q==="profile"||q==="house")setTab(q)},[load]);
  const items=useMemo(()=>STORE_ITEMS.filter(x=>x.kind===tab),[tab]),own=new Set(owned.map(x=>x.item_id)),founder=Boolean(profile.is_founder),balance=founder?"∞":fa(Number(profile.coins||0));
  async function buy(id:string){const s=sessionStorage.getItem("familybot.session");if(!s)return setNote("Mini App را از داخل بله باز کن.");setBusy(id);try{const r=await fetch("/api/family/action",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${s}`},body:JSON.stringify({action:"store.purchase",payload:{itemId:id}})});const x=await r.json();if(!r.ok||!x.ok)throw new Error(x.error);setNote(x.data.alreadyOwned?"این آیتم رو قبلاً داری.":founder?"آیتم برای Founder فعال شد ✨":"خرید انجام شد ✨");load()}catch(e){setNote(e instanceof Error&&e.message.includes("insufficient_coins")?"سکه کافی نداری.":"خرید انجام نشد.")}finally{setBusy("")}}
  const title=tab==="house"?"۱۲ آیتم خانه":tab==="sagool"?"۱۲ آیتم سگول":"آیتم‌های پروفایل";
  return <main className="appShell storeScreen"><div className="ambient ambientA"/><div className="starField"/><header className="appHeader"><a className="roundButton" href="/">←</a><div className="wordmark"><b>فروشگاه جهانی</b><span>{balance} Family Coin {founder?"· Founder":""}</span></div><IconOrb name="store" tone="violet"/></header>
  <section className="premiumPanel storeHero"><div><span className="eyebrow"><Icon name="coins" size={14}/> موجودی {balance}</span><h1>دنیات رو شخصی کن</h1><p>آیتم‌های گرافیکی JAHANI برای خانه، سگول و پروفایل. دارایی‌ها بعد از خرید در حساب شما باقی می‌مانند.</p></div><AssetSprite index={tab==="sagool"?3:tab==="house"?9:4} size={112} label="آیتم فروشگاه"/></section>
  <div className="storeTabs"><button className={tab==="house"?"active":""} onClick={()=>setTab("house")}>خانه</button><button className={tab==="sagool"?"active":""} onClick={()=>setTab("sagool")}>سگول</button><button className={tab==="profile"?"active":""} onClick={()=>setTab("profile")}>پروفایل</button></div>
  <div className="sectionHeading storeSectionHeading"><div><span className="eyebrow">کالکشن اختصاصی</span><h2>{title}</h2></div><span>{items.length}</span></div>
  <section className="dashboardGrid storeGrid">{items.map(i=><article className={`dashboardCard storeAssetCard rarity-${i.rarity}`} key={i.id}>{typeof i.sprite==="number"?<AssetSprite index={i.sprite} size={98} label={i.name}/>:<img src={i.asset} alt={i.name}/>}<div className="storeCardBody"><div className="storeCardTop"><h2>{i.name}</h2><span className={`rarityTag ${i.rarity}`}>{rarity[i.rarity]}</span></div><p>{i.description}</p><b className="storePrice">{founder?"∞ دسترسی Founder":`${fa(i.price)} 🪙`}</b><button className="primaryCta" disabled={busy===i.id||own.has(i.id)} onClick={()=>void buy(i.id)}>{own.has(i.id)?"فعال شده":busy===i.id?"...":founder?"فعال‌سازی رایگان":"خرید"}</button></div></article>)}</section>
  {note&&<div className="motionToast show">{note}</div>}<section className="premiumPanel" style={{padding:16,margin:"14px 0 100px"}}><h2>دارایی‌های من · {fa(owned.length)}</h2><p style={{fontSize:11,color:"#aaa0c7"}}>آیتم‌های خریداری‌شده برای همین عضو و همین خانواده ثبت می‌شوند.</p></section></main>
}
