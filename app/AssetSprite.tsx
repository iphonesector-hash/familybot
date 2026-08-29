"use client";
import type {CSSProperties} from "react";

export default function AssetSprite({index,size=86,className="",label,style}:{index:number;size?:number;className?:string;label?:string;style?:CSSProperties}){
  const col=index%5,row=Math.floor(index/5);
  return <span
    className={`assetSprite ${className}`}
    role={label?"img":undefined}
    aria-label={label}
    style={{
      width:size,height:size,display:"inline-block",flex:"0 0 auto",
      backgroundImage:"url('/assets/store/jahani-store-atlas.png')",
      backgroundRepeat:"no-repeat",backgroundSize:"500% 200%",
      backgroundPosition:`${col*25}% ${row*100}%`,
      filter:"drop-shadow(0 12px 22px rgba(0,0,0,.35))",
      ...style
    }}
  />;
}
