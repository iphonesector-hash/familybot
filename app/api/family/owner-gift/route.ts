import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {verifyFamilySession} from "@/lib/familySession";
import {baleApi} from "@/lib/bale";

function db(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Family Core database is not configured");return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}
function sessionFrom(req:NextRequest){const a=req.headers.get("authorization")||"";return a.startsWith("Bearer ")?verifyFamilySession(a.slice(7)):null}
async function ownerCheck(chatId:number,userId:number){const r=await baleApi<{result?:Array<{status?:string;user?:{id?:number}}> }>("getChatAdministrators",{chat_id:chatId});const row=r.result?.find(x=>String(x.user?.id)===String(userId));return Boolean(row&&["creator","owner"].includes(String(row.status||"").toLowerCase()))}
async function me(familyId:string,userId:number){const r=await db().from("members").select("id").eq("family_id",familyId).eq("bale_user_id",userId).single();if(r.error)throw r.error;return r.data.id as string}

export async function GET(req:NextRequest){
  try{
    const s=sessionFrom(req);if(!s)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
    if(!await ownerCheck(s.chatId,s.userId))return NextResponse.json({ok:false,error:"owner_required"},{status:403});
    const rows=await db().from("members").select("id,bale_user_id,display_name,first_name,relation_label,coins,xp,level").eq("family_id",s.familyId).order("display_name");
    if(rows.error)throw rows.error;
    return NextResponse.json({ok:true,members:rows.data||[]});
  }catch(error){console.error("owner gift members failed",error);return NextResponse.json({ok:false,error:"owner_gift_unavailable"},{status:500})}
}

export async function POST(req:NextRequest){
  try{
    const s=sessionFrom(req);if(!s)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
    if(!await ownerCheck(s.chatId,s.userId))return NextResponse.json({ok:false,error:"owner_required"},{status:403});
    const body=await req.json() as {targetMemberId?:string;kind?:"coins"|"xp";amount?:number;reason?:string};
    const target=String(body.targetMemberId||""),kind=String(body.kind||""),amount=Math.floor(Number(body.amount));
    if(!target||!["coins","xp"].includes(kind)||!Number.isFinite(amount)||amount<1||amount>100000)return NextResponse.json({ok:false,error:"invalid_gift"},{status:400});
    const ownerMember=await me(s.familyId,s.userId);
    const result=await db().rpc("family_owner_gift_atomic",{
      p_family_id:s.familyId,
      p_owner_member_id:ownerMember,
      p_target_member_id:target,
      p_kind:kind,
      p_amount:amount,
      p_reason:String(body.reason||"").slice(0,500)||null,
    });
    if(result.error){if(String(result.error.message||"").includes("target_member_not_found"))return NextResponse.json({ok:false,error:"member_not_found"},{status:404});throw result.error}
    return NextResponse.json({ok:true,result:result.data});
  }catch(error){console.error("owner gift failed",error);return NextResponse.json({ok:false,error:"owner_gift_failed"},{status:500})}
}
