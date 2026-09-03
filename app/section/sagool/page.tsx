"use client";
import {useEffect,useMemo,useState} from "react";
import {Icon,IconOrb} from "../../ui";
import StoreItemArt from "../../StoreItemArt";
import {SagoolMission,SagoolState,sagoolAdvice,stageFor} from "@/lib/sagoolCatalog";
import {CARE_ACTIONS,sagoolMoodFromNeeds,sagoolXpProgress} from "@/lib/sagoolProgression";
import {STORE_ITEMS} from "@/lib/storeCatalog";

type Inventory={item_id:string;quantity:number;equipped:boolean;acquired_at:string};
const fallback:SagoolState={stage:"puppy",level:1,xp:0,hunger:72,thirst:70,energy:80,hygiene:76,happiness:78,affection:50,health:100};
const bars:[keyof Pick<SagoolState,"hunger"|"thirst"|"energy"|"happiness">,string][]=[["hunger","غذا"],["thirst","آب"],["happiness","بازی"],["energy","خواب"]];
const extraActions=[{id:"clean",title:"حمام"},{id:"pet",title:"نوازش"},{id:"walk",title:"پیاده‌روی"},{id:"train",title:"آموزش"}];

function feedback(success=true){try{navigator.vibrate?.(success?[18,25,18]:[50]);const W=window as any,C=W.AudioContext||W.webkitAudioContext;if(!C)return;const c=new C(),o=c.createOscillator(),g=c.createGain();o.type="sine";o.frequency.value=success?660:180;g.gain.setValueAtTime(.0001,c.currentTime);g.gain.exponentialRampToValueAtTime(.07,c.currentTime+.015);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+.16);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+.17)}catch{}}

export default function SagoolPage(){
 const[state,setState]=useState(fallback),[missions,setMissions]=useState<SagoolMission[]>([]),[inventory,setInventory]=useState<Inventory[]>([]),[founder,setFounder]=useState(false),[busy,setBusy]=useState(""),[note,setNote]=useState(""),[lastAction,setLastAction]=useState(""),[levelBurst,setLevelBurst]=useState(false);
 const stage=useMemo(()=>stageFor(state.level),[state.level]);
 const xp=useMemo(()=>sagoolXpProgress(state.xp),[state.xp]);
 const mood=useMemo(()=>sagoolMoodFromNeeds(state,lastAction),[state,lastAction]);
 const equipped=useMemo(()=>inventory.filter(x=>x.equipped).slice(0,3),[inventory]);
 function apply(d:any){if(!d)return;if(d.state)setState(d.state);if(Array.isArray(d.missions))setMissions(d.missions);if(Array.isArray(d.inventory))setInventory(d.inventory);if(typeof d.founder==="boolean")setFounder(Boolean(d.founder))}
 async function load(){const s=sessionStorage.getItem("familybot.session");if(!s)return;try{const r=await fetch("/api/family/sagool",{headers:{authorization:`Bearer ${s}`},cache:"no-store"}),x=await r.json();if(x.ok)apply(x.data)}catch{}}
 useEffect(()=>{void load()},[]);
 async function care(action:string){const s=sessionStorage.getItem("familybot.session");if(!s)return setNote("Mini App را از داخل بله باز کن.");setBusy(action);try{const r=await fetch("/api/family/sagool",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${s}`},body:JSON.stringify({type:"interact",action})}),x=await r.json();if(!r.ok||!x.ok)throw new Error(x.error||"failed");feedback(true);setLastAction(action);apply(x.data);if(x.data.leveledUp){setLevelBurst(true);setTimeout(()=>setLevelBurst(false),2200);setNote(`سگول سطح ${x.data.newLevel} شد!`)}else setNote(x.data.message||"سگول خوشحال شد.")}catch(e){feedback(false);setNote(e instanceof Error&&e.message==="sagool_cooldown"?"چند ثانیه صبر کن؛ سگول برای همین کار هنوز آماده نیست.":"این کار فعلاً انجام نشد.")}finally{setBusy("")}}
 async function claim(m:SagoolMission){const s=sessionStorage.getItem("familybot.session");if(!s)return;setBusy(m.code);try{const r=await fetch("/api/family/sagool",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${s}`},body:JSON.stringify({type:"claim_mission",missionKey:m.code})}),x=await r.json();if(!r.ok||!x.ok)throw new Error();apply(x.data);const c=x.data.claim||{};setNote(c.alreadyClaimed?"این جایزه قبلاً دریافت شده.":c.claimed?`جایزه: +${c.xp||0} XP`: "هنوز ماموریت کامل نشده.");feedback(Boolean(c.claimed))}catch{feedback(false);setNote("دریافت جایزه انجام نشد.")}finally{setBusy("")}}
 async function equipItem(item:Inventory){const s=sessionStorage.getItem("familybot.session");if(!s)return;setBusy(`equip:${item.item_id}`);try{const r=await fetch("/api/family/sagool",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${s}`},body:JSON.stringify({type:"equip",itemId:item.item_id,equipped:!item.equipped})}),x=await r.json();if(!r.ok||!x.ok)throw new Error(x.error||"equip_failed");apply(x.data);setNote(x.data.message||"تجهیزات سگول به‌روز شد.");feedback(true)}catch(e){feedback(false);setNote(e instanceof Error&&e.message==="equip_limit"?"حداکثر ۳ آیتم را هم‌زمان می‌تونی فعال کنی.":"تغییر تجهیزات انجام نشد.")}finally{setBusy("")}}
 return <main className="appShell sagoolPage">
  <div className="ambient ambientA"/><div className="starField"/>
  {levelBurst&&<div className="levelBurst show"><div className="levelBurstCore"><div><b>✦</b><span>سگول سطح {state.level} شد</span></div></div></div>}
  <header className="appHeader"><a href="/" className="roundButton">←</a><div className="wordmark"><b>سگول</b><span>از نوزاد تا نسخه نهایی · ۱۰ سطح</span></div><IconOrb name="spark" tone="cyan"/></header>
  <section className="premiumPanel sagoolHero">
   <div className={`sagoolStage sagoolMood-${mood}`} data-stage={stage.stage} data-level={state.level}>
    <div className="sagoolAura"/>
    <img src={stage.asset} alt={`سگول سطح ${state.level} - ${stage.title}`}/>
    {equipped.map((inv,i)=>{const item=STORE_ITEMS.find(x=>x.id===inv.item_id);return item?<span key={inv.item_id} style={{position:"absolute",zIndex:4,left:i===0?"5%":i===1?"68%":"38%",top:i===2?"5%":"55%"}}><StoreItemArt itemId={item.id} size={i===2?46:56} label={item.name}/></span>:null})}
    <span className="levelPill">LV. {state.level}/10 · {stage.title}</span>
   </div>
   <div className="sagoolAdvice">
    <span className="eyebrow">پیشنهاد سگول</span>
    <h1>{sagoolAdvice(state)}</h1>
    <p>{stage.blurb} رشد فقط با مراقبت واقعی جلو می‌رود.</p>
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
     <span className="levelPill">XP {state.xp}{xp.maxed?"":` · ${xp.current}/${xp.target}`}</span>
     <span className="levelPill">سلامت {state.health}٪</span>
     {founder&&<span className="levelPill">Founder</span>}
    </div>
    <i className="need" style={{display:"block",marginTop:10}}><em style={{width:`${xp.maxed?100:Math.round(xp.current/xp.target*100)}%`}}/></i>
   </div>
  </section>
  <section className="premiumPanel sagoolNeeds">
   <h2>نیازهای اصلی</h2>
   <div className="needGrid">{bars.map(([k,t])=><div className="need" key={k}><span>{t}</span><b>{state[k]}٪</b><i><em style={{width:`${state[k]}%`}}/></i></div>)}</div>
  </section>
  <section className="sagoolActions">{CARE_ACTIONS.map(a=><button disabled={Boolean(busy)} onClick={()=>void care(a.id)} key={a.id}><img src={a.art} alt="" style={{width:54,height:54,objectFit:"cover",borderRadius:16}}/><b>{busy===a.id?"...":a.title}</b></button>)}</section>
  <section className="sagoolActions" style={{opacity:.92}}>{extraActions.map(a=><button disabled={Boolean(busy)} onClick={()=>void care(a.id)} key={a.id}><b>{busy===a.id?"...":a.title}</b></button>)}</section>
  {note&&<div className="motionToast show">{note}</div>}
  {inventory.length>0&&<section className="premiumPanel" style={{padding:16,margin:"12px 0"}}>
   <div className="sectionHeading"><div><span className="eyebrow">کمد سگول · حداکثر ۳ آیتم فعال</span><h2>تجهیزات من</h2></div><Icon name="store"/></div>
   <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8,marginTop:10}}>{inventory.map(inv=>{const item=STORE_ITEMS.find(x=>x.id===inv.item_id);if(!item)return null;return <button key={inv.item_id} onClick={()=>void equipItem(inv)} disabled={Boolean(busy)} style={{border:inv.equipped?"1px solid rgba(74,223,255,.7)":"1px solid rgba(255,255,255,.1)",background:inv.equipped?"rgba(60,194,255,.12)":"rgba(255,255,255,.04)",borderRadius:17,padding:8,color:"white",minHeight:108}}><StoreItemArt itemId={item.id} size={54}/><b style={{display:"block",fontSize:10,marginTop:4}}>{item.name}</b><small style={{display:"block",opacity:.7,marginTop:3}}>{inv.equipped?"فعال":"فعال کن"}</small></button>})}</div>
  </section>}
  <section className="premiumPanel sagoolMissions">
   <div className="sectionHeading"><div><span className="eyebrow">ماموریت‌های انفرادی</span><h2>ماموریت‌های سگول</h2></div><Icon name="tasks"/></div>
   {missions.map(m=><article key={m.code} style={{alignItems:"center"}}><div><span>{m.cadence==="weekly"?"هفتگی · ":"روزانه · "}{m.title}</span><small style={{display:"block",opacity:.65,marginTop:4}}>{m.progress}/{m.target} · +{m.rewardXp} XP</small></div><button className="primaryCta" style={{width:"auto",minWidth:82,padding:"8px 10px"}} disabled={!m.complete||m.claimed||Boolean(busy)} onClick={()=>void claim(m)}>{m.claimed?"گرفته شد":m.complete?"دریافت":"در حال انجام"}</button></article>)}
  </section>
  <a href="/section/store?tab=sagool" className="primaryCta sagoolShopLink">فروشگاه سگول ←</a>
 </main>;
}
