"use client";
import type {CSSProperties} from "react";

type Atlas="store"|"app";
export default function SpriteAsset({atlas="store",index,size=72,className="",label}:{atlas?:Atlas;index:number;size?:number;className?:string;label?:string}){
  const cols=atlas==="store"?5:4,rows=2,col=index%cols,row=Math.floor(index/cols)%rows;
  const store=atlas==="store";
  const style:CSSProperties={display:"inline-block",width:size,height:size,flex:`0 0 ${size}px`,backgroundImage:`url(${store?"/assets/store/jahani-store-atlas.png":"/assets/app-icons.png"})`,backgroundRepeat:"no-repeat",backgroundSize:store?"500% 200%":`${cols*size}px ${rows*size}px`,backgroundPosition:store?`${col*25}% ${row*100}%`:`-${col*size}px -${row*size}px`,filter:store?"drop-shadow(0 12px 22px rgba(0,0,0,.35))":undefined};
  return <span className={className} style={style} role={label?"img":undefined} aria-label={label}/>;
}
