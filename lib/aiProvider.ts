export type ChatRole="system"|"user"|"assistant";
export type ChatMessage={role:ChatRole;content:string};

const GROQ_CHAT="https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL="openai/gpt-oss-120b";

export function resolveChatCompletionsUrl(raw?:string):string{
  const input=String(raw??process.env.AI_BASE_URL??"").trim();
  if(!input)return GROQ_CHAT;
  const trimmed=input.replace(/\/+$/,"");
  try{
    const u=new URL(trimmed);
    const host=u.hostname.toLowerCase();
    const path=(u.pathname||"").replace(/\/+$/,"")||"";
    if(host==="api.groq.com"||host.endsWith(".groq.com")){
      return `${u.protocol}//${u.host}/openai/v1/chat/completions`;
    }
    if(/\/chat\/completions$/i.test(path))return `${u.origin}${path}`;
    if(/\/openai\/v1$/i.test(path)||/\/v1$/i.test(path))return `${u.origin}${path}/chat/completions`;
    if(!path)return `${u.origin}/v1/chat/completions`;
    return `${u.origin}${path}/chat/completions`;
  }catch{
    return GROQ_CHAT;
  }
}

export function aiProviderMeta(){
  const resolvedChatUrl=resolveChatCompletionsUrl();
  let baseHost="unknown",pathname="unknown";
  try{const url=new URL(resolvedChatUrl);baseHost=url.host;pathname=url.pathname}catch{/* ignore */}
  return {
    provider:process.env.AI_PROVIDER||"groq",
    model:process.env.AI_MODEL||DEFAULT_MODEL,
    resolvedChatUrl,
    baseHost,
    pathname,
    keyConfigured:Boolean(process.env.GROQ_API_KEY||process.env.AI_API_KEY)
  };
}

export function sanitizeModelText(raw:unknown){
  return String(raw??"")
    .replace(/<think>[\s\S]*?<\/think>/gi,"")
    .replace(/<analysis>[\s\S]*?<\/analysis>/gi,"")
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi,"")
    .replace(/<\/?(?:think|analysis|reasoning)>/gi,"")
    .trim();
}

export type CompleteChatResult=
  |{ok:true;text:string;status:number}
  |{ok:false;error:string;status:number;timeout?:boolean};

export async function completeChat(input:{
  messages:ChatMessage[];
  temperature?:number;
  timeoutMs?:number;
  maxTokens?:number;
  logTag?:string;
}):Promise<CompleteChatResult>{
  const tag=input.logTag||"[ai.provider]";
  const key=process.env.GROQ_API_KEY||process.env.AI_API_KEY;
  const meta=aiProviderMeta();
  if(!key){
    console.info(tag,"provider_missing_key");
    return {ok:false,error:"missing_key",status:0};
  }
  const providerLog=(model:string,status:number)=>console.info("[ai.provider]",{provider:meta.provider,model,host:meta.baseHost,pathname:meta.pathname,status});
  try{
    const request=async(model:string)=>{
      const body:Record<string,unknown>={model,temperature:input.temperature??0.48,messages:input.messages};
      if(input.maxTokens)body.max_tokens=input.maxTokens;
      const isGroq=meta.baseHost==="api.groq.com"||meta.baseHost.endsWith(".groq.com");
      if(isGroq&&/^(?:openai\/gpt-oss|qwen\/qwen3)/i.test(model))body.reasoning_format="hidden";
      const response=await fetch(meta.resolvedChatUrl,{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${key}`},body:JSON.stringify(body),signal:AbortSignal.timeout(input.timeoutMs??14000)});
      const data=await response.json().catch(()=>null);
      providerLog(model,response.status);
      return{response,data};
    };
    let model=meta.model;
    let {response,data}=await request(model);
    if(response.status===404){
      const modelsUrl=new URL("/openai/v1/models",meta.resolvedChatUrl).toString();
      const listed=await fetch(modelsUrl,{headers:{authorization:`Bearer ${key}`},cache:"no-store",signal:AbortSignal.timeout(5000)});
      const payload=await listed.json().catch(()=>null);
      const ids=(Array.isArray(payload?.data)?payload.data:[]).map((row:any)=>String(row?.id||"")).filter(Boolean) as string[];
      const preferred=[process.env.AI_FALLBACK_MODEL,"openai/gpt-oss-120b","openai/gpt-oss-20b","qwen/qwen3.8-27b","qwen/qwen3.6-27b","llama-3.1-8b-instant"].filter(Boolean) as string[];
      const fallback=preferred.find(id=>id!==model&&ids.includes(id))||ids.find(id=>id!==model&&/llama|qwen|gpt|gemma/i.test(id)&&!/guard|whisper|tts|prompt/i.test(id));
      console.info("[ai.provider]",{provider:meta.provider,model,host:meta.baseHost,pathname:"/openai/v1/models",status:listed.status,configuredModelAvailable:ids.includes(model),fallbackSelected:Boolean(fallback)});
      if(fallback){model=fallback;({response,data}=await request(model));}
    }
    if(!response.ok)return {ok:false,error:`AI provider returned ${response.status}`,status:response.status};
    if(!data)return {ok:false,error:"پاسخ مدل قابل خواندن نبود.",status:502};
    const text=sanitizeModelText(data?.choices?.[0]?.message?.content);
    if(!text)return {ok:false,error:"empty_response",status:response.status};
    return {ok:true,text,status:response.status};
  }catch(e){
    const timeout=e instanceof Error&&(e.name==="TimeoutError"||e.name==="AbortError");
    console.info(tag,timeout?"provider_timeout":"provider_network_fail",{kind:e instanceof Error?e.name:"unknown"});
    return {
      ok:false,
      timeout,
      status:504,
      error:timeout?"پاسخ مدل بیش از حد طول کشید. دوباره بفرست.":"ارتباط با مدل زبانی برقرار نشد."
    };
  }
}
