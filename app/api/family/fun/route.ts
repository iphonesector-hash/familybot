import {NextRequest,NextResponse} from "next/server";
import {verifyFamilySession} from "@/lib/familySession";
import {FUN_BANK,CULTURE_EXTRA,pickFresh,type FunKind} from "@/lib/funBank";
import {DEZFULI_POEMS,DEZFULI_PROVERBS} from "@/lib/dezfuliCulture";

function s(req:NextRequest){const a=req.headers.get("authorization")||"";return a.startsWith("Bearer ")?verifyFamilySession(a.slice(7)):null}

export async function POST(req:NextRequest){
  if(!s(req)) return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
  const b=await req.json().catch(()=>({}));
  const type=String(b.type||"") as FunKind|"dezfuli-proverb"|"dezfuli-poem"|"proverb"|"poem";
  const recent=Array.isArray(b.recent)?b.recent.map(String).slice(0,24):[];
  if(type==="riddle"||type==="joke"||type==="fact"||type==="motivation"||type==="hafez"){
    const item=pickFresh(FUN_BANK[type],recent);
    return NextResponse.json({ok:true,data:{type,id:item.id,text:item.text,answer:type==="riddle"?item.extra:"",interpretation:type==="hafez"?item.extra:""}});
  }
  if(type==="dezfuli-proverb"){
    const item=pickFresh(DEZFULI_PROVERBS,recent);
    return NextResponse.json({ok:true,data:{type,id:item.id,text:item.text,interpretation:item.meaning}});
  }
  if(type==="dezfuli-poem"){
    const item=pickFresh(DEZFULI_POEMS,recent);
    return NextResponse.json({ok:true,data:{type,id:item.id,text:item.text,interpretation:item.meaning}});
  }
  if(type==="proverb"){
    const item=pickFresh(CULTURE_EXTRA.proverbs,recent);
    return NextResponse.json({ok:true,data:{type,id:item.id,text:item.text,interpretation:item.meaning}});
  }
  if(type==="poem"){
    const item=pickFresh(CULTURE_EXTRA.poems,recent);
    return NextResponse.json({ok:true,data:{type,id:item.id,text:item.text,interpretation:item.meaning}});
  }
  return NextResponse.json({ok:false,error:"unknown_fun_type"},{status:400});
}
