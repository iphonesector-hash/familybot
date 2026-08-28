"use client";

import { useCallback, useEffect, useState } from "react";
import FamilyActions from "../../FamilyActions";
import { Icon, IconOrb, Mascot } from "../../ui";

type Owned={id:string;item_id:string;item_name:string;item_kind:string};
export default function StorePage(){const [coins,setCoins]=useState(0),[owned,setOwned]=useState<Owned[]>([]),[live,setLive]=useState(false);
  const load=useCallback(()=>{const session=sessionStorage.getItem("familybot.session");if(!session)return;fetch("/api/family/dashboard",{headers:{authorization:`Bearer ${session}`},cache:"no-store"}).then(r=>r.json()).then(x=>{if(x.ok&&x.dashboard){setCoins(x.dashboard.profile?.coins||0);setOwned(x.dashboard.ownedItems||[]);setLive(true)}}).catch(()=>undefined)},[]);useEffect(()=>load(),[load]);
  return <main className="appShell"><div className="ambient ambientA"/><div className="starField"/><header className="appHeader"><a className="roundButton" href="/section/house">←</a><div className="wordmark"><b>فروشگاه</b><span>{live?"خرید واقعی با Family Coin":"آیتم‌های Family House"}</span></div><IconOrb name="store" tone="violet"/></header>
    <section className="premiumPanel" style={{padding:20,minHeight:205,display:"grid",gridTemplateColumns:"1.15fr .85fr",alignItems:"center"}}><div><span className="eyebrow"><Icon name="coins" size={14}/> موجودی {new Intl.NumberFormat("fa-IR").format(coins)}</span><h1 style={{fontSize:27,margin:"12px 0 6px"}}>خونه‌تون رو خاص‌تر کنید</h1><p style={{fontSize:12,lineHeight:1.9,color:"#b9b0cf"}}>خریدها مستقیم از کیف پول عضو کم می‌شوند و در مالکیت دائمی او ثبت می‌شوند.</p></div><Mascot small/></section>
    <FamilyActions mode="store" coins={coins} onChanged={load}/>
    <section className="adminPanel premiumPanel" style={{marginTop:14}}><div className="sectionHeading"><div><span className="eyebrow"><Icon name="gift" size={14}/> دارایی‌های من</span><h2>{new Intl.NumberFormat("fa-IR").format(owned.length)} آیتم</h2></div></div>{owned.length?<div className="dashboardGrid">{owned.map(x=><article className="dashboardCard" key={x.id}><IconOrb name={x.item_kind==="house"?"home":"trophy"} tone="violet"/><div><h2>{x.item_name}</h2><p>خریداری‌شده · دائمی</p></div></article>)}</div>:<p style={{fontSize:12,color:"#aaa1c2"}}>هنوز آیتمی نخریدی.</p>}</section>
  </main>}
