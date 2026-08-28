"use client";

import { useEffect, useState } from "react";
import { Icon } from "../ui";

export default function ReminderShortcut(){const [href,setHref]=useState("/admin/reminders");useEffect(()=>{const session=new URLSearchParams(window.location.search).get("session");if(session)setHref(`/admin/reminders?session=${encodeURIComponent(session)}`)},[]);if(typeof window!=="undefined"&&window.location.pathname.startsWith("/admin/reminders"))return null;return <a href={href} aria-label="تنظیمات اعلان‌ها" style={{position:"fixed",left:"max(14px,env(safe-area-inset-left))",bottom:"max(22px,calc(env(safe-area-inset-bottom) + 14px))",zIndex:80,width:54,height:54,borderRadius:18,display:"grid",placeItems:"center",background:"linear-gradient(145deg,#6241ff,#9e43dc)",border:"1px solid rgba(255,255,255,.2)",boxShadow:"0 16px 38px rgba(44,20,116,.42)",color:"white"}}><Icon name="reminder"/></a>}
