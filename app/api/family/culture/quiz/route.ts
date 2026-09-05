import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {verifyFamilySession} from "@/lib/familySession";
import {answerDezfuliQuiz} from "@/lib/dezfuliQuiz";
import {challengeReward} from "@/lib/challengeRewards";

function session(req:NextRequest){const a=req.headers.get("authorization")||"";return a.startsWith("Bearer ")?verifyFamilySession(a.slice(7)):null}
function db(){const u=process.env.NEXT_PUBLIC_SUPABASE_URL,k=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!u||!k)throw new Error("db_not_configured");return createClient(u,k,{db:{schema:"familybot"},auth:{persistSession:false,autoRefreshToken:false}})}

export async function POST(req:NextRequest){
  const s=session(req);if(!s)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
  try{
    const b=await req.json() as {sessionId?:string;option?:number};
    const c=db();
    const result=await answerDezfuliQuiz(c,s,b.sessionId,b.option);
    const word={id:result.wordId,meaning:result.meaning};
    if(!result.correct)return NextResponse.json({ok:true,correct:false,meaning:word.meaning,sourceLabel:result.sourceLabel,sourceUrl:result.sourceUrl,reward:{coins:0,cp:0},alreadyClaimed:false});
    const m=await c.from("members").select("id,is_founder").eq("family_id",s.familyId).eq("bale_user_id",s.userId).single();
    if(m.error)throw m.error;
    const pay=challengeReward("dezfuli");
    const r=await c.rpc("family_claim_dezfuli_quiz_atomic",{p_family_id:s.familyId,p_member_id:m.data.id,p_word_id:word.id,p_xp:pay.cp,p_coins:pay.coins});
    if(r.error)throw r.error;
    const out=r.data as {claimed?:boolean;alreadyClaimed?:boolean;founder?:boolean}|null;
    const claimed=Boolean(out?.claimed);
    return NextResponse.json({
      ok:true,
      correct:true,
      sourceLabel:result.sourceLabel,
      sourceUrl:result.sourceUrl,
      meaning:word.meaning,
      reward:claimed?pay:{coins:0,cp:0},
      alreadyClaimed:!claimed,
      claimed,
      founder:Boolean(out?.founder)
    });
  }catch(e){
    console.error(e);
    return NextResponse.json({ok:false,error:"quiz_failed"},{status:500});
  }
}
