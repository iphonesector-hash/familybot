"use client";
import type {CSSProperties} from "react";

type Atlas="store"|"app";
export default function SpriteAsset({atlas="store",index,size=72,className="",label}:{atlas?:Atlas;index:number;size?:number;className?:string;label?:string}){
  const cols=atlas==="store"?5:4,rows=2,col=index%cols,row=Math.floor(index/cols)%rows;
  const style:CSSProperties={display:"inline-block",width:size,height:size,flex:`0 0 ${size}px`,backgroundImage:`url(${atlas==="store"?"/assets/store-atlas.png":"/assets/app-icons.png"})`,backgroundRepeat:"no-repeat",backgroundSize:`${cols*size}px ${rows*size}px`,backgroundPosition:`-${col*size}px -${row*size}px`};
  return <span className={className} style={style} role={label?"img":undefined} aria-label={label}/>;
}
