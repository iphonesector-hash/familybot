"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {Icon} from "../../ui";
import {matchWheelIndex,wheelDelta} from "@/lib/familyTree";
import "./wheel.css";

type Reward={kind:"coins"|"xp"|"item";amount:number;label:string;itemId?:string;itemName?:string;itemKind?:string};
type Status={eligible:boolean;nextAt:string|null;rewards:Reward[]};
const fa=(n:number)=>new Intl.NumberFormat("fa-IR").format(n);
const FALLBACK:Reward[]=[
  {kind:"coins",amount:15,label:"۱۵ سکه"},
  {kind:"xp",amount:10,label:"۱۰ XP"},
  {kind:"coins",amount:25,label:"۲۵ سکه"},
  {kind:"xp",amount:20,label:"۲۰ XP"},
  {kind:"coins",amount:50,label:"۵۰ سکه"},
  {kind:"xp",amount:40,label:"۴۰ XP"},
  {kind:"item",amount:1,label:"استخوان کهکشانی",itemId:"sagool_bone"},
  {kind:"item",amount:1,label:"قاب عکس خانواده",itemId:"family_photo_frame"},
  {kind:"coins",amount:100,label:"۱۰۰ سکه"},
  {kind:"item",amount:1,label:"نشان جهانی",itemId:"cosmic_badge"},
];
const COLORS=["#2a1678","#12335f","#4a1468","#17324a","#3b1a7a","#1c2b63","#5a1858","#14284d","#46208a","#0f3a4a"];

function shortLabel(r:Reward){
  if(r.kind==="coins")return fa(r.amount);
  if(r.kind==="xp")return `XP ${fa(r.amount)}`;
  if(r.itemId==="sagool_bone")return "استخوان";
  if(r.itemId==="family_photo_frame")return "قاب";
  if(r.itemId==="cosmic_badge")return "نشان";
  return "آیتم";
}
function polar(cx:number,cy:number,r:number,deg:number){
  const a=(deg-90)*Math.PI/180;
  return [cx+r*Math.cos(a),cy+r*Math.sin(a)] as const;
}
function slicePath(i:number,n:number){
  const slice=360/n,a0=i*slice,a1=(i+1)*slice;
  const [x0,y0]=polar(100,100,96,a0);
  const [x1,y1]=polar(100,100,96,a1);
  const large=slice>180?1:0;
  return `M100 100 L${x0} ${y0} A96 96 0 ${large} 1 ${x1} ${y1} Z`;
}

export default function WheelPage(){
  const[status,setStatus]=useState<Status|null>(null);
  const[busy,setBusy]=useState(false);
  const[rotation,setRotation]=useState(0);
  const[spinning,setSpinning]=useState(false);
  const[reward,setReward]=useState<Reward|null>(null);
  const[winIndex,setWinIndex]=useState<number|null>(null);
  const[msg,setMsg]=useState("");
  const[now,setNow]=useState(()=>Date.now());
  const session=()=>sessionStorage.getItem("familybot.session")||"";
  const load=useCallback(async()=>{
    const s=session();if(!s)return;
    const r=await fetch("/api/family/spin",{headers:{authorization:`Bearer ${s}`},cache:"no-store"});
    const d=await r.json();
    if(d.ok)setStatus(d);
  },[]);
  useEffect(()=>{void load()},[load]);
  useEffect(()=>{const id=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(id)},[]);
  useEffect(()=>{
    if(status?.nextAt&&!status.eligible&&now>=new Date(status.nextAt).getTime()){
      setStatus(x=>x?{...x,eligible:true,nextAt:null}:x);
    }
  },[now,status?.eligible,status?.nextAt]);
  const labels=status?.rewards?.length?status.rewards:FALLBACK;
  async function spin(){
    const s=session();
    if(!s)return setMsg("Mini App را از داخل بله باز کن.");
    if(!status?.eligible||busy)return;
    setBusy(true);setSpinning(true);setReward(null);setWinIndex(null);setMsg("");
    try{
      const r=await fetch("/api/family/spin",{method:"POST",headers:{authorization:`Bearer ${s}`}});
      const d=await r.json();
      if(!r.ok||!d.ok)throw new Error(d.error||"spin_failed");
      const won=d.reward as Reward;
      const index=matchWheelIndex(labels,won);
      const delta=wheelDelta(rotation,index,labels.length,6);
      setRotation(v=>v+delta);
      window.setTimeout(()=>{
        setReward(won);
        setWinIndex(index);
        setStatus(x=>x?{...x,eligible:false,nextAt:d.nextAt}:x);
        setNow(Date.now());
        setSpinning(false);
        setBusy(false);
      },4500);
    }catch(e){
      setBusy(false);setSpinning(false);
      const m=e instanceof Error?e.message:"spin_failed";
      setMsg(m==="spin_cooldown"?"گردونه امروزت استفاده شده؛ بعد از پایان ۲۴ ساعت دوباره برگرد.":"گردونه اجرا نشد.");
      if(m==="spin_cooldown")void load();
    }
  }
  const wait=status?.nextAt&&!status.eligible?Math.max(0,new Date(status.nextAt).getTime()-now):0;
  const hours=Math.floor(wait/3600000),minutes=Math.floor(wait%3600000/60000),seconds=Math.floor(wait%60000/1000);
  const n=labels.length;
  const glyphs=useMemo(()=>labels.map((r,i)=>{
    const mid=i*(360/n)+(360/n)/2;
    const [x,y]=polar(100,100,62,mid);
    return {r,x,y,i};
  }),[labels,n]);
  return <main className="appShell wheelPage">
    <div className="ambient ambientA"/><div className="starField"/>
    <header className="appHeader">
      <Link className="roundButton" href="/">←</Link>
      <div className="wordmark"><b>گردونه شانس</b><span>یک بار در هر ۲۴ ساعت</span></div>
      <span className="profileAvatar"><Icon name="wheel"/></span>
    </header>
    {msg&&<div className="adminNotice">{msg}</div>}
    <section className="wheelStage">
      <div className="wheelGlow"/>
      <div className="wheelFrame">
        <div className="wheelPointer" aria-hidden="true"><b/><i/></div>
        <div className="wheelRim"/>
        <div className={`wheelDisc${spinning?" spinning":""}`} style={{transform:`rotate(${rotation}deg)`}}>
          <svg viewBox="0 0 200 200">
            <defs>
              <filter id="wheelGlow"><feGaussianBlur stdDeviation="1.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>
            {labels.map((r,i)=><path key={`${r.kind}-${r.itemId||r.amount}-${i}`} d={slicePath(i,n)} fill={COLORS[i%COLORS.length]} stroke="rgba(255,232,180,.28)" strokeWidth="1.2" className={winIndex===i?"wheelWinPulse":""}/>)}
            <circle cx="100" cy="100" r="27" fill="#12081f" stroke="rgba(255,214,140,.55)" strokeWidth="3"/>
            {glyphs.map(g=><text key={g.i} x={g.x} y={g.y} textAnchor="middle" dominantBaseline="middle" fill="#fff4d4" fontSize="9" fontWeight="800">{shortLabel(g.r)}</text>)}
          </svg>
        </div>
        <button className="wheelHub" disabled={busy||!status?.eligible} onClick={()=>void spin()}>
          {busy?"چرخش":status?.eligible?"بچرخون":"قفل"}
          <small>{status?.eligible?"۲۴ساعته":"صبر کن"}</small>
        </button>
      </div>
    </section>
    <section className="premiumPanel" style={{padding:16,textAlign:"center"}}>
      {status?.eligible
        ? <><p className="wheelReady">آماده چرخش</p><p style={{fontSize:12,color:"#bcaed4"}}>جایزه فقط بعد از تأیید سرور اضافه می‌شود.</p></>
        : <><p>چرخش بعدی</p><div className="countdownRow"><div className="countdownUnit"><b>{fa(hours)}</b><span>ساعت</span></div><div className="countdownUnit"><b>{fa(minutes)}</b><span>دقیقه</span></div><div className="countdownUnit"><b>{fa(seconds)}</b><span>ثانیه</span></div></div></>}
    </section>
    {reward&&<section className="premiumPanel wheelRewardCard">
      <span className="eyebrow">جایزه این چرخش</span>
      <strong>{reward.label}</strong>
      <p>{reward.kind==="coins"?"به Family Coin اضافه شد":reward.kind==="xp"?"به XP پروفایلت اضافه شد":"به دارایی‌های فروشگاهت اضافه شد"}</p>
    </section>}
    <section className="premiumPanel" style={{padding:14,marginTop:12}}>
      <span className="eyebrow">جدول جوایز</span>
      <div className="wheelLegend">
        {labels.map((r,i)=><div key={`${r.kind}-${r.itemId||r.amount}-${i}`}>
          <b>{shortLabel(r)}</b>
          <span>{r.label}</span>
        </div>)}
      </div>
    </section>
  </main>;
}
