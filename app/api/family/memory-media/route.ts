import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {verifyFamilySession} from "@/lib/familySession";

const BUCKET="familybot-memories";
const MAX_BYTES=20*1024*1024;
const TYPES=new Map<string,string>([
  ["image/jpeg","jpg"],
  ["image/png","png"],
  ["image/webp","webp"],
  ["video/mp4","mp4"],
  ["video/quicktime","mov"],
]);
function db(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Family Core database is not configured");return createClient(url,key,{db:{schema:"familybot"},auth:{persistSession:false,autoRefreshToken:false}})}
function sessionFrom(req:NextRequest){const a=req.headers.get("authorization")||"";return a.startsWith("Bearer ")?verifyFamilySession(a.slice(7)):null}

export async function POST(req:NextRequest){
  try{
    const session=sessionFrom(req);if(!session)return NextResponse.json({ok:false,error:"unauthorized"},{status:401,headers:{"cache-control":"no-store"}});
    const form=await req.formData();const file=form.get("file");
    if(!(file instanceof File))return NextResponse.json({ok:false,error:"file_required"},{status:400,headers:{"cache-control":"no-store"}});
    const ext=TYPES.get(file.type);if(!ext)return NextResponse.json({ok:false,error:"unsupported_media_type"},{status:400,headers:{"cache-control":"no-store"}});
    if(file.size<=0||file.size>MAX_BYTES)return NextResponse.json({ok:false,error:"file_too_large"},{status:413,headers:{"cache-control":"no-store"}});
    const supabase=db();
    const me=await supabase.from("members").select("id").eq("family_id",session.familyId).eq("bale_user_id",session.userId).single();if(me.error)throw me.error;
    const bucket=await supabase.storage.getBucket(BUCKET);
    if(bucket.error){const created=await supabase.storage.createBucket(BUCKET,{public:false,fileSizeLimit:MAX_BYTES,allowedMimeTypes:[...TYPES.keys()]});if(created.error)throw created.error}
    else if(bucket.data.public){const updated=await supabase.storage.updateBucket(BUCKET,{public:false,fileSizeLimit:MAX_BYTES,allowedMimeTypes:[...TYPES.keys()]});if(updated.error)throw updated.error}
    const path=`${session.familyId}/${me.data.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const upload=await supabase.storage.from(BUCKET).upload(path,new Uint8Array(await file.arrayBuffer()),{contentType:file.type,upsert:false});if(upload.error)throw upload.error;
    return NextResponse.json({ok:true,mediaRef:`storage:${path}`,kind:file.type.startsWith("video/")?"video":"image"},{headers:{"cache-control":"no-store"}});
  }catch(error){console.error("memory media upload failed",error);return NextResponse.json({ok:false,error:"memory_upload_failed"},{status:500,headers:{"cache-control":"no-store"}})}
}
