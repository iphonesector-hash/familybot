import { NextRequest,NextResponse } from "next/server";
import { verifyFamilySession } from "@/lib/familySession";
import { isAdmin } from "@/lib/bale";
import { addFavoritePlace, completeChallenge, createChallenge, createDuel, joinChallenge, playDuel, readCommunity } from "@/lib/familyCommunity";

function sessionFrom(req:NextRequest){const auth=req.headers.get("authorization")||"";return auth.startsWith("Bearer ")?verifyFamilySession(auth.slice(7)):null}
export async function GET(req:NextRequest){try{const s=sessionFrom(req);if(!s)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});const [data,canManage]=await Promise.all([readCommunity(s.familyId,s.userId),isAdmin(s.chatId,s.userId).catch(()=>false)]);return NextResponse.json({ok:true,data:{...data,canManage}})}catch(error){console.error("community read failed",error);return NextResponse.json({ok:false,error:"community_read_failed"},{status:500})}}
export async function POST(req:NextRequest){try{const s=sessionFrom(req);if(!s)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});const body=await req.json();const action=String(body?.action||""),p=body?.payload||{};let data:unknown;
 if(action==="challenge.create"){const canManage=await isAdmin(s.chatId,s.userId).catch(()=>false);if(!canManage)return NextResponse.json({ok:false,error:"admin_required"},{status:403});data=await createChallenge(s.familyId,s.userId,{title:p.title,description:p.description,type:p.type,target:Number(p.target||1),reward:Number(p.reward||0),endsAt:p.endsAt||null});}
 else if(action==="challenge.join")data=await joinChallenge(s.familyId,s.userId,String(p.challengeId||""));
 else if(action==="challenge.complete")data=await completeChallenge(s.familyId,s.userId,String(p.challengeId||""));
 else if(action==="place.add")data=await addFavoritePlace(s.familyId,s.userId,{name:p.name,category:p.category,address:p.address,lat:p.lat==null?null:Number(p.lat),lng:p.lng==null?null:Number(p.lng),notes:p.notes});
 else if(action==="duel.create")data=await createDuel(s.familyId,s.userId,String(p.opponentMemberId||""));
 else if(action==="duel.play")data=await playDuel(s.familyId,s.userId,String(p.duelId||""),Number(p.choice));
 else return NextResponse.json({ok:false,error:"unknown_action"},{status:400});
 return NextResponse.json({ok:true,data});
 }catch(error){const message=error instanceof Error?error.message:"community_action_failed";const conflict=["challenge_closed","challenge_join_required","duel_closed","duel_already_played"].includes(message);console.error("community action failed",error);return NextResponse.json({ok:false,error:message},{status:conflict?409:400})}}
