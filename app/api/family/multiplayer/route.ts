import {NextRequest,NextResponse} from "next/server";
import {verifyFamilySession} from "@/lib/familySession";
import {createSpyGame,finishSpyGame,joinSpyGame,readSpyGames,startSpyGame} from "@/lib/multiplayerSpy";
import {createNameFamilyGame,finishNameFamilyGame,joinNameFamilyGame,readNameFamilyGames,startNameFamilyGame,submitNameFamily} from "@/lib/multiplayerNameFamily";
import {answerTwentyQuestion,askTwentyQuestion,createTwentyQuestionsGame,finishTwentyQuestionsGame,guessTwentyQuestions,joinTwentyQuestionsGame,readTwentyQuestionsGames,startTwentyQuestionsGame} from "@/lib/multiplayerTwentyQuestions";
import {createMafiaLiteGame,joinMafiaLiteGame,readMafiaLiteGames,resolveMafiaLiteRound,startMafiaLiteGame,voteMafiaLite} from "@/lib/multiplayerMafiaLite";

function sessionFrom(req:NextRequest){const auth=req.headers.get("authorization")||"";return auth.startsWith("Bearer ")?verifyFamilySession(auth.slice(7)):null}
export async function GET(req:NextRequest){try{const s=sessionFrom(req);if(!s)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});const [spy,nameFamily,twenty,mafia]=await Promise.all([readSpyGames(s.familyId,s.userId),readNameFamilyGames(s.familyId,s.userId),readTwentyQuestionsGames(s.familyId,s.userId),readMafiaLiteGames(s.familyId,s.userId)]);return NextResponse.json({ok:true,data:{spy:spy.games,nameFamily:nameFamily.games,twenty:twenty.games,mafia:mafia.games,me:spy.me}})}catch(error){console.error("multiplayer read failed",error);return NextResponse.json({ok:false,error:"multiplayer_read_failed"},{status:500})}}
export async function POST(req:NextRequest){try{const s=sessionFrom(req);if(!s)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});const body=await req.json(),action=String(body?.action||""),gameId=String(body?.gameId||"");let data:unknown;
if(action==="spy.create")data=await createSpyGame(s.familyId,s.userId);
else if(action==="spy.join")data=await joinSpyGame(s.familyId,s.userId,gameId);
else if(action==="spy.start")data=await startSpyGame(s.familyId,s.userId,gameId);
else if(action==="spy.finish")data=await finishSpyGame(s.familyId,s.userId,gameId);
else if(action==="name_family.create")data=await createNameFamilyGame(s.familyId,s.userId);
else if(action==="name_family.join")data=await joinNameFamilyGame(s.familyId,s.userId,gameId);
else if(action==="name_family.start")data=await startNameFamilyGame(s.familyId,s.userId,gameId);
else if(action==="name_family.submit")data=await submitNameFamily(s.familyId,s.userId,gameId,(body?.answers||{}) as Record<string,unknown>);
else if(action==="name_family.finish")data=await finishNameFamilyGame(s.familyId,s.userId,gameId);
else if(action==="twenty.create")data=await createTwentyQuestionsGame(s.familyId,s.userId,{secret:body?.secret,hint:body?.hint});
else if(action==="twenty.join")data=await joinTwentyQuestionsGame(s.familyId,s.userId,gameId);
else if(action==="twenty.start")data=await startTwentyQuestionsGame(s.familyId,s.userId,gameId);
else if(action==="twenty.ask")data=await askTwentyQuestion(s.familyId,s.userId,gameId,String(body?.question||""));
else if(action==="twenty.answer")data=await answerTwentyQuestion(s.familyId,s.userId,gameId,String(body?.questionId||""),body?.answer as "yes"|"no"|"maybe");
else if(action==="twenty.guess")data=await guessTwentyQuestions(s.familyId,s.userId,gameId,String(body?.guess||""));
else if(action==="twenty.finish")data=await finishTwentyQuestionsGame(s.familyId,s.userId,gameId);
else if(action==="mafia.create")data=await createMafiaLiteGame(s.familyId,s.userId);
else if(action==="mafia.join")data=await joinMafiaLiteGame(s.familyId,s.userId,gameId);
else if(action==="mafia.start")data=await startMafiaLiteGame(s.familyId,s.userId,gameId);
else if(action==="mafia.vote")data=await voteMafiaLite(s.familyId,s.userId,gameId,String(body?.targetMemberId||""));
else if(action==="mafia.resolve")data=await resolveMafiaLiteRound(s.familyId,s.userId,gameId);
else return NextResponse.json({ok:false,error:"unknown_action"},{status:400});return NextResponse.json({ok:true,data})}catch(error){const message=error instanceof Error?error.message:"multiplayer_action_failed";const conflict=["spy_game_started","spy_needs_three_players","spy_not_active","name_family_started","name_family_needs_two_players","name_family_not_active","name_family_time_up","name_family_finished","twenty_game_closed","twenty_game_started","twenty_needs_two_players","twenty_not_active","twenty_question_limit","twenty_already_answered","mafia_started","mafia_needs_four_players","mafia_not_active","mafia_no_votes","mafia_finished"].includes(message);console.error("multiplayer action failed",error);return NextResponse.json({ok:false,error:message},{status:conflict?409:400})}}
