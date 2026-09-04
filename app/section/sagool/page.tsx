"use client";
import {useEffect,useMemo,useState} from "react";
import {Icon,IconOrb} from "../../ui";
import Accordion from "../../ui/Accordion";
import StoreItemArt from "../../StoreItemArt";
import {SagoolMission,SagoolState,sagoolAdvice,stageFor} from "@/lib/sagoolCatalog";
import {CARE_ACTIONS,SAGOOL_LEVELS,sagoolMoodFromNeeds,sagoolXpProgress} from "@/lib/sagoolProgression";
import {STORE_ITEMS} from "@/lib/storeCatalog";

type Inventory={item_id:string;quantity:number;equipped:boolean;acquired_at:string};
const fallback:SagoolState={stage:"puppy",level:1,xp:0,hunger:72,thirst:70,energy:80,hygiene:76,happiness:78,affection:50,health:100};
const bars:Array<[keyof Pick<SagoolState,"hunger"|"thirst"|"energy"|"happiness">,string]> = [["hunger","غذا"],["thirst","آب"],["happiness","بازی"],["energy","خواب"]];
const extraActions=[{id:"clean",title:"حمام"},{id:"pet",title:"نوازش"},{id:"walk",title:"پیاده‌روی"},{id:"train",title:"آموزش"}];
const ALL_ACTIONS=[...CARE_ACTIONS.map(a=>({id:a.id,title:a.title,art:a.art})),...extraActions.map(a=>({id:a.id,title:a.title,art:""}))];
const fa=(n:number)=>new Intl.NumberFormat("fa-IR").format(n||0);
function fmt(ms:number){const s=Math.max(0,Math.ceil(ms/1000));return `00:${String(s).padStart(2,"0")}`}

function feedback(success=true){try{navigator.vibrate?.(success?[18,25,18]:[50]);const W=window as Window & {webkitAudioContext?:typeof AudioContext};const C=window.AudioContext||W.webkitAudioContext;if(!C)return;const c=new C(),o=c.createOscillator(),g=c.createGain();o.type="sine";o.frequency.value=success?660:180;g.gain.setValueAtTime(.0001,c.currentTime);g.gain.exponentialRampToValueAtTime(.07,c.currentTime+.015);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+.16);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+.17)}catch{}}

export default function SagoolPage(){
 const[state,setState]=useState(fallback),[missions,setMissions]=useState<SagoolMission[]>([]),[inventory,setInventory]=useState<Inventory[]>([]),[founder,setFounder]=useState(false),[busy,setBusy]=useState(""),[note,setNote]=useState(""),[lastAction,setLastAction]=useState(""),[levelBurst,setLevelBurst]=useState(false),[cool,setCool]=useState<Record<string,number>>({}),[tick,setTick]=useState(0);
 const stage=useMemo(()=>stageFor(state.level),[state.level]);
 const xp=useMemo(()=>sagoolXpProgress(state.xp),[state.xp]);
 const mood=useMemo(()=>sagoolMoodFromNeeds(state,lastAction),[state,lastAction]);
 const equipped=useMemo(()=>inventory.filter(x=>x.equipped).slice(0,3),[inventory]);
 function apply(d:any){
  if(!d)return;
  if(d.state)setState(d.state);
  if(Array.isArray(d.missions))setMissions(d.missions);
  if(Array.isArray(d.inventory))setInventory(d.inventory);
  if(typeof d.founder==="boolean")setFounder(Boolean(d.founder));
  if(d.cooldowns&&typeof d.cooldowns==="object"){
    const next:Record<string,number>={};
    for(const [k,v] of Object.entries(d.cooldowns)) next[k]=Date.now()+Math.max(0,Number(v)||0);
    setCool(next);
  }
 }
 async function load(){const s=sessionStorage.getItem("familybot.session");if(!s)return;try{const r=await fetch("/api/family/sagool",{headers:{authorization:`Bearer ${s}`},cache:"no-store"}),x=await r.json();if(x.ok)apply(x.data)}catch{}}
 useEffect(()=>{void load()},[]);
 useEffect(()=>{const id=window.setInterval(()=>setTick(t=>t+1),250);return()=>window.clearInterval(id)},[]);
 const remain=(id:string)=>Math.max(0,(cool[id]||0)-Date.now());
 async function care(action:string){if(busy||remain(action)>0)return;const s=sessionStorage.getItem("familybot.session");if(!s)return setNote("Mini App را از داخل بله باز کن.");setBusy(action);setCool(c=>({...c,[action]:Date.now()+20_000}));try{const r=await fetch("/api/family/sagool",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${s}`},body:JSON.stringify({type:"interact",action})}),x=await r.json();if(!r.ok||!x.ok)throw new Error(x.error||"failed");feedback(true);setLastAction(action);apply(x.data);if(x.data.leveledUp){setLevelBurst(true);setTimeout(()=>setLevelBurst(false),2200);setNote(`سگول سطح ${x.data.newLevel} شد!`)}else setNote(x.data.message||"سگول خوشحال شد.")}catch(e){feedback(false);setNote(e instanceof Error&&e.message==="sagool_cooldown"?"این کار هنوز در کول‌داون است.":"این کار فعلاً انجام نشد.");void load()}finally{setBusy("")}}
 async function claim(m:SagoolMission){const s=sessionStorage.getItem("familybot.session");if(!s)return;setBusy(m.code);try{const r=await fetch("/api/family/sagool",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${s}`},body:JSON.stringify({type:"claim_mission",missionKey:m.code})}),x=await r.json();if(!r.ok||!x.ok)throw new Error();apply(x.data);const c=x.data.claim||{};setNote(c.alreadyClaimed?"این جایزه قبلاً دریافت شده.":c.claimed?`جایزه: +${c.xp||0} XP`:"هنوز ماموریت کامل نشده.")}catch{setNote("دریافت جایزه انجام نشد.")}finally{setBusy("")}}
 async function equipItem(item:Inventory){const s=sessionStorage.getItem("familybot.session");if(!s)return;setBusy(`equip:${item.item_id}`);try{const r=await fetch("/api/family/sagool",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${s}`},body:JSON.stringify({type:"equip",itemId:item.item_id,equipped:!item.equipped})}),x=await r.json();if(!r.ok||!x.ok)throw new Error(x.error||"equip_failed");apply(x.data);setNote(x.data.message||"تجهیزات سگول به‌روز شد.")}catch(e){setNote(e instanceof Error&&e.message==="equip_limit"?"حداکثر ۳ آیتم را هم‌زمان می‌تونی فعال کنی.":"تغییر تجهیزات انجام نشد.")}finally{setBusy("")}}
 const sagoolStore=STORE_ITEMS.filter(x=>x.kind==="sagool");
 const openMissions=missions.filter(m=>!m.claimed).length;
 return <main className="appShell sagoolPage">
  <div className="ambient ambientA"/><div className="starField"/>
  {levelBurst&&<div className="levelBurst show"><div className="levelBurstCore"><div><b>✦</b><span>سگول سطح {state.level} شد</span></div></div></div>}
  <header className="appHeader"><a href="/" className="roundButton">←</a><div className="wordmark"><b>سگول</b><span>۱۰ سطح رشد واقعی</span></div><IconOrb name="spark" tone="cyan"/></header>
  <section className="premiumPanel sagoolHero">
   <div className={`sagoolStage sagoolMood-${mood}`} data-stage={stage.stage} data-level={state.level}>
    <div className="sagoolAura"/>
    <img src={stage.asset} alt={`سگول سطح ${state.level} - ${stage.title}`}/>
    {equipped.map((inv,i)=>{const item=STORE_ITEMS.find(x=>x.id===inv.item_id);return item?<span key={inv.item_id} style={{position:"absolute",zIndex:4,left:i===0?"5%":i===1?"68%":"38%",top:i===2?"5%":"55%"}}><StoreItemArt itemId={item.id} size={i===2?46:56} label={item.name}/></span>:null})}
    <span className="levelPill">LV. {fa(state.level)}/۱۰ · {stage.title}</span>
   </div>
   <div className="sagoolAdvice">
    <span className="eyebrow">حال سگول</span>
    <h1>{sagoolAdvice(state)}</h1>
    <p>{stage.blurb}</p>
    <span className="levelPill">XP {fa(state.xp)}{xp.maxed?"":` · ${fa(xp.current)}/${fa(xp.target)}`}</span>
    <i className="need" style={{display:"block",marginTop:10}}><em style={{width:`${xp.maxed?100:Math.round(xp.current/xp.target*100)}%`}}/></i>
   </div>
  </section>

  <Accordion title="نیازهای اصلی" summary="غذا، آب، بازی، خواب" icon="♡" defaultOpen>
   <div className="needGridPremium">{bars.map(([k,t])=>{const v=Number(state[k]||0);return <div className={`needMeter${v<32?" critical":""}`} key={k}><span>{t}</span><b>{fa(v)}٪</b><i><em style={{width:`${v}%`}}/></i></div>})}</div>
  </Accordion>

  <Accordion title="مراقبت از سگول" summary="هر کار ۲۰ ثانیه کول‌داون دارد" icon="✦" defaultOpen>
   <div className="actionGrid">{ALL_ACTIONS.map(a=>{const left=remain(a.id);const locked=left>0||Boolean(busy);return <button className="coolBtn" disabled={locked} onClick={()=>void care(a.id)} key={a.id}>{a.art?<img src={a.art} alt="" style={{width:36,height:36,objectFit:"contain",borderRadius:10}}/>:null}<b>{busy===a.id?"...":a.title}</b><small>{left>0?`آماده در ${fmt(left)}`:"آماده"}</small></button>})}</div>
  </Accordion>

  <Accordion title="ماموریت‌های من" summary={`${fa(openMissions)} ماموریت باز`} icon="★">
   {missions.length?missions.map(m=><article className="missionCard" key={m.code}><div><b>{m.title}</b><small style={{display:"block",color:"#b7add4"}}>{m.description||`${m.progress}/${m.target}`} · +{fa(m.rewardXp)} XP</small><i className="need" style={{display:"block",marginTop:6}}><em style={{width:`${Math.round(m.progress/Math.max(1,m.target)*100)}%`}}/></i></div><button className="primaryCta" style={{width:"auto",minWidth:78,padding:"8px 10px"}} disabled={!m.complete||m.claimed||Boolean(busy)} onClick={()=>void claim(m)}>{m.claimed?"گرفته شد":m.complete?"دریافت":`${m.progress}/${m.target}`}</button></article>):<p>ماموریتی فعال نیست.</p>}
  </Accordion>

  <Accordion title="مسیر رشد سگول" summary={`سطح ${fa(state.level)} از ۱۰`} icon="▲">
   <p style={{fontSize:13,lineHeight:1.9,marginTop:0}}>با غذا، آب، بازی و خواب XP می‌گیری. هر کار ۲۰ ثانیه کول‌داون دارد تا سگول خسته نشود. ماموریت‌ها XP و سکه اضافه می‌دهند. رسیدن به آستانه XP یعنی ارتقای سطح.</p>
   <p style={{fontSize:12,color:"#c9bfd8"}}>سطح فعلی {fa(state.level)} · XP {fa(state.xp)}{xp.maxed?" · حداکثر رشد":` · تا سطح بعد ${fa(xp.target-xp.current)}`}</p>
   <div className="growthTrack">{SAGOOL_LEVELS.map(l=><span className={l.level<=state.level?"on":""} key={l.level}>{fa(l.level)}</span>)}</div>
  </Accordion>

  <Accordion title="فروشگاه سگول" summary={`${fa(sagoolStore.length)} آیتم مراقبت`} icon="◉">
   <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8}}>{sagoolStore.slice(0,8).map(item=><a key={item.id} href="/section/store?tab=sagool" className="needMeter" style={{textDecoration:"none",color:"inherit"}}><StoreItemArt itemId={item.id} size={54} label={item.name}/><b>{item.name}</b><small>{founder?"∞":`${fa(item.price)} سکه`}</small></a>)}</div>
   <a className="primaryCta" href="/section/store?tab=sagool" style={{marginTop:10}}>همه آیتم‌های سگول</a>
  </Accordion>

  <Accordion title="موجودی / آیتم‌ها" summary={`${fa(inventory.length)} آیتم · حداکثر ۳ فعال`} icon="▣">
   {inventory.length?<div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8}}>{inventory.map(inv=>{const item=STORE_ITEMS.find(x=>x.id===inv.item_id);if(!item)return null;return <button key={inv.item_id} onClick={()=>void equipItem(inv)} disabled={Boolean(busy)} style={{border:inv.equipped?"1px solid rgba(74,223,255,.7)":"1px solid rgba(255,255,255,.1)",background:inv.equipped?"rgba(60,194,255,.12)":"rgba(255,255,255,.04)",borderRadius:17,padding:8,color:"white",minHeight:108}}><StoreItemArt itemId={item.id} size={48}/><b style={{display:"block",fontSize:10,marginTop:4}}>{item.name}</b><small>{inv.equipped?"فعال":"فعال کن"}</small></button>})}</div>:<p>هنوز آیتمی نداری. از فروشگاه سگول شروع کن.</p>}
  </Accordion>
  {note&&<div className="motionToast show">{note}</div>}
 </main>;
}
