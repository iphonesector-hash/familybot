"use client";
import {useEffect,useState,type CSSProperties} from "react";
// JAHANI visual phase: embedded asset bridge for preview-safe image delivery.
const cache=new Map<string,string>();
function hexToUrl(hex:string,mime:string){const key=mime+hex.slice(0,64)+hex.length;if(cache.has(key))return cache.get(key)!;const bytes=new Uint8Array(hex.length/2);for(let i=0;i<bytes.length;i++)bytes[i]=parseInt(hex.slice(i*2,i*2+2),16);const url=URL.createObjectURL(new Blob([bytes],{type:mime}));cache.set(key,url);return url}
export default function HexImage({src,alt="",className="",style}:{src:string;alt?:string;className?:string;style?:CSSProperties}){const[url,setUrl]=useState("");useEffect(()=>{let live=true;fetch(src,{cache:"force-cache"}).then(r=>{if(!r.ok)throw new Error("asset");return r.text()}).then(hex=>{if(live)setUrl(hexToUrl(hex.trim(),"image/jpeg"))}).catch(()=>{});return()=>{live=false}},[src]);return url?<img src={url} alt={alt} className={className} style={style}/>:<span className={`${className} hexImageSkeleton`} aria-label={alt}/>}
