import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {validateBaleInitData} from "@/lib/baleMiniAppAuth";
import {createFamilySession} from "@/lib/familySession";
import {isAdmin} from "@/lib/bale";

function db(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Family Core database is not configured");return createClient(url,key,{db:{schema:"familybot"},auth:{persistSession:false,autoRefreshToken:false}})}

export async function POST(req:NextRequest){
 try{
  const body=await req.json(),init=validateBaleInitData(String(body?.initData||""));
  if(!init?.user?.id)return NextResponse.json({ok:false,error:"invalid_init_data"},{status:401});
  const supabase=db();
  const {data:members,error}=await supabase.from("members").select("id,family_id,bale_user_id,display_name,first_name,last_active_at,is_founder,role,families(id,name,bale_chat_id)").eq("bale_user_id",init.user.id).order("last_active_at",{ascending:false});
  if(error)throw error;
  const rows=(members||[]).filter((m:any)=>m.families?.bale_chat_id);
  if(!rows.length)return NextResponse.json({ok:true,status:"needs_family",user:init.user});
  const requestedFamilyId=body?.familyId?String(body.familyId):"",selected=(requestedFamilyId?rows.find((r:any)=>String(r.family_id)===requestedFamilyId):rows.length===1?rows[0]:null) as any;
  if(!selected)return NextResponse.json({ok:true,status:"choose_family",user:init.user,families:rows.map((r:any)=>({id:r.family_id,name:r.families?.name||"خانواده",chatId:r.families?.bale_chat_id}))});
  const chatId=Number(selected.families.bale_chat_id),token=createFamilySession({familyId:String(selected.family_id),chatId,userId:init.user.id},60*60*12),founder=Boolean(selected.is_founder||selected.role==="founder"),canManage=founder||await isAdmin(chatId,init.user.id).catch(()=>false);
  const patch:Record<string,unknown>={last_active_at:new Date().toISOString()};
  if(init.user.first_name)patch.first_name=String(init.user.first_name).slice(0,120);
  if(init.user.last_name)patch.last_name=String(init.user.last_name).slice(0,120);
  if(init.user.username)patch.username=String(init.user.username).slice(0,120);
  if(init.user.photo_url)patch.avatar_url=String(init.user.photo_url).slice(0,2000);
  await supabase.from("members").update(patch).eq("id",selected.id).eq("family_id",selected.family_id);
  return NextResponse.json({ok:true,status:"ready",session:token,canManage,family:{id:selected.family_id,name:selected.families?.name||"خانواده",chatId},user:init.user});
 }catch(error){console.error("Bale Mini App session bootstrap failed",error);return NextResponse.json({ok:false,error:"bootstrap_failed"},{status:500})}
}
