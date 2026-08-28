"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {Icon,IconOrb} from "../ui";

export default function OwnerGiftShortcut(){
  const[visible,setVisible]=useState(false);
  useEffect(()=>{const s=sessionStorage.getItem("familybot.session")||"";if(!s)return;fetch("/api/family/owner-gift",{headers:{authorization:`Bearer ${s}`},cache:"no-store"}).then(r=>setVisible(r.ok)).catch(()=>setVisible(false))},[]);
  if(!visible)return null;
  return <Link href="/admin/owner-gifts" className="adminPanel premiumPanel" style={{display:"block",marginTop:14,textAlign:"right"}}><div className="sectionHeading"><div><span className="eyebrow"><Icon name="gift" size={14}/> فقط مدیر اصلی</span><h2>هدیه سکه یا XP</h2><p>عضو را انتخاب کن، مقدار و دلیل را بنویس؛ همه هدیه‌ها در Audit Log ثبت می‌شوند.</p></div><IconOrb name="gift" tone="gold"/></div></Link>
}