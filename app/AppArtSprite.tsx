"use client";
import type {CSSProperties} from "react";
const COUNT=6;
export default function AppArtSprite({index,size=62,label,className="",style}:{index:number;size?:number;label?:string;className?:string;style?:CSSProperties}){const i=Math.max(0,Math.min(COUNT-1,index));return <span className={`appArtSprite ${className}`} role={label?"img":undefined} aria-label={label} style={{width:size,height:size,display:"inline-block",flex:"0 0 auto",backgroundImage:"url('/assets/icons/jahani-home-atlas.png')",backgroundRepeat:"no-repeat",backgroundSize:`${COUNT*100}% 100%`,backgroundPosition:`${i*(100/(COUNT-1))}% 0`,filter:"drop-shadow(0 10px 20px rgba(49,207,255,.2))",...style}}/>}
