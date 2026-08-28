import { NextRequest, NextResponse } from "next/server";
import { verifyFamilySession } from "@/lib/familySession";
import { completeFamilyTask, createFamilyTask, createMemory, purchaseStoreItem, updateOwnProfile } from "@/lib/familyMutations";
import { createFamilyEvent, createFamilyPoll, evaluateAchievements, readMissions, transferFamilyCoins, voteFamilyPoll } from "@/lib/familyFeatures";
import { claimMission } from "@/lib/missionClaims";
import { readPlannerData } from "@/lib/plannerData";
import { cancelOwnEvent, closeOwnPoll } from "@/lib/plannerManagement";

function getSession(req:NextRequest){const auth=req.headers.get("authorization")||"";const token=auth.startsWith("Bearer ")?auth.slice(7):"";return token?verifyFamilySession(token):null}

export async function POST(req:NextRequest){
  try{
    const session=getSession(req);if(!session)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
    const body=await req.json() as {action?:string;payload?:Record<string,unknown>};const p=body.payload||{};
    let data:unknown;
    switch(body.action){
      case "profile.update":data=await updateOwnProfile(session.familyId,session.userId,{displayName:p.displayName as string,relationLabel:p.relationLabel as string,bio:p.bio as string,birthday:(p.birthday as string)||null});break;
      case "task.create":data=await createFamilyTask(session.familyId,session.userId,{title:p.title as string,description:p.description as string,dueAt:(p.dueAt as string)||null,rewardCoins:Number(p.rewardCoins||0)});break;
      case "task.complete":data=await completeFamilyTask(session.familyId,session.userId,String(p.taskId||""));break;
      case "memory.create":data=await createMemory(session.familyId,session.userId,{title:p.title as string,caption:p.caption as string,memoryDate:(p.memoryDate as string)||null,mediaUrl:(p.mediaUrl as string)||null,tags:Array.isArray(p.tags)?p.tags.map(String):[],visibility:p.visibility==="private"?"private":p.visibility==="selected"?"selected":"family",allowedMemberIds:Array.isArray(p.allowedMemberIds)?p.allowedMemberIds.map(String):[]});break;
      case "store.purchase":data=await purchaseStoreItem(session.familyId,session.userId,String(p.itemId||""));break;
      case "event.create":data=await createFamilyEvent(session.familyId,session.userId,{title:p.title as string,description:p.description as string,startsAt:p.startsAt as string,endsAt:(p.endsAt as string)||null,location:p.location as string,eventType:p.eventType as string});break;
      case "event.cancel":data=await cancelOwnEvent(session.familyId,session.userId,String(p.eventId||""));break;
      case "poll.create":data=await createFamilyPoll(session.familyId,session.userId,{question:p.question as string,options:Array.isArray(p.options)?p.options.map(String):[],anonymous:Boolean(p.anonymous),closesAt:(p.closesAt as string)||null});break;
      case "poll.vote":data=await voteFamilyPoll(session.familyId,session.userId,String(p.pollId||""),Number(p.optionIndex));break;
      case "poll.close":data=await closeOwnPoll(session.familyId,session.userId,String(p.pollId||""));break;
      case "coins.transfer":data=await transferFamilyCoins(session.familyId,session.userId,{targetUserId:p.targetUserId?Number(p.targetUserId):undefined,targetMemberId:p.targetMemberId?String(p.targetMemberId):undefined,amount:Number(p.amount),note:p.note as string});break;
      case "achievements.evaluate":data=await evaluateAchievements(session.familyId,session.userId);break;
      case "missions.read":data=await readMissions(session.familyId,session.userId);break;
      case "mission.claim":data=await claimMission(session.familyId,session.userId,String(p.missionId||""));break;
      case "planner.read":data=await readPlannerData(session.familyId);break;
      default:return NextResponse.json({ok:false,error:"unknown_action"},{status:400});
    }
    return NextResponse.json({ok:true,data});
  }catch(error){const message=error instanceof Error?error.message:"action_failed";const status=["insufficient_coins","coin_balance_changed","mission_not_complete","poll_not_owned","event_not_owned"].includes(message)?409:400;console.error("family action failed",error);return NextResponse.json({ok:false,error:message},{status});}
}
