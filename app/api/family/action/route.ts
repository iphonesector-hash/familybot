import { NextRequest, NextResponse } from "next/server";
import { verifyFamilySession } from "@/lib/familySession";
import { completeFamilyTask, createFamilyTask, createMemory, purchaseStoreItem, saveRelationship, updateOwnProfile } from "@/lib/familyMutations";

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
      case "memory.create":data=await createMemory(session.familyId,session.userId,{title:p.title as string,caption:p.caption as string,memoryDate:(p.memoryDate as string)||null,mediaUrl:(p.mediaUrl as string)||null,tags:Array.isArray(p.tags)?p.tags.map(String):[]});break;
      case "relationship.save":data=await saveRelationship(session.familyId,session.userId,{toMemberId:String(p.toMemberId||""),relationType:String(p.relationType||"")});break;
      case "store.purchase":data=await purchaseStoreItem(session.familyId,session.userId,String(p.itemId||""));break;
      default:return NextResponse.json({ok:false,error:"unknown_action"},{status:400});
    }
    return NextResponse.json({ok:true,data});
  }catch(error){const message=error instanceof Error?error.message:"action_failed";const status=message==="insufficient_coins"?409:400;console.error("family action failed",error);return NextResponse.json({ok:false,error:message},{status});}
}
