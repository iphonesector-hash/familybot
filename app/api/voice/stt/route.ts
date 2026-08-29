import {NextRequest,NextResponse} from "next/server";
import {verifyFamilySession} from "@/lib/familySession";

export const runtime="nodejs";

function session(req:NextRequest){
  const a=req.headers.get("authorization")||"";
  return a.startsWith("Bearer ")?verifyFamilySession(a.slice(7)):null;
}

export async function POST(req:NextRequest){
  if(!session(req))return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
  const key=process.env.ELEVENLABS_API_KEY;
  if(!key)return NextResponse.json({ok:false,error:"stt_not_configured"},{status:503});
  try{
    const form=await req.formData();
    const file=form.get("audio");
    if(!(file instanceof File)||file.size<100)return NextResponse.json({ok:false,error:"audio_required"},{status:400});
    if(file.size>10*1024*1024)return NextResponse.json({ok:false,error:"audio_too_large"},{status:413});

    const body=new FormData();
    body.set("file",file,file.name||"voice.webm");
    body.set("model_id",process.env.ELEVENLABS_STT_MODEL_ID||"scribe_v2");
    body.set("language_code","fa");
    body.set("tag_audio_events","false");
    body.set("diarize","false");

    const response=await fetch("https://api.elevenlabs.io/v1/speech-to-text",{
      method:"POST",
      headers:{"xi-api-key":key},
      body,
      cache:"no-store",
      signal:AbortSignal.timeout(30000),
    });
    const data=await response.json().catch(()=>null) as {text?:string;detail?:unknown}|null;
    if(!response.ok){
      console.error("ElevenLabs Scribe STT failed",response.status);
      return NextResponse.json({ok:false,error:"stt_provider_failed"},{status:502});
    }
    const text=String(data?.text||"").trim();
    if(!text)return NextResponse.json({ok:false,error:"empty_transcription"},{status:422});
    return NextResponse.json({ok:true,text,provider:"elevenlabs",model:process.env.ELEVENLABS_STT_MODEL_ID||"scribe_v2"},{headers:{"cache-control":"no-store"}});
  }catch(error){
    console.error("stt failed",error instanceof Error?error.message:"stt_failed");
    return NextResponse.json({ok:false,error:"stt_failed"},{status:502});
  }
}
