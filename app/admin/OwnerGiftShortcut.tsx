"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
export default function OwnerGiftShortcut(){const[visible,setVisible]=useState(false);useEffect(()=>{const s=sessionStorage.getItem("familybot.session")||"";if(!s)return;fetch("/api/family/owner-gift",{headers:{authorization:`Bearer ${s}`},cache:"no-store"}).then(r=>setVisible(r.ok)).catch(()=>setVisible(false))},[]);if(!visible)return null;return <Link href="/admin/owner-gifts" className="primaryCta" style={{position:"fixed",left:18,bottom:88,zIndex:30,boxShadow:"0 10px 35px rgba(91,48,180,.45)"}}>🎁 هدیه Owner</Link>}
