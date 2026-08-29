"use client";
import type {CSSProperties} from "react";

type Atlas="store"|"app";
const byLabel=(label="")=>{
 const rules:[RegExp,string][]=[[/مبل/,"🛋️"],[/ساعت/,"🕰️"],[/فواره|آبنما/,"⛲"],[/فانوس|لوستر|چراغ/,"🏮"],[/گلدان|گیاه/,"🪴"],[/سینما|تئاتر/,"🎬"],[/نیمکت|صندلی/,"🪑"],[/استخر/,"🏊"],[/ویترین|جام/,"🏆"],[/کمد/,"🚪"],[/چای|میز/,"🫖"],[/قاب|دیوار خاطرات/,"🖼️"],[/موسیقی/,"🎵"],[/خانه/,"🏠"],[/اسباب|پک بازی/,"🧸"],[/آکواریوم/,"🐠"],[/شومینه/,"🔥"],[/رصد/,"🔭"],[/رویال|تاج/,"👑"],[/باغ|درخت/,"🌳"],[/پنجره|آسمان/,"🌌"],[/کتاب/,"📚"],[/فرش|هاله/,"✨"],[/غذا/,"🍖"],[/آب/,"💧"],[/استخوان/,"🦴"],[/توپ/,"🔵"],[/Disc|دیسک/,"🥏"],[/تخت|خواب/,"🛏️"],[/شامپو|نظافت/,"🫧"],[/Feeder|غذاخوری/,"🥣"],[/قلاده|هارنس/,"📿"],[/عینک/,"🕶️"],[/لباس/,"👕"],[/شنل/,"🦸"],[/زره|نگهبان/,"🛡️"],[/Beacon|آموزش/,"📡"],[/دوستی|نوازش/,"💖"],[/فریم/,"💠"],[/نشان/,"🏅"],[/Cosmos|کیهانی|جهانی/,"🪐"]];
 return rules.find(([r])=>r.test(label))?.[1];
};
const fallback=["🍖","🎾","🛏️","💖","🛋️","🕰️","🫧","🏮","🪴","🎬"];
export default function SpriteAsset({atlas="store",index,size=72,className="",label}:{atlas?:Atlas;index:number;size?:number;className?:string;label?:string}){
 const glyph=byLabel(label)||(atlas==="store"?fallback[Math.max(0,index)%fallback.length]:["⌂","🐾","🎮","✦","👤","🔔","⚙️","🏆"][Math.max(0,index)%8])||"✦";
 const style:CSSProperties={width:size,height:size,flex:`0 0 ${size}px`};
 return <span className={`assetSpriteGraphic assetSpriteGraphic-${atlas} ${className}`.trim()} style={style} role={label?"img":undefined} aria-label={label}><span aria-hidden="true">{glyph}</span></span>;
}
