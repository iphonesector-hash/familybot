"use client";
import {useEffect,useState} from "react";

export default function Avatar({src,alt="",size=48,fallback="✦"}:{src?:string|null;alt?:string;size?:number;fallback?:string}){
  const [broken,setBroken]=useState(false);
  useEffect(()=>setBroken(false),[src]);
  const show=Boolean(src)&&!broken;
  return (
    <span className="jahaniAvatar" style={{width:size,height:size}}>
      {show
        ? <img src={src||""} alt={alt} referrerPolicy="no-referrer" onError={()=>setBroken(true)}/>
        : <b aria-hidden>{fallback}</b>}
    </span>
  );
}
