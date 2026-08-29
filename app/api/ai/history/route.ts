import {NextRequest,NextResponse} from "next/server";
import {verifyFamilySession} from "@/lib/familySession";
import {readAiMemory} from "@/lib/aiMemory";

function sessionFrom(req:NextRequest){
  const a=req.headers.get("authorization")||"";
  return a.startsWith("Bearer ")?verifyFamilySession(a.slice(7)):null;
}

export async function GET(req:NextRequest){
  const session=sessionFrom(req);
  if(!session)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
  try{
    const rows=await readAiMemory(session.familyId,session.userId,30);
    const messages=rows.filter(x=>x.role!=="summary").map(x=>({role:x.role,content:x.content,createdAt:x.created_at}));
    return NextResponse.json({ok:true,messages},{headers:{"cache-control":"no-store, private"}});
  }catch(error){
    console.error("ai history failed",error instanceof Error?error.message:"history_failed");
    return NextResponse.json({ok:false,error:"history_failed"},{status:500});
  }
}
