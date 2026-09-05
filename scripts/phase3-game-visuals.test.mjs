import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {loader} from './phase2-content-probe.mjs';
const require=createRequire(import.meta.url),React=require('react');
const css=new Proxy({},{get:(_,name)=>name==="__esModule"?false:String(name)});
const load=loader(),animation=load('app/section/games/gameAnimation.ts');
const {diceResult,coinResult,DICE_ROTATIONS,PIPS,animateLanding,actionLock,motionFrames}=animation;
const normals={1:[0,0,1],2:[0,-1,0],3:[1,0,0],4:[-1,0,0],5:[0,1,0],6:[0,0,-1]};
// Rotate the actual face normals: the selected face must point toward the viewer.
for(let value=1;value<=6;value++){
  assert.equal(diceResult(value),value);assert.equal(PIPS[value].length,value);
  const [a,b]=DICE_ROTATIONS[value].map(n=>n*Math.PI/180),[x,y,z]=normals[value];
  const rotatedZ=-(Math.sin(b)*x)+Math.cos(b)*z;
  assert.ok(Math.abs(Math.sin(a)*y+Math.cos(a)*rotatedZ-1)<1e-9,`face ${value} faces the viewer`);
}
for(const bad of [0,7,1.5,'6',null,NaN])assert.throws(()=>diceResult(bad));
for(const side of ['شیر','خط'])assert.equal(coinResult(side),side);
assert.throws(()=>coinResult('...'));
assert.equal(animation.coinTransform('شیر'),'rotateY(0deg)');
assert.equal(animation.coinTransform('خط'),'rotateY(180deg)');
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve}};
for(const [kind,results] of [['dice',[1,2,3,4,5,6]],['coin',['شیر','خط']]])for(const result of results){
  const done=deferred();let frames,cancelled=0;
  const node={style:{transform:'rotateY(0deg)'},animate:(f,o)=>{frames=f;assert.equal(o.duration,kind==='dice'?800:1200);return{finished:done.promise,cancel:()=>cancelled++}}};
  const pending=animateLanding(node,kind,result,new AbortController().signal,false);
  assert.equal(frames[0].transform,'translateY(0) scale(1) rotateY(0deg)','retain previous face until spinning');
  done.resolve();await pending;
  assert.equal(node.style.transform,motionFrames(kind,result).final);assert.equal(cancelled,1);
  let calls=0;node.animate=()=>{calls++;throw Error('must not animate')};
  await animateLanding(node,kind,result,new AbortController().signal,true);assert.equal(calls,0);
  assert.equal(node.style.transform,motionFrames(kind,result).final);
}
const abort=new AbortController();let cancelled=false;
const stopped=animateLanding({style:{},animate:()=>({finished:new Promise(()=>{}),cancel:()=>cancelled=true})},'dice',5,abort.signal,false);
abort.abort();await stopped;assert.ok(cancelled,'unmount interrupts without leaving an animation');
await animateLanding({style:{},animate:()=>{throw Error('unsupported')}},'dice',2,new AbortController().signal,false);
const lock=actionLock(),pending=deferred();const first=lock.run(()=>pending.promise);
assert.equal(await lock.run(async()=>assert.fail('concurrent action')),false);pending.resolve();await first;assert.equal(lock.held,false);
await assert.rejects(lock.run(async()=>{throw Error('network')}));assert.equal(lock.held,false);

// Execute real page handlers against deferred server and WAAPI responses.
async function pageCase(kind,result){
  let states=[],refs=[],cursor=0,refCursor=0,requests=0,dashboard=0,animations=0,effects=[];
  const response=deferred(),finish=deferred();
  const react={...React,useState:initial=>{const i=cursor++;if(!(i in states))states[i]=initial;return[states[i],v=>states[i]=typeof v==='function'?v(states[i]):v]},useRef:initial=>{const i=refCursor++;return refs[i]??(refs[i]={current:initial})},useEffect:fn=>effects.push(fn)};
  const modules={'react':react,'next/link':'a','../../ui':{Icon:'i',Mascot:'i'},'../../ui/Accordion':'section','../../ui/Avatar':'i','./games.module.css':css,'./gameVisuals.module.css':css};
  const pageLoader=loader(modules,{AbortController,sessionStorage:{getItem:()=> 'fixture'},fetch:async(url,options)=>{
    if(url==='/api/family/dashboard'){dashboard++;return{json:async()=>({ok:true,dashboard:{}})}}
    requests++;assert.equal(JSON.parse(options.body).action,kind);await response.promise;
    return{ok:true,json:async()=>({ok:true,result})};
  }});
  const Page=pageLoader('app/section/games/page.tsx').default;
  const walk=node=>Array.isArray(node)?node.flatMap(walk):node&&typeof node==='object'?[node,...walk(node.props?.children)]:[];
  const text=node=>Array.isArray(node)?node.map(text).join(''):node&&typeof node==='object'?text(node.props?.children):String(node??'');
  const render=()=>{cursor=0;refCursor=0;effects=[];const tree=Page();for(const n of walk(tree))if(n.props?.nodeRef)n.props.nodeRef.current={style:{transform:'rotateY(0deg)'},animate:()=>{animations++;return{finished:finish.promise,cancel(){}}}};return tree};
  const button=(tree,label)=>walk(tree).find(n=>n.type==='button'&&text(n)===label);
  let tree=render();if(kind==='coin'){button(tree,'خط').props.onClick();tree=render()}
  const label=kind==='coin'?'پرتاب سکه':'بریز تاس',click=button(tree,label).props.onClick;
  click();click();assert.equal(requests,1,'same-render double tap sends one request');
  tree=render();assert.ok(walk(tree).filter(n=>n.type==='button').every(n=>n.props.disabled),'buttons locked during request');
  response.resolve();await new Promise(r=>setImmediate(r));
  assert.equal(animations,1);click();assert.equal(requests,1,'locked until landing');
  tree=render();assert.ok(walk(tree).filter(n=>n.type==='button').every(n=>n.props.disabled));
  assert.ok(!text(tree).includes('۹۹'),'reward hidden during animation');
  finish.resolve();await new Promise(r=>setImmediate(r));
  tree=render();assert.equal(button(tree,label).props.disabled,false);
  const visual=walk(tree).find(n=>n.props?.nodeRef&&('side' in n.props)===(kind==='coin'));
  assert.equal(kind==='coin'?visual.props.side:visual.props.value,kind==='coin'?result.side:result.value);
  if(kind==='coin'){assert.equal(text(tree).includes('۹۹'),result.correct);assert.equal(visual.props.won,result.correct);assert.equal(dashboard,1,'one balance refresh after reveal')}
  assert.equal(requests,1,'animation never invokes another reward-bearing endpoint');
  button(tree,label).props.onClick();await new Promise(r=>setImmediate(r));
  assert.equal(requests,2,'a new throw is allowed after landing');
  assert.equal(button(render(),label).props.disabled,false,'repeated throws do not stick');
}
await pageCase('dice',{value:6});
await pageCase('coin',{side:'خط',guess:'خط',correct:true,reward:{coins:99,cp:7}});
await pageCase('coin',{side:'شیر',guess:'خط',correct:false,reward:{coins:0,cp:0}});
const styles=fs.readFileSync(new URL('../app/section/games/gameVisuals.module.css',import.meta.url),'utf8');
for(const [face,transform] of Object.entries({1:'translateZ(47px)',2:'rotateX(90deg) translateZ(47px)',3:'rotateY(90deg) translateZ(47px)',4:'rotateY(-90deg) translateZ(47px)',5:'rotateX(-90deg) translateZ(47px)',6:'rotateY(180deg) translateZ(47px)'}))assert.ok(styles.includes(`.face${face}{transform:${transform}}`));
assert.match(styles,/prefers-reduced-motion:reduce/);assert.match(styles,/backface-visibility:hidden/);
const visualLoad=loader({'./gameVisuals.module.css':css});
const {DiceVisual,CoinVisual}=visualLoad('app/section/games/GameVisuals.tsx');
const {renderToStaticMarkup}=require('react-dom/server');
const art=[1,2,3,4,5,6].map(value=>renderToStaticMarkup(React.createElement(DiceVisual,{value,active:false,nodeRef:{current:null}}))).join('')+['شیر','خط'].map(side=>renderToStaticMarkup(React.createElement(CoinVisual,{side,active:false,won:false,nodeRef:{current:null}}))).join('');
for(let n=1;n<=6;n++)assert.ok(art.includes(`data-face="${n}"`));
if(process.env.PHASE3_PREVIEW)fs.writeFileSync(process.env.PHASE3_PREVIEW,`<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><title>Phase 3 visual fixture</title><style>body{margin:0;background:#081321;color:white;font-family:sans-serif}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));max-width:1000px;margin:auto}${styles}</style><main>${art}</main></html>`);
console.log('PASS phase3: 6 dice / 2 coin mappings, real handler double taps, reveal ordering, reward request count, reduced motion, abort and fallback');
