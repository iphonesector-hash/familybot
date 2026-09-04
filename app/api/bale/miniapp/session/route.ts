import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {validateBaleInitData} from "@/lib/baleMiniAppAuth";
import {createFamilySession} from "@/lib/familySession";
import {isAdmin} from "@/lib/bale";
import {balePhotoDiagnostic,extractBalePhotoUrl,isFamilyUpload} from "@/lib/avatarResolve";
import {ensureMemberBaleAvatar} from "@/lib/baleProfilePhoto";

function db(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Family Core database is not configured");return createClient(url,key,{db:{schema:"familybot"},auth:{persistSession:false,autoRefreshToken:false}})}

export async function POST(req:NextRequest){
 try{
  const body=await req.json(),init=validateBaleInitData(String(body?.initData||""));
  if(!init?.user?.id)return NextResponse.json({ok:false,error:"invalid_init_data"},{status:401});
  const diag=balePhotoDiagnostic(init.user);
  console.info("[bale.photo]",diag);
  const supabase=db();
  const {data:members,error}=await supabase.from("members").select("id,family_id,bale_user_id,display_name,first_name,last_active_at,is_founder,role,avatar_url,families!members_family_id_fkey(id,name,bale_chat_id)").eq("bale_user_id",init.user.id).order("last_active_at",{ascending:false});
  if(error)throw error;
  const rows=(members||[]).filter((m:any)=>m.families?.bale_chat_id);
  if(!rows.length)return NextResponse.json({ok:true,status:"needs_family",user:init.user,photoDiagnostic:diag});
  const requestedFamilyId=body?.familyId?String(body.familyId):"",selected=(requestedFamilyId?rows.find((r:any)=>String(r.family_id)===requestedFamilyId):rows.length===1?rows[0]:null) as any;
  if(!selected)return NextResponse.json({ok:true,status:"choose_family",user:init.user,families:rows.map((r:any)=>({id:r.family_id,name:r.families?.name||"خانواده",chatId:r.families?.bale_chat_id})),photoDiagnostic:diag});
  const chatId=Number(selected.families.bale_chat_id),token=createFamilySession({familyId:String(selected.family_id),chatId,userId:init.user.id},60*60*12),founder=Boolean(selected.is_founder||selected.role==="founder"),canManage=founder||await isAdmin(chatId,init.user.id).catch(()=>false);
  const patch:Record<string,unknown>={last_active_at:new Date().toISOString()};
  if(init.user.first_name)patch.first_name=String(init.user.first_name).slice(0,120);
  if(init.user.last_name)patch.last_name=String(init.user.last_name).slice(0,120);
  if(init.user.username)patch.username=String(init.user.username).slice(0,120);
  const photo=extractBalePhotoUrl(init.user);
  let serverResolve="skipped";
  let pipeline:Record<string,unknown>|{miniappPhotoSupplied:boolean}={miniappPhotoSupplied:Boolean(photo)};
  if(photo&&!isFamilyUpload(selected.avatar_url)){
    patch.avatar_url=photo;
    serverResolve="miniapp_photo";
    pipeline={miniappPhotoSupplied:true,getUserProfilePhotos:"unsupported_not_called",getChatPhoto:"skipped_miniapp",getFile:"skipped_miniapp",downloaded:false,stored:false};
  }else if(!photo&&!isFamilyUpload(selected.avatar_url)){
    const resolved=await ensureMemberBaleAvatar({id:selected.id,family_id:selected.family_id,bale_user_id:init.user.id,avatar_url:selected.avatar_url});
    serverResolve=resolved.reason;
    pipeline=resolved.pipeline||pipeline;
    if(resolved.path&&!isFamilyUpload(selected.avatar_url))patch.avatar_url=resolved.path;
  }
  const finalValue=String(patch.avatar_url||selected.avatar_url||"");
  const finalAvatarSource=isFamilyUpload(finalValue)?"uploaded-family":photo?"miniapp":finalValue.startsWith("storage:bale/")?"bale-api":"none";
  console.info("[bale.photo]",{initUserPresent:diag.userPresent,baleUserIdPresent:diag.userIdPresent,miniAppPhotoPresent:Boolean(photo),miniAppPhotoUsable:Boolean(photo),fallbackAttempt:!photo,getUserProfilePhotosStatus:(pipeline as any).getUserProfilePhotos||"unsupported_not_called",getChatStatus:(pipeline as any).getChatPhoto||"not_attempted",getFileStatus:(pipeline as any).getFile||"not_attempted",fileDownloaded:Boolean((pipeline as any).downloaded),storageUploadSucceeded:Boolean((pipeline as any).stored),avatarStoredAsStoragePath:finalValue.startsWith("storage:"),signedUrlGenerated:false,finalAvatarPresent:Boolean(finalValue),finalAvatarSource});
  const updated=await supabase.from("members").update(patch).eq("id",selected.id).eq("family_id",selected.family_id);if(updated.error)throw updated.error;
  return NextResponse.json({ok:true,status:"ready",session:token,canManage,family:{id:selected.family_id,name:selected.families?.name||"خانواده",chatId},user:{...init.user,photo_url:photo||init.user.photo_url},photoDiagnostic:diag});
 }catch(error){console.error("Bale Mini App session bootstrap failed",error);return NextResponse.json({ok:false,error:"bootstrap_failed"},{status:500})}
}
