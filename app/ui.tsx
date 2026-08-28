import type { ReactNode } from "react";

export type IconName = "home"|"family"|"games"|"ai"|"profile"|"birthday"|"memories"|"reminder"|"gift"|"store"|"tasks"|"trophy"|"coins"|"calendar"|"tree"|"poll"|"shield"|"spark";
export type MascotMood = "idle"|"listening"|"thinking"|"speaking"|"celebrate"|"sleepy"|"love";

const paths: Record<IconName, ReactNode> = {
  home:<><path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"/><path d="M9.5 9.3 12 11l2.5-1.7"/></>,
  family:<><circle cx="8" cy="9" r="3"/><circle cx="16.5" cy="10" r="2.5"/><path d="M2.5 20c.4-4 2.4-6 5.5-6s5.1 2 5.5 6M13 20c.3-3 1.8-4.5 4.3-4.5s4 1.5 4.2 4.5"/></>,
  games:<><rect x="3" y="7" width="18" height="11" rx="5"/><path d="M8 11v4M6 13h4M15.5 12.2h.01M18 14.7h.01"/></>,
  ai:<><rect x="4" y="5" width="16" height="14" rx="6"/><path d="M9 12h.01M15 12h.01M9 15c2 1.5 4 1.5 6 0M12 2v3"/></>,
  profile:<><circle cx="12" cy="8" r="4"/><path d="M4 21c.7-4.5 3.4-7 8-7s7.3 2.5 8 7"/></>,
  birthday:<><path d="M5 11h14v10H5zM4 11h16M8 11V8h8v3"/><path d="M9 8V6m6 2V6M9 4h.01M15 4h.01"/></>,
  memories:<><rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="9" r="1.5"/><path d="m6 17 4-4 3 3 2-2 3 3"/></>,
  reminder:<><path d="M6 10a6 6 0 0 1 12 0v4l2 3H4l2-3z"/><path d="M10 20h4"/></>,
  gift:<><path d="M4 10h16v11H4zM3 7h18v4H3zM12 7v14"/><path d="M12 7c-1-3-5-3-5-1 0 1.5 2.5 1.8 5 1M12 7c1-3 5-3 5-1 0 1.5-2.5 1.8-5 1"/></>,
  store:<><path d="M5 9h14l-1 12H6zM8 9a4 4 0 0 1 8 0"/></>,
  tasks:<><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 9l1 1 2-2M9 14l1 1 2-2M13.5 9H16M13.5 14H16"/></>,
  trophy:<><path d="M8 4h8v4c0 4-1.5 6-4 6s-4-2-4-6zM10 14v3h4v-3M8 20h8"/><path d="M8 6H4v2c0 2 1.5 3 4 3M16 6h4v2c0 2-1.5 3-4 3"/></>,
  coins:<><ellipse cx="12" cy="7" rx="6" ry="3"/><path d="M6 7v4c0 1.7 2.7 3 6 3s6-1.3 6-3V7M6 11v4c0 1.7 2.7 3 6 3s6-1.3 6-3v-4"/></>,
  calendar:<><rect x="4" y="6" width="16" height="14" rx="3"/><path d="M8 3v6M16 3v6M4 10h16"/></>,
  tree:<><circle cx="12" cy="7" r="3"/><circle cx="6" cy="16" r="3"/><circle cx="18" cy="16" r="3"/><path d="M12 10v3M6 13h12M6 13v0M18 13v0"/></>,
  poll:<><path d="M5 20V9M12 20V4M19 20v-7"/></>,
  shield:<><path d="M12 3 19 6v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="m9 12 2 2 4-4"/></>,
  spark:<><path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5zM18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z"/></>,
};

export function Icon({name,size=24,className=""}:{name:IconName,size?:number,className?:string}){
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function IconOrb({name,tone="violet"}:{name:IconName,tone?:"violet"|"blue"|"pink"|"gold"|"cyan"}){
  return <span className={`iconOrb ${tone}`}><Icon name={name}/></span>;
}

export function Mascot({small=false,mood="idle",label}:{small?:boolean;mood?:MascotMood;label?:string}){
  return <div className={`mascotVisual${small?" small":""} mascot-${mood}`} aria-label={label??`Family Bot - ${mood}`}>
    <span className="mascotHalo"/>
    <span className="mascotOrbit orbitOne"/><span className="mascotOrbit orbitTwo"/>
    <img src="/brand/familybot-mark.svg" alt="Family Bot"/>
    <span className="mascotMoodBadge" aria-hidden="true">{mood==="listening"?"⌁":mood==="thinking"?"…":mood==="speaking"?"♫":mood==="celebrate"?"✦":mood==="sleepy"?"zZ":mood==="love"?"♥":""}</span>
    <span className="mascotSpark s1"/><span className="mascotSpark s2"/><span className="mascotSpark s3"/>
    <span className="mascotShadow"/>
  </div>;
}
