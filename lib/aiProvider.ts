export type ChatRole="system"|"user"|"assistant";
export type ChatMessage={role:ChatRole;content:string};

const GROQ_CHAT="https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL="llama-3.3-70b-versatile";

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
  let baseHost="unknown";
  try{baseHost=new URL(resolvedChatUrl).host}catch{/* ignore */}
  return {
    provider:process.env.AI_PROVIDER||"groq",
    model:process.env.AI_MODEL||DEFAULT_MODEL,
    resolvedChatUrl,
    baseHost,
    keyConfigured:Boolean(process.env.GROQ_API_KEY||process.env.AI_API_KEY)
  };
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
  console.info(tag,"provider_selected",{provider:meta.provider,model:meta.model,baseHost:meta.baseHost});
  try{
    const body:Record<string,unknown>={
      model:meta.model,
      temperature:input.temperature??0.48,
      messages:input.messages
    };
    if(input.maxTokens)body.max_tokens=input.maxTokens;
    const response=await fetch(meta.resolvedChatUrl,{
      method:"POST",
      headers:{"content-type":"application/json",authorization:`Bearer ${key}`},
      body:JSON.stringify(body),
      signal:AbortSignal.timeout(input.timeoutMs??14000)
    });
    console.info(tag,"provider_http",{status:response.status});
    if(!response.ok){
      return {ok:false,error:`AI provider returned ${response.status}`,status:response.status};
    }
    let data:any=null;
    try{data=await response.json()}catch{
      return {ok:false,error:"پاسخ مدل قابل خواندن نبود.",status:502};
    }
    const text=String(data?.choices?.[0]?.message?.content||"").trim();
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
