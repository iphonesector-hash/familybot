import {failed,safeSourceUrl,type SearchProvider,type SearchResult,type SearchSource} from "./provider";

const stamp=()=>new Date().toISOString();
function cleanAnswer(raw:unknown){return String(raw??"").replace(/<think>[\s\S]*?<\/think>/gi,"").replace(/<analysis>[\s\S]*?<\/analysis>/gi,"").replace(/<reasoning>[\s\S]*?<\/reasoning>/gi,"").replace(/<\/?(?:think|analysis|reasoning)>/gi,"").trim()}
function sourcesFromTools(tools:unknown):SearchSource[]{
  const out:SearchSource[]=[];
  for(const tool of Array.isArray(tools)?tools:[]){
    for(const row of Array.isArray((tool as any)?.search_results)?(tool as any).search_results:[]){
      const url=safeSourceUrl(row?.url),content=String(row?.content||row?.snippet||row?.text||"").trim().slice(0,1800);
      if(!url||!content||out.some(s=>s.url===url))continue;
      const published=typeof row?.published_date==="string"?Date.parse(row.published_date):NaN;
      out.push({title:String(row?.title||new URL(url).hostname).slice(0,180),url,content,...(Number.isFinite(published)?{publishedAt:new Date(published).toISOString()}:{})});
      if(out.length===5)return out;
    }
    const text=String((tool as any)?.output||"");
    const re=/(?:^|\n)Title:\s*(.+?)\n(?:URL|Url):\s*(https:\/\/[^\s]+)(?:\n(?:Content|Snippet):\s*([\s\S]*?))?(?=\nTitle:|$)/gi;
    for(const m of text.matchAll(re)){
      const url=safeSourceUrl(m[2]),content=String(m[3]||m[1]||"").trim().slice(0,1800);
      if(!url||!content||out.some(s=>s.url===url))continue;
      out.push({title:String(m[1]||new URL(url).hostname).trim().slice(0,180),url,content});
      if(out.length===5)return out;
    }
  }
  return out;
}

async function runCompound(key:string,model:"groq/compound-mini"|"groq/compound",query:string):Promise<SearchResult>{
  const prompt=`این پرسش درباره اطلاعات جاری است. حتماً از جستجوی وب زنده استفاده کن و فقط بر پایه داده تازه جواب بده. پاسخ فارسی، دقیق و کوتاه باشد و اگر خبر است تازگی خبر را بررسی کن. پرسش: ${query}`;
  try{
    // Intentionally use Groq's minimal documented Compound payload. Built-in web tools are enabled by default.
    const response=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${key}`},body:JSON.stringify({model,messages:[{role:"user",content:prompt}]}),cache:"no-store",signal:AbortSignal.timeout(model.endsWith("mini")?12000:16000)});
    const data=await response.json().catch(()=>null);
    if(!response.ok){console.info("[search.groq]","compound_failed",{model,status:response.status,detail:String(data?.error?.message||"").slice(0,180)});return failed(model,`http_${response.status}`)}
    const message=data?.choices?.[0]?.message,tools=Array.isArray(message?.executed_tools)?message.executed_tools:[];
    const usedWeb=tools.some((t:any)=>/(search|web_search|visit)/i.test(String(t?.type||t?.name||""))||/https?:\/\//i.test(String(t?.output||"")));
    const answer=cleanAnswer(message?.content),sources=sourcesFromTools(tools);
    if(!usedWeb||!answer)return failed(model,!usedWeb?"no_web_tool":"empty_answer");
    return{used:true,ok:true,provider:model,fetchedAt:stamp(),sources,answer};
  }catch(e){console.info("[search.groq]","compound_network_fail",{model,kind:e instanceof Error?e.name:"unknown"});return failed(model,"network_or_timeout")}
}

export const groqCompoundProvider:SearchProvider={async search(query){
  const key=process.env.GROQ_API_KEY;
  if(!key)return failed("groq-compound","missing_key",["GROQ_API_KEY"]);
  const mini=await runCompound(key,"groq/compound-mini",query);
  if(mini.ok)return mini;
  const full=await runCompound(key,"groq/compound",query);
  if(full.ok)return full;
  return failed("groq-compound",`mini:${mini.error||"failed"};full:${full.error||"failed"}`);
}};
