import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {verifyFamilySession} from "@/lib/familySession";
import {usableHttpUrl} from "@/lib/avatarResolve";

const AVATAR_BUCKET="familybot-avatars";
function db(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Family Core database is not configured");return createClient(url,key,{db:{schema:"familybot"},auth:{persistSession:false,autoRefreshToken:false}})}
function sessionFrom(req:NextRequest){const auth=req.headers.get("authorization")||"";const token=auth.startsWith("Bearer ")?auth.slice(7):"";return token?verifyFamilySession(token):null}
async function avatar(s:ReturnType<typeof db>,value?:string|null){if(!value)return null;if(value.startsWith("storage:")){const signed=await s.storage.from(AVATAR_BUCKET).createSignedUrl(value.slice(8),43200);return signed.error?null:signed.data.signedUrl}return usableHttpUrl(value)}

export async function GET(req:NextRequest){
  try{
    const session=sessionFrom(req);if(!session)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
    const s=db();
    const[profileRes,familyRes,countRes]=await Promise.all([
      s.from("members").select("id,display_name,first_name,avatar_url,xp,coins,level,streak,role,is_founder,equipped_profile_item").eq("family_id",session.familyId).eq("bale_user_id",session.userId).maybeSingle(),
      s.from("families").select("id,name,level,xp,coins,house_level").eq("id",session.familyId).single(),
      s.from("members").select("id",{count:"exact",head:true}).eq("family_id",session.familyId),
    ]);
    if(profileRes.error)throw profileRes.error;if(familyRes.error)throw familyRes.error;if(countRes.error)throw countRes.error;
    const raw=profileRes.data;
    const resolved=raw?await avatar(s,raw.avatar_url):null;
    const profile=raw?{...raw,avatar_url:resolved,resolved_avatar_url:resolved,is_founder:Boolean(raw.is_founder||raw.role==="founder")}:null;
    const f=familyRes.data;
    return NextResponse.json({ok:true,family:{id:f.id,name:f.name,level:Number(f.level||1),xp:Number(f.xp||0),coins:Number(f.coins||0),houseLevel:Number(f.house_level||1),membersCount:countRes.count||0},profile},{headers:{"cache-control":"no-store"}});
  }catch(error){console.error("profile shell failed",error);return NextResponse.json({ok:false,error:"profile_shell_unavailable"},{status:500})}
}
