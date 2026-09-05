export const runtime="edge";

const API_BASE="https://tapi.bale.ai/bot";
const METHODS=new Set([
  "sendMessage","editMessageText","deleteMessage","answerCallbackQuery","banChatMember","unbanChatMember","restrictChatMember","getChatAdministrators","pinChatMessage","unpinChatMessage","setWebhook","getWebhookInfo"
]);

function json(body:unknown,status:number){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"no-store"}})}

export async function POST(req:Request){
  const token=process.env.BALE_BOT_TOKEN;
  if(!token)return json({ok:false,description:"relay_not_configured"},503);
  if(req.headers.get("authorization")!==`Bearer ${token}`)return json({ok:false,description:"unauthorized"},401);

  const body=await req.json().catch(()=>null) as {method?:string;payload?:Record<string,unknown>}|null;
  if(!body||!body.method||!METHODS.has(body.method)||!body.payload||typeof body.payload!=="object"||Array.isArray(body.payload))return json({ok:false,description:"invalid_request"},400);

  try{
    const upstream=await fetch(`${API_BASE}${token}/${body.method}`,{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify(body.payload),
      cache:"no-store",
      signal:AbortSignal.timeout(8000),
    });
    const text=await upstream.text();
    return new Response(text,{status:upstream.status,headers:{"content-type":upstream.headers.get("content-type")||"application/json","cache-control":"no-store"}});
  }catch(error){
    console.error("[bale.relay] upstream_failed",{method:body.method,kind:error instanceof Error?error.name:"unknown"});
    return json({ok:false,description:"relay_upstream_failed"},502);
  }
}
