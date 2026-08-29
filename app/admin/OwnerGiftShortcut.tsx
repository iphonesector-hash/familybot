"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {Icon} from "../ui";

export default function OwnerGiftShortcut(){
  const[canGift,setCanGift]=useState(false);
  useEffect(()=>{const s=sessionStorage.getItem("familybot.session")||"";if(!s)return;fetch("/api/family/owner-gift",{headers:{authorization:`Bearer ${s}`},cache:"no-store"}).then(r=>setCanGift(r.ok)).catch(()=>setCanGift(false))},[]);
  return <section className="adminPanel premiumPanel" style={{marginTop:14}}><div className="sectionHeading"><div><span className="eyebrow"><Icon name="gift" size={14}/> میانبرهای مدیریت</span><h2>خوش‌آمد و هدیه</h2><p>دسترسی مستقیم به تنظیمات روزمره خانواده.</p></div></div><div style={{display:"grid",gridTemplateColumns:canGift?"repeat(2,minmax(0,1fr))":"1fr",gap:8,marginTop:10}}><Link href="/admin/welcome" className="primaryCta" style={{justifyContent:"center",minHeight:46}}>👋 ویرایش Welcome</Link>{canGift&&<Link href="/admin/owner-gifts" className="primaryCta" style={{justifyContent:"center",minHeight:46}}>🎁 Gifts · سکه / XP</Link>}</div></section>
}
