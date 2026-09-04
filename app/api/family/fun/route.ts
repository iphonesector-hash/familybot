import {NextRequest,NextResponse} from "next/server";
import {verifyFamilySession} from "@/lib/familySession";
import {resolveContent,type ContentKind} from "@/lib/contentSources";

function s(req:NextRequest){const a=req.headers.get("authorization")||"";return a.startsWith("Bearer ")?verifyFamilySession(a.slice(7)):null}

const KINDS=new Set<ContentKind>(["joke","fact","riddle","motivation","hafez","proverb","poem","dezfuli-proverb","dezfuli-poem","dezfuli-word"]);

export async function POST(req:NextRequest){
  if(!s(req)) return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
  const b=await req.json().catch(()=>({}));
  const type=String(b.type||"") as ContentKind;
  if(!KINDS.has(type)) return NextResponse.json({ok:false,error:"unknown_fun_type"},{status:400});
  const recent=Array.isArray(b.recent)?b.recent.map(String).slice(0,24):[];
  const item=resolveContent(type,recent);
  return NextResponse.json({ok:true,data:{type,id:item.id,text:item.text,answer:type==="riddle"?item.extra:"",interpretation:item.extra||"",source:item.source}});
}
