"use client";
import type {CSSProperties,RefObject} from "react";
import {coinTransform,diceTransform,PIPS,type CoinSide} from "./gameAnimation";
import styles from "./gameVisuals.module.css";
type Props={nodeRef:RefObject<HTMLDivElement|null>;active:boolean};
export function DiceVisual({nodeRef,active,value}:{value:number}&Props){
  return <div className={`${styles.stage} ${active?styles.active:""}`}>
    <div className={styles.halo}/><div className={styles.shadow}/>
    <div className={styles.dicePerspective} aria-hidden="true"><div ref={nodeRef} className={styles.die} style={{transform:diceTransform(value)}}>
      {[1,2,3,4,5,6].map(n=><div key={n} className={`${styles.face} ${styles[`face${n}`]}`} data-face={n}>{Array.from({length:9},(_,i)=><i key={i} className={PIPS[n].includes(i)?styles.pip:styles.empty}/>)}</div>)}
    </div></div>
    <span className={styles.brand}>JAHANI · DICE</span>
    <span className={styles.srOnly} role="status">{active?"تاس در حال پرتاب است":`وجه تاس: ${value}`}</span>
  </div>;
}
export function CoinVisual({nodeRef,active,side,won}:{side:CoinSide;won:boolean}&Props){
  return <div className={`${styles.stage} ${active?styles.active:""} ${won&&!active?styles.won:""}`}>
    <div className={styles.halo}/><div className={styles.shadow}/>
    <div className={styles.coinPerspective} aria-hidden="true"><div ref={nodeRef} className={styles.coin} style={{transform:coinTransform(side)}}>
      {Array.from({length:9},(_,i)=><i key={i} className={styles.rim} style={{"--z":`${i-4}px`} as CSSProperties}/>)}
      <div className={`${styles.coinSide} ${styles.heads}`} data-side="شیر"><span>JAHANI</span><b>شیر</b><small>SECTOR · FAMILY</small></div>
      <div className={`${styles.coinSide} ${styles.tails}`} data-side="خط"><span>JAHANI</span><b>خط</b><small>SECTOR · FAMILY</small></div>
    </div></div>
    <div className={styles.sparks} aria-hidden="true">{Array.from({length:6},(_,i)=><i key={i} style={{"--angle":`${i*60}deg`} as CSSProperties}/>)}</div>
    <span className={styles.brand}>JAHANI · COIN</span>
    <span className={styles.srOnly} role="status">{active?"سکه در حال پرتاب است":`روی سکه: ${side}`}</span>
  </div>;
}
