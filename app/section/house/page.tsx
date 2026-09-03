"use client";
import Link from "next/link";
import {useEffect,useMemo,useRef,useState} from "react";
import {Icon} from "../../ui";
import StoreItemArt from "../../StoreItemArt";
import {STORE_ITEMS,StoreItem} from "@/lib/storeCatalog";
import {stageFor} from "@/lib/sagoolCatalog";
import {HOUSE_LEVELS,HOUSE_MATERIALS,HOUSE_MAX_LEVEL,HouseMaterial,houseNextCost,houseSceneSrc,missingMaterials} from "@/lib/houseProgression";
import styles from "./house.module.css";

const fa=(n:number)=>new Intl.NumberFormat("fa-IR").format(n||0);
const houseItems=STORE_ITEMS.filter(x=>x.kind==="house");

type HouseState={houseLevel:number;familyName:string;coins:number;founder:boolean;materials:Record<string,number>;ownedItems:string[]};

export default function HousePage(){
 const[selected,setSelected]=useState<StoreItem>(houseItems[0]);
 const[toast,setToast]=useState("");
 const[levelBurst,setLevelBurst]=useState(false);
 const[house,setHouse]=useState<HouseState>({houseLevel:1,familyName:"خانواده ما",coins:0,founder:false,materials:{},ownedItems:[]});
 const[sagoolLevel,setSagoolLevel]=useState(1);
 const[busy,setBusy]=useState("");
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 function notify(t:string){setToast(t);if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>setToast(""),2400)}
 async function refresh(){
  const session=sessionStorage.getItem("familybot.session"); if(!session) return;
  try{
   const [h,pet]=await Promise.all([
    fetch("/api/family/house",{headers:{authorization:`Bearer ${session}`},cache:"no-store"}).then(r=>r.json()),
    fetch("/api/family/sagool",{headers:{authorization:`Bearer ${session}`},cache:"no-store"}).then(r=>r.json()).catch(()=>null)
   ]);
   if(h.ok&&h.data) setHouse({houseLevel:h.data.houseLevel,familyName:h.data.familyName,coins:h.data.coins,founder:h.data.founder,materials:h.data.materials||{},ownedItems:h.data.ownedItems||[]});
   if(pet?.ok&&pet.data?.state?.level) setSagoolLevel(Number(pet.data.state.level)||1);
  }catch{notify("دریافت اطلاعات خانه ممکن نشد")}
 }
 useEffect(()=>{void refresh()},[]);
 async function postHouse(type:string,extra:Record<string,unknown>={}){
  const session=sessionStorage.getItem("familybot.session"); if(!session) throw new Error("Mini App رو از داخل ربات باز کن.");
  const r=await fetch("/api/family/house",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${session}`},body:JSON.stringify({type,...extra})});
  const d=await r.json(); if(!d.ok) throw new Error(d.error||"action_failed"); return d.data;
 }
 async function buyFurniture(){
  const session=sessionStorage.getItem("familybot.session"); if(!session) return notify("Mini App رو از داخل ربات باز کن.");
  try{
   const r=await fetch("/api/family/action",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${session}`},body:JSON.stringify({action:"store.purchase",payload:{itemId:selected.id}})});
   const d=await r.json(); if(!d.ok) throw new Error(d.error);
   notify(d.data.alreadyOwned?"این آیتم رو قبلاً داری.":`${selected.name} خریداری شد.`);
   void refresh();
  }catch(e){notify(e instanceof Error&&e.message==="insufficient_coins"?"سکه کافی نداری.":"خرید انجام نشد")}
 }
 async function buyMat(id:HouseMaterial){
  setBusy(id);
  try{await postHouse("buy_material",{material:id}); notify("مصالح به انبار اضافه شد."); void refresh()}
  catch(e){notify(e instanceof Error&&e.message==="insufficient_coins"?"سکه کافی نداری.":"خرید مصالح انجام نشد")}
  finally{setBusy("")}
 }
 async function collectDaily(){
  setBusy("daily");
  try{const d=await postHouse("collect_daily"); notify(d.collect?.alreadyClaimed?"سهم امروز مصالح را گرفتی.":"مصالح روزانه اضافه شد."); void refresh()}
  catch{notify("جمع‌آوری روزانه انجام نشد")}
  finally{setBusy("")}
 }
 async function upgrade(){
  setBusy("upgrade");
  try{
   await postHouse("upgrade",{fromLevel:house.houseLevel});
   setLevelBurst(true); setTimeout(()=>setLevelBurst(false),1600);
   notify("خانه ارتقا پیدا کرد.");
   void refresh();
  }catch(e){
   const m=e instanceof Error?e.message:"";
   notify(m==="missing_materials"?"مصالح کافی نیست.":m==="insufficient_coins"?"سکه کافی نیست.":m==="house_max_level"?"خانه در سطح نهایی است.":"ارتقای خانه انجام نشد.");
  }finally{setBusy("")}
 }
 const owned=useMemo(()=>new Set(house.ownedItems),[house.ownedItems]);
 const levelMeta=HOUSE_LEVELS[Math.max(0,house.houseLevel-1)];
 const next=houseNextCost(house.houseLevel);
 const miss=next?missingMaterials(house.materials as Partial<Record<HouseMaterial,number>>,next):{};
 const canUpgrade=Boolean(next)&&Object.keys(miss).length===0&&(house.founder||house.coins>=(next?.coins||0));
 const petAsset=stageFor(sagoolLevel).asset;
 const scene=houseSceneSrc(house.houseLevel);
 return <main className={styles.page}>
  <div className={`motionToast${toast?" show":""}`}>{toast}</div>
  <div className={`levelBurst${levelBurst?" show":""}`}><div className="levelBurstCore"><div><b>✦</b><span>خانه سطح {house.houseLevel}</span></div></div></div>
  <header className={styles.header}><Link href="/" className={styles.back}>←</Link><div><b>Family House</b><span>{house.familyName}</span></div><span className={styles.bot}><Icon name="home"/></span></header>
  <section className={styles.stats}>
   <div><span className={styles.statIcon}><Icon name="spark"/></span><p>سطح خانه</p><b>Lv. {fa(house.houseLevel)} / ۱۰</b></div>
   <div><span className={styles.coin}>●</span><p>سکه‌های من</p><b>{house.founder?"∞":fa(house.coins)}</b></div>
   <div><span className={styles.statIcon}><Icon name="trophy"/></span><p>سبک فعلی</p><b>{levelMeta.title}</b></div>
  </section>
  <section className={styles.sceneCard}>
   <div className={styles.sceneTitle}><div><p>{levelMeta.title}</p><span>{fa(owned.size)} دکور خریداری‌شده</span></div><span className={styles.score}>{fa(house.houseLevel)}<br/><small>از ۱۰</small></span></div>
   <div className={styles.land} data-level={house.houseLevel} style={{backgroundImage:`linear-gradient(180deg,rgba(7,4,29,.15),rgba(7,4,26,.55)),url(${scene})`,backgroundSize:"cover",backgroundPosition:"center"}}>
    <div className={styles.pet}><img src={petAsset} alt={`سگول سطح ${fa(sagoolLevel)}`} style={{width:92,height:92,objectFit:"contain",filter:"drop-shadow(0 10px 18px rgba(53,210,255,.28))"}}/></div>
   </div>
  </section>
  <section className="premiumPanel" style={{padding:16,marginTop:12}}>
   <div className="sectionHeading"><div><span className="eyebrow">ارتقای خانه</span><h2>{house.houseLevel>=HOUSE_MAX_LEVEL?"نسخه نهایی JAHANI":`از سطح ${house.houseLevel} به ${house.houseLevel+1}`}</h2></div></div>
   {next?<>
    <p style={{fontSize:12,color:"#cfc7eb"}}>سکه لازم: {house.founder?"رایگان برای بنیان‌گذار":fa(next.coins)}</p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8,margin:"10px 0"}}>
     {HOUSE_MATERIALS.map(mat=>{const need=Number((next as any)[mat.id]||0); if(!need) return null; const have=Number(house.materials[mat.id]||0); const short=have<need;
      return <div key={mat.id} style={{border:`1px solid ${short?"#ff8aa855":"#7ae9ff44"}`,borderRadius:14,padding:8,background:"#140e33"}}>
       <img src={mat.art} alt={mat.name} style={{width:"100%",height:64,objectFit:"cover",borderRadius:10}}/>
       <b style={{display:"block",fontSize:11,marginTop:6}}>{mat.name}</b>
       <small style={{color:short?"#ffb4c8":"#b8f0ff"}}>{fa(have)} / {fa(need)}</small>
      </div>})}
    </div>
    <button className="primaryCta" disabled={!canUpgrade||Boolean(busy)} onClick={()=>void upgrade()}>{busy==="upgrade"?"...":canUpgrade?"ارتقای خانه":"منابع کافی نیست"}</button>
   </>:<p>خانه به سطح نهایی رسیده است.</p>}
   <button className="roundButton" style={{width:"100%",marginTop:8,height:42}} disabled={busy==="daily"} onClick={()=>void collectDaily()}>{busy==="daily"?"...":"جمع‌آوری روزانه مصالح"}</button>
  </section>
  <section className="premiumPanel" style={{padding:16,marginTop:12}}>
   <h2>خرید مصالح</h2>
   <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8,marginTop:10}}>
    {HOUSE_MATERIALS.map(mat=><button key={mat.id} onClick={()=>void buyMat(mat.id)} disabled={Boolean(busy)} style={{border:"1px solid #ffffff14",borderRadius:16,background:"#17103c",color:"#fff",padding:8}}>
     <img src={mat.art} alt="" style={{width:"100%",height:70,objectFit:"cover",borderRadius:12}}/>
     <b style={{display:"block",fontSize:11,marginTop:6}}>{mat.name}</b>
     <small>{house.founder?"رایگان":`${fa(mat.price)} سکه`} · +{fa(mat.pack)}</small>
    </button>)}
   </div>
  </section>
  <section className={styles.sceneCard} style={{marginTop:12}}>
   <div className={styles.decorRail}>{houseItems.slice(0,16).map(item=><button key={item.id} onClick={()=>setSelected(item)} aria-pressed={selected.id===item.id}><StoreItemArt itemId={item.id} size={44}/><b>{owned.has(item.id)?"✓":"+"}</b></button>)}</div>
   <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,padding:"11px 4px 0",fontSize:11,color:"#bdb2d5"}}>
    <span>انتخاب: <b style={{color:"#fff"}}>{selected.name}</b></span>
    <button onClick={buyFurniture} disabled={owned.has(selected.id)} className="primaryCta">{owned.has(selected.id)?"خریداری شده":house.founder?"دریافت":`خرید · ${fa(selected.price)}`}</button>
   </div>
  </section>
  <section className={styles.dual}>
   <article><header><h2>فروشگاه خانه</h2><span><Icon name="store"/></span></header><p>مصالح و دکور را از فروشگاه هم می‌توانی بگیری</p><Link href="/section/store?tab=house">همه آیتم‌ها ←</Link></article>
   <article><header><h2>سگول</h2><span><Icon name="spark"/></span></header><p>مراقبت روزانه سگول XP خانه را هم جلو می‌برد</p><Link href="/section/sagool">رفتن به سگول ←</Link></article>
  </section>
 </main>;
}
