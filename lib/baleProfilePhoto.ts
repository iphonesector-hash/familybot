import {createClient} from "@supabase/supabase-js";
import {isFamilyUpload,isServerBaleAvatar} from "@/lib/avatarResolve";

const API_BASE="https://tapi.bale.ai/bot";
const FILE_BASE="https://tapi.bale.ai/file/bot";
// Must match the private bucket created by the namespace migration.
const AVATAR_BUCKET="familybot-avatars";
const IMAGE_TYPES=new Map([["image/jpeg","jpg"],["image/png","png"],["image/webp","webp"]]);
const memory=new Map<number,{path:string;at:number}>();
const DAY=24*60*60*1000;

function token(){return process.env.BALE_BOT_TOKEN||""}
function db(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return null;
  return createClient(url,key,{db:{schema:"familybot"},auth:{persistSession:false,autoRefreshToken:false}});
}

async function baleCall(method:string,payload:Record<string,unknown>){
  const t=token();
  if(!t)return {ok:false as const,status:"no_token",data:null};
  try{
    const response=await fetch(`${API_BASE}${t}/${method}`,{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify(payload),
      cache:"no-store",
      signal:AbortSignal.timeout(5000)
    });
    const data=await response.json().catch(()=>null);
    if(!response.ok||data?.ok===false){
      return {ok:false as const,status:`${method}_${response.status}`,data};
    }
    return {ok:true as const,status:"ok",data};
  }catch(e){
    const timeout=e instanceof Error&&(e.name==="TimeoutError"||e.name==="AbortError");
    return {ok:false as const,status:timeout?`${method}_timeout`:`${method}_network`,data:null};
  }
}

function fileIdFromChat(data:any):string|null{
  const photo=data?.result?.photo;
  return photo?.big_file_id||photo?.small_file_id||null;
}

export async function resolveBaleProfilePhoto(userId:number){
  const cached=memory.get(userId);
  if(cached&&Date.now()-cached.at<DAY)return {ok:true as const,method:"memory",path:cached.path,status:"cached",pipeline:{miniappPhotoSupplied:false,getUserProfilePhotos:"unsupported_not_called",getChatPhoto:"skipped_cache",getFile:"skipped_cache",downloaded:true,stored:true}};
  if(!token())return {ok:false as const,method:"none",path:null,status:"no_token",pipeline:{miniappPhotoSupplied:false,getUserProfilePhotos:"unsupported_not_called",getChatPhoto:"no_token",getFile:"not_attempted",downloaded:false,stored:false}};

  // Bale documents getChat -> ChatFullInfo.photo. It does not document
  // Telegram's getUserProfilePhotos, so do not probe that endpoint.
  const chat=await baleCall("getChat",{chat_id:userId});
  const fileId=chat.ok?fileIdFromChat(chat.data):null;
  const method="getChat";
  const getChatStatus=fileId?"succeeded":chat.status;
  if(!fileId)return {ok:false as const,method:"unsupported_or_empty",path:null,status:`chat=${chat.status}`,pipeline:{miniappPhotoSupplied:false,getUserProfilePhotos:"unsupported_not_called",getChatPhoto:getChatStatus,getFile:"not_attempted",downloaded:false,stored:false}};

  const file=await baleCall("getFile",{file_id:fileId});
  const filePath=String(file.data?.result?.file_path||"");
  if(!file.ok||!filePath)return {ok:false as const,method,path:null,status:`getFile_${file.status}`,pipeline:{miniappPhotoSupplied:false,getUserProfilePhotos:"unsupported_not_called",getChatPhoto:getChatStatus,getFile:file.status,downloaded:false,stored:false}};

  const binary=await fetch(`${FILE_BASE}${token()}/${filePath}`,{cache:"no-store",signal:AbortSignal.timeout(6000)});
  if(!binary.ok)return {ok:false as const,method,path:null,status:`download_${binary.status}`,pipeline:{miniappPhotoSupplied:false,getUserProfilePhotos:"unsupported_not_called",getChatPhoto:getChatStatus,getFile:"succeeded",downloaded:false,stored:false}};
  const contentType=String(binary.headers.get("content-type")||"").split(";")[0].trim().toLowerCase();
  const ext=IMAGE_TYPES.get(contentType);
  if(!ext)return {ok:false as const,method,path:null,status:"download_invalid_mime",pipeline:{miniappPhotoSupplied:false,getUserProfilePhotos:"unsupported_not_called",getChatPhoto:getChatStatus,getFile:"succeeded",downloaded:false,stored:false}};
  const buf=Buffer.from(await binary.arrayBuffer());
  const pipe={
    miniappPhotoSupplied:false,
    getUserProfilePhotos:"unsupported_not_called",
    getChatPhoto:getChatStatus,
    getFile:"succeeded",
    downloaded:false,
    stored:false
  };
  if(buf.length<40)return {ok:false as const,method,path:null,status:"download_empty",pipeline:pipe};

  const supabase=db();
  const path=`bale/${userId}.${ext}`;
  if(supabase){
    const up=await supabase.storage.from(AVATAR_BUCKET).upload(path,buf,{contentType,upsert:true});
    if(up.error)return {ok:false as const,method,path:null,status:`storage_${up.error.message}`,pipeline:{...pipe,downloaded:true,stored:false}};
  }
  pipe.downloaded=true;
  pipe.stored=true;
  memory.set(userId,{path:`storage:${path}`,at:Date.now()});
  return {ok:true as const,method,path:`storage:${path}`,status:"stored",pipeline:pipe};
}

export async function ensureMemberBaleAvatar(member:{id:string;family_id:string;bale_user_id:number;avatar_url?:string|null}){
  if(isFamilyUpload(member.avatar_url))return {used:false,reason:"family_upload",path:member.avatar_url||null,pipeline:{miniappPhotoSupplied:false,getUserProfilePhotos:"unsupported_not_called",getChatPhoto:"skipped",getFile:"skipped",downloaded:false,stored:false}};
  if(isServerBaleAvatar(member.avatar_url))return {used:false,reason:"already_resolved",path:member.avatar_url||null,pipeline:{miniappPhotoSupplied:false,getUserProfilePhotos:"unsupported_not_called",getChatPhoto:"skipped",getFile:"skipped",downloaded:true,stored:true}};
  const resolved=await resolveBaleProfilePhoto(member.bale_user_id);
  if(!resolved.ok||!resolved.path)return {used:false,reason:resolved.status,path:null,pipeline:resolved.pipeline};
  const supabase=db();
  if(supabase){
    await supabase.from("members").update({avatar_url:resolved.path}).eq("id",member.id).eq("family_id",member.family_id);
  }
  return {used:true,reason:resolved.method,path:resolved.path,pipeline:resolved.pipeline};
}
