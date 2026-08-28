import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyFamilySession } from "@/lib/familySession";

const Body=z.object({text:z.string().min(1).max(2500)});
function sessionFrom(req:NextRequest){const a=req.headers.get("authorization")||"";return a.startsWith("Bearer ")?verifyFamilySession(a.slice(7)):null}

export async function POST(req:NextRequest){
  try{
    const session=sessionFrom(req);
    if(!session)return new Response(JSON.stringify({error:"unauthorized"}),{status:401,headers:{"content-type":"application/json","cache-control":"no-store"}});
    const {text}=Body.parse(await req.json());
    const key=process.env.ELEVENLABS_API_KEY;
    const voiceId=process.env.ELEVENLABS_VOICE_ID;
    const modelId=process.env.ELEVENLABS_MODEL_ID||"eleven_multilingual_v2";
    if(!key||!voiceId)return new Response(JSON.stringify({error:"voice_not_configured"}),{status:503,headers:{"content-type":"application/json","cache-control":"no-store"}});

    const response=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,{
      method:"POST",
      headers:{"xi-api-key":key,"content-type":"application/json","accept":"audio/mpeg"},
      body:JSON.stringify({text,model_id:modelId,voice_settings:{stability:.45,similarity_boost:.8,style:.35,use_speaker_boost:true}}),
      cache:"no-store",
    });
    if(!response.ok){
      const detail=await response.text().catch(()=>"");
      console.error("ElevenLabs TTS failed",response.status,detail.slice(0,300));
      return new Response(JSON.stringify({error:"tts_provider_failed"}),{status:502,headers:{"content-type":"application/json","cache-control":"no-store"}});
    }
    const audio=await response.arrayBuffer();
    return new Response(audio,{status:200,headers:{"content-type":"audio/mpeg","cache-control":"no-store, private","x-familybot-voice":"elevenlabs"}});
  }catch(error){
    const message=error instanceof Error?error.message:"tts_failed";
    return new Response(JSON.stringify({error:message}),{status:400,headers:{"content-type":"application/json","cache-control":"no-store"}});
  }
}