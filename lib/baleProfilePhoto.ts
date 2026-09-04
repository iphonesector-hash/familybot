import {createClient} from "@supabase/supabase-js";
import {isFamilyUpload,isServerBaleAvatar} from "@/lib/avatarResolve";

const API_BASE="https://tapi.bale.ai/bot";
const FILE_BASE="https://tapi.bale.ai/file/bot";
const AVATAR_BUCKET="family-avatars";
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

function fileIdFromPhotos(data:any):string|null{
  const photos=data?.result?.photos||data?.result;
  const first=Array.isArray(photos)?photos[0]:null;
  const sizes=Array.isArray(first)?first:Array.isArray(photos)?photos:null;
  if(!Array.isArray(sizes)||!sizes.length)return null;
  const best=sizes[sizes.length-1];
  return typeof best?.file_id==="string"?best.file_id:null;
}

function fileIdFromChat(data:any):string|null{
  const photo=data?.result?.photo;
  return photo?.big_file_id||photo?.small_file_id||null;
}

export async function resolveBaleProfilePhoto(userId:number){
  const cached=memory.get(userId);
  if(cached&&Date.now()-cached.at<DAY)return {ok:true as const,method:"memory",path:cached.path,status:"cached"};
  if(!token())return {ok:false as const,method:"none",path:null,status:"no_token"};

  const profile=await baleCall("getUserProfilePhotos",{user_id:userId,limit:1});
  let fileId=profile.ok?fileIdFromPhotos(profile.data):null;
  let method=fileId?"getUserProfilePhotos":"none";
  if(!fileId){
    const chat=await baleCall("getChat",{chat_id:userId});
    fileId=chat.ok?fileIdFromChat(chat.data):null;
    method=fileId?"getChat":"none";
    if(!fileId){
      return {
        ok:false as const,
        method:"unsupported_or_empty",
        path:null,
        status:`profile=${profile.status};chat=${chat.status}`
      };
    }
  }

  const file=await baleCall("getFile",{file_id:fileId});
  const filePath=String(file.data?.result?.file_path||"");
  if(!file.ok||!filePath)return {ok:false as const,method,path:null,status:`getFile_${file.status}`};

  const binary=await fetch(`${FILE_BASE}${token()}/${filePath}`,{cache:"no-store",signal:AbortSignal.timeout(6000)});
  if(!binary.ok)return {ok:false as const,method,path:null,status:`download_${binary.status}`};
  const buf=Buffer.from(await binary.arrayBuffer());
  if(buf.length<40)return {ok:false as const,method,path:null,status:"download_empty"};

  const supabase=db();
  const path=`bale/${userId}.jpg`;
  if(supabase){
    const up=await supabase.storage.from(AVATAR_BUCKET).upload(path,buf,{contentType:"image/jpeg",upsert:true});
    if(up.error)return {ok:false as const,method,path:null,status:`storage_${up.error.message}`};
  }
  memory.set(userId,{path:`storage:${path}`,at:Date.now()});
  return {ok:true as const,method,path:`storage:${path}`,status:"stored"};
}

export async function ensureMemberBaleAvatar(member:{id:string;family_id:string;bale_user_id:number;avatar_url?:string|null}){
  if(isFamilyUpload(member.avatar_url))return {used:false,reason:"family_upload",path:member.avatar_url||null};
  if(isServerBaleAvatar(member.avatar_url))return {used:false,reason:"already_resolved",path:member.avatar_url||null};
  const resolved=await resolveBaleProfilePhoto(member.bale_user_id);
  if(!resolved.ok||!resolved.path)return {used:false,reason:resolved.status,path:null};
  const supabase=db();
  if(supabase){
    await supabase.from("members").update({avatar_url:resolved.path}).eq("id",member.id).eq("family_id",member.family_id);
  }
  return {used:true,reason:resolved.method,path:resolved.path};
}
