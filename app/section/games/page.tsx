"use client";

import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import Link from "next/link";
import {Icon,Mascot} from "../../ui";
import Accordion from "../../ui/Accordion";
import Avatar from "../../ui/Avatar";
import styles from "./games.module.css";

type Leader={display_name?:string|null;first_name?:string|null;xp?:number;avatar_url?:string|null;resolved_avatar_url?:string|null};
type Dashboard={profile?:{coins?:number;rank?:number|null;streak?:number;xp?:number;level?:number;is_founder?:boolean}|null;leaderboard?:Leader[]};
type Quiz={id:string;prompt:string;options:string[];reward_coins:number};
type Reward={coins?:number;cp?:number};
const fa=(n:number)=>new Intl.NumberFormat("fa-IR").format(n||0);
const RPS=["سنگ","کاغذ","قیچی"] as const;

function rewardText(r?:Reward){
  const coins=Number(r?.coins||0),cp=Number(r?.cp||0);
  if(!coins&&!cp)return "";
  return `آفرین! +${fa(coins)} سکه · +${fa(cp)} CP`;
}

function QuizOverlay({title,quiz,busy,onClose,onAnswer}:{title:string;quiz:Quiz;busy:boolean;onClose:()=>void;onAnswer:(i:number)=>void}){
  const node=(
    <div className={styles.quizBackdrop} onClick={()=>!busy&&onClose()}>
      <section className={styles.quizSheet} onClick={e=>e.stopPropagation()}>
        <span className={styles.sheetHandle}/>
        <header><b>{title}</b><button disabled={busy} onClick={onClose}>×</button></header>
        <div className={styles.quizBody}>
          <h2>{quiz.prompt}</h2>
          <div className={styles.quizOptions}>{quiz.options.map((o,i)=><button disabled={busy} key={`${o}-${i}`} onClick={()=>onAnswer(i)}>{o}</button>)}</div>
        </div>
      </section>
    </div>
  );
  if(typeof document==="undefined")return node;
  return createPortal(node,document.body);
}

export default function GamesPage(){
  const[d,setD]=useState<Dashboard>({});
  const[notice,setNotice]=useState("");
  const[busy,setBusy]=useState(false);
  const[quiz,setQuiz]=useState<Quiz|null>(null);
  const[trivia,setTrivia]=useState<Quiz|null>(null);
  const[coinGuess,setCoinGuess]=useState<""|"شیر"|"خط">("");
  const[coin,setCoin]=useState<{side:string;guess?:string;correct?:boolean;spinning:boolean;reward?:Reward}|null>(null);
  const[dice,setDice]=useState<{value:number;rolling:boolean}|null>(null);
  const[rps,setRps]=useState<{choice:number;bot:number;outcome:string;reward?:Reward}|null>(null);

  async function api(action:string,extra:Record<string,unknown>={}){const session=sessionStorage.getItem("familybot.session");if(!session)throw new Error("Mini App را از داخل بله باز کن.");const r=await fetch("/api/family/game",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${session}`},body:JSON.stringify({action,...extra})});const x=await r.json();if(!r.ok||!x.ok)throw new Error(x.error||"game_failed");return x.result}
  async function triviaApi(action:"start"|"answer",extra:Record<string,unknown>={}){const session=sessionStorage.getItem("familybot.session");if(!session)throw new Error("Mini App را از داخل بله باز کن.");const r=await fetch("/api/family/trivia",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${session}`},body:JSON.stringify({action,...extra})});const x=await r.json();if(!r.ok||!x.ok)throw new Error(x.error||"trivia_failed");return x.result}
  function reloadDash(){const session=sessionStorage.getItem("familybot.session");if(!session)return;fetch("/api/family/dashboard",{headers:{authorization:`Bearer ${session}`},cache:"no-store"}).then(r=>r.json()).then(x=>{if(x.ok)setD(x.dashboard||{})}).catch(()=>undefined)}

  async function playCoin(){
    if(busy||!coinGuess)return;
    setBusy(true);setNotice("");setCoin({side:"...",guess:coinGuess,spinning:true});
    try{
      const r=await api("coin",{guess:coinGuess});
      window.setTimeout(()=>{
        setCoin({side:String(r.side),guess:String(r.guess||coinGuess),correct:Boolean(r.correct),spinning:false,reward:r.reward});
        setNotice(r.correct?rewardText(r.reward):(r.alreadyClaimed?"این پرتاب قبلاً ثبت شده.":`انتخاب تو: ${r.guess} · نتیجه: ${r.side} · باختی`));
        reloadDash();
      },1100);
    }catch(e){setCoin(null);setNotice(e instanceof Error?e.message:"شیر یا خط اجرا نشد")}
    finally{setBusy(false)}
  }
  async function playDice(){if(busy)return;setBusy(true);setNotice("");setDice({value:Math.ceil(Math.random()*6),rolling:true});try{const r=await api("dice");window.setTimeout(()=>setDice({value:Number(r.value)||1,rolling:false}),700)}catch(e){setDice(null);setNotice(e instanceof Error?e.message:"تاس اجرا نشد")}finally{setBusy(false)}}
  async function playRps(choice:number){if(busy)return;setBusy(true);setNotice("");try{const r=await api("rps",{choice});setRps({choice,bot:Number(r.bot),outcome:String(r.outcome),reward:r.reward});if(r.outcome==="win")setNotice(rewardText(r.reward));reloadDash()}catch(e){setNotice(e instanceof Error?e.message:"سنگ کاغذ قیچی اجرا نشد")}finally{setBusy(false)}}
  async function startTrivia(){setBusy(true);setNotice("");try{setTrivia(await triviaApi("start"))}catch(e){const m=e instanceof Error?e.message:"Family Trivia اجرا نشد";setNotice(m==="trivia_needs_three_members"?"برای Family Trivia حداقل ۳ عضو ثبت‌شده لازم داریم.":m)}finally{setBusy(false)}}
  async function answer(index:number){if(!quiz)return;setBusy(true);try{const r=await api("quiz.answer",{sessionId:quiz.id,option:index});setNotice(r.correct?(r.alreadyClaimed?"این سؤال قبلاً جایزه گرفته.":rewardText(r.reward)):"جواب درست نبود");setQuiz(null);reloadDash()}catch(e){setNotice(e instanceof Error?e.message:"ثبت جواب انجام نشد")}finally{setBusy(false)}}
  async function answerTrivia(index:number){if(!trivia)return;setBusy(true);try{const r=await triviaApi("answer",{sessionId:trivia.id,option:index});setNotice(r.correct?(r.alreadyClaimed?"این سؤال قبلاً جایزه گرفته.":rewardText(r.reward)):"این جواب درست نبود");setTrivia(null);reloadDash()}catch(e){setNotice(e instanceof Error?e.message:"ثبت جواب انجام نشد")}finally{setBusy(false)}}

  useEffect(()=>{reloadDash()},[]);
  const leaders=d.leaderboard||[],profile=d.profile,founder=Boolean(profile?.is_founder);

  return <main className={`appShell ${styles.page}`}>
    <header className={styles.header}><Link href="/" className={styles.back}>←</Link><div><h1>مرکز بازی</h1><p>بازی، رقابت و جایزه خانوادگی</p></div><Link href="/section/leaderboard" className={styles.trophy}><Icon name="trophy"/></Link></header>
    <section className={styles.hero}><div><span className={styles.pill}><Icon name="games" size={15}/> بازی واقعی امروز</span><h2>Family Trivia</h2><p>سؤال از اطلاعات واقعی اعضای همین خانواده.</p><div className={styles.heroButtons}><button disabled={busy} onClick={()=>void startTrivia()}>شروع Family Trivia</button><Link href="/section/game-guide">راهنمای بازی‌ها</Link></div></div><div className={styles.heroArt}><Mascot small/><span>?</span><i>FAMILY</i></div></section>
    {notice&&<div className="adminNotice" style={{marginTop:10}} onClick={()=>setNotice("")}>{notice}</div>}
    {trivia&&<QuizOverlay title="Family Trivia" quiz={trivia} busy={busy} onClose={()=>setTrivia(null)} onAnswer={i=>void answerTrivia(i)}/>}
    {quiz&&<QuizOverlay title="کوئیز عمومی" quiz={quiz} busy={busy} onClose={()=>setQuiz(null)} onAnswer={i=>void answer(i)}/>}

    <Accordion title="شیر یا خط" summary={coin?.side&&!coin.spinning?`نتیجه: ${coin.side}`:"اول انتخاب کن، بعد پرتاب"} icon={<Icon name="coins" size={18}/>} defaultOpen>
      <div className="gamePanel">
        <p>انتخابت چیه؟</p>
        <div className="rpsRow">
          {(["شیر","خط"] as const).map(side=>(
            <button key={side} disabled={busy} className={coinGuess===side?"primaryCta":""} onClick={()=>setCoinGuess(side)}>{side}</button>
          ))}
        </div>
        <div className={`coinFlip${coin?.spinning?" spinning":""}${coin&&!coin.spinning&&coin.side==="خط"?" tails":""}`}>
          <div className="coin3d">
            <b className="coinFace coinHeads">شیر</b>
            <b className="coinFace coinTails">خط</b>
          </div>
        </div>
        <button className="primaryCta" disabled={busy||!coinGuess} onClick={()=>void playCoin()}>{busy&&coin?.spinning?"در حال چرخش...":"پرتاب سکه"}</button>
        {coin&&!coin.spinning&&<p>انتخاب تو: {coin.guess} · نتیجه: {coin.side} · {coin.correct?"بردی":"باختی"}</p>}
      </div>
    </Accordion>

    <Accordion title="تاس" summary={dice&&!dice.rolling?`عدد ${fa(dice.value)}`:"تاس گرافیکی ۱ تا ۶"} icon={<Icon name="games" size={18}/>}>
      <div className="gamePanel">
        <div className={`dieFace${dice?.rolling?" rolling":""}`} data-n={String(dice?.value||1)}>{Array.from({length:9},(_,i)=><i key={i}/>)}</div>
        <button className="primaryCta" disabled={busy} onClick={()=>void playDice()}>{dice?.rolling?"در حال ریختن...":"بریز تاس"}</button>
      </div>
    </Accordion>

    <Accordion title="سنگ کاغذ قیچی" summary={rps?`تو ${RPS[rps.choice]} · سکتور ${RPS[rps.bot]}`:"انتخاب کن و نتیجه همین‌جا ببین"} icon={<Icon name="spark" size={18}/>}>
      <div className="gamePanel">
        <div className="rpsRow">{RPS.map((v,i)=><button key={v} disabled={busy} onClick={()=>void playRps(i)}><span className={`rpsGlyph rps-${i}`} aria-hidden/><b>{v}</b></button>)}</div>
        {rps&&<div className="rpsArena"><div className="rpsToken">تو<br/>{RPS[rps.choice]}</div><b>{rps.outcome==="win"?"بردی":rps.outcome==="draw"?"مساوی":"باختی"}</b><div className="rpsToken">سکتور<br/>{RPS[rps.bot]}</div></div>}
        {rps?.outcome==="win"&&<p>{rewardText(rps.reward)}</p>}
      </div>
    </Accordion>

    <section className={styles.quickStats}><div><Icon name="coins"/><b>{founder?"∞":fa(profile?.coins||0)}</b><span>سکه</span></div><div><Icon name="trophy"/><b>{profile?.rank?`#${fa(profile.rank)}`:"—"}</b><span>رتبه</span></div><div><Icon name="spark"/><b>{fa(profile?.streak||0)}</b><span>Streak</span></div></section>
    <div className={styles.title}><h2>بازی‌های خانوادگی</h2><span>لابی و کوئیز</span></div>
    <section className={styles.gameGrid}>
      <button className={styles.game} disabled={busy} onClick={()=>void startTrivia()}><h3>Family Trivia</h3><p>سؤال از اعضای همین خانواده</p><b>+۱۲ سکه · +۸ CP</b></button>
      <button className={styles.game} disabled={busy} onClick={()=>void api("quiz.start").then(setQuiz).catch(e=>setNotice(e instanceof Error?e.message:"کوئیز شروع نشد"))}><h3>کوئیز عمومی</h3><p>تک‌نفره زمان‌دار</p><b>+۱۵ سکه · +۱۰ CP</b></button>
      <Link href="/section/community" className={styles.game}><h3>دوئل خانوادگی</h3><p>سنگ کاغذ قیچی دونفره</p></Link>
      <Link href="/section/multiplayer" className={styles.game}><h3>جاسوس و اسم‌فامیل</h3><p>لابی گروهی</p></Link>
      <Link href="/section/mafia" className={styles.game}><h3>مافیا Lite</h3><p>نقش مخفی و رأی</p></Link>
    </section>
    <section className={styles.tournament}><div><span>رتبه‌بندی زنده</span><h2>قهرمان‌های خانواده</h2><div className={styles.progress}><i style={{width:`${Math.min(100,Number(profile?.xp||0)/5)}%`}}/></div></div><div className={styles.podium}>{leaders.slice(0,3).map((m,i)=><span className={i===0?styles.first:""} key={`${m.display_name||m.first_name||"m"}-${i}`}><Avatar src={m.resolved_avatar_url||m.avatar_url} alt={m.display_name||""} size={i===0?46:38} fallback={String(i+1)}/><b>{m.display_name||m.first_name||"عضو"}</b><small>{fa(Number(m.xp||0))} XP</small></span>)}</div></section>
  </main>
}
