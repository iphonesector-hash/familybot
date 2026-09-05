export type CoinSide="شیر"|"خط";
export const DICE_ROTATIONS:Record<number,readonly [number,number]>={1:[0,0],2:[-90,0],3:[0,-90],4:[0,90],5:[90,0],6:[0,180]};
export const PIPS:Record<number,readonly number[]>={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
export function diceResult(value:unknown){if(typeof value!=="number"||!Number.isInteger(value)||!DICE_ROTATIONS[value])throw Error("نتیجهٔ تاس معتبر نیست.");return value;}
export function coinResult(value:unknown):CoinSide{if(value!=="شیر"&&value!=="خط")throw Error("نتیجهٔ سکه معتبر نیست.");return value;}
export function diceTransform(value:number){const [x,y]=DICE_ROTATIONS[diceResult(value)];return `rotateX(${x}deg) rotateY(${y}deg)`;}
export function coinTransform(side:CoinSide){return `rotateY(${coinResult(side)==="شیر"?0:180}deg)`;}
export function motionFrames(kind:"dice"|"coin",result:number|CoinSide){
  const coin=kind==="coin",final=coin?coinTransform(result as CoinSide):diceTransform(result as number);
  const [x,y]=coin?[0,result==="شیر"?0:180]:DICE_ROTATIONS[diceResult(result)];
  return {duration:coin?1200:800,final,frames:[
    {transform:`translateY(0) scale(1) ${final}`,offset:0},
    {transform:`translateY(${coin?-48:-30}px) scale(1.04) rotateX(${x+360}deg) rotateY(${y+540}deg)`,offset:.34},
    {transform:`translateY(-8px) scale(1) rotateX(${x+720}deg) rotateY(${y+1080}deg)`,offset:.76},
    {transform:`translateY(3px) scale(1.05,.95) rotateX(${x+720}deg) rotateY(${y+1080}deg)`,offset:.86},
    {transform:`translateY(-5px) scale(.98,1.02) rotateX(${x+720}deg) rotateY(${y+1080}deg)`,offset:.93},
    {transform:`translateY(0) scale(1) rotateX(${x+720}deg) rotateY(${y+1080}deg)`,offset:1}
  ]};
}
export async function animateLanding(node:HTMLElement|null,kind:"dice"|"coin",result:number|CoinSide,signal:AbortSignal,reduced=typeof matchMedia!=="undefined"&&matchMedia("(prefers-reduced-motion: reduce)").matches){
  const {frames,duration,final}=motionFrames(kind,result);
  if(!node||signal.aborted)return;
  // The final style persists even when WAAPI is unavailable or interrupted.
  if(reduced||typeof node.animate!=="function"){node.style.transform=final;return;}
  let animation:Animation|undefined;
  try{
    frames[0].transform=`translateY(0) scale(1) ${node.style.transform||"rotateX(0deg) rotateY(0deg)"}`;
    animation=node.animate(frames,{duration,easing:"cubic-bezier(.22,.65,.3,1)",fill:"forwards"});
    await new Promise<void>(resolve=>{
      const finish=()=>{clearTimeout(timer);signal.removeEventListener("abort",finish);resolve();};
      const timer=setTimeout(finish,duration+150);
      signal.addEventListener("abort",finish,{once:true});
      animation!.finished.then(finish,finish);
      if(signal.aborted)finish();
    });
  }catch{/* Fall back to the authoritative face if the browser cannot animate. */}
  finally{node.style.transform=final;animation?.cancel();}
}
export function actionLock(){let held=false;return {get held(){return held;},async run(task:()=>Promise<void>){if(held)return false;held=true;try{await task();return true;}finally{held=false;}}};}
