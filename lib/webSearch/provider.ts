import type {LiveKind} from "./classifier";

export type SearchSource={title:string;url:string;content:string;publishedAt?:string};
export type SearchResult={used:boolean;ok:boolean;provider:string;fetchedAt:string;sources:SearchSource[];error?:string;missingEnv?:string[];quote?:string};
export type SearchProvider={search:(query:string,kind:LiveKind)=>Promise<SearchResult>};
export const LIVE_SEARCH_WARNING="جست‌وجوی زنده الان پاسخ نداد.";
const stamp=()=>new Date().toISOString();
export function failed(provider:string,error:string,missingEnv?:string[]):SearchResult{return{used:true,ok:false,provider,fetchedAt:stamp(),sources:[],error,missingEnv}}
export function safeSourceUrl(raw:unknown){try{const u=new URL(String(raw));return u.protocol==="https:"&&!u.username&&!u.password?u.href:null}catch{return null}}
function fresh(seconds:unknown,maxAge:number){const n=Number(seconds),age=Date.now()-n*1000;return Number.isFinite(n)&&n>0&&age>=-60000&&age<=maxAge}
const fa=(n:number)=>new Intl.NumberFormat("fa-IR",{maximumFractionDigits:4}).format(n);
function marketNumber(raw:unknown){
  const faDigits="۰۱۲۳۴۵۶۷۸۹",arDigits="٠١٢٣٤٥٦٧٨٩";
  const normalized=String(raw??"").replace(/[٬،,\s]/g,"").replace(/[۰-۹]/g,d=>String(faDigits.indexOf(d))).replace(/[٠-٩]/g,d=>String(arDigits.indexOf(d)));
  const n=Number(normalized);return Number.isFinite(n)?n:NaN;
}
function sourceTime(raw:unknown){
  if(raw===null||raw===undefined)return undefined;
  const numeric=Number(raw);let ms=Number.isFinite(numeric)&&numeric>0?(numeric>1e12?numeric:numeric*1000):Date.parse(String(raw));
  if(!Number.isFinite(ms)||ms>Date.now()+60000||ms<Date.now()-86400000)return undefined;
  return new Date(ms).toISOString();
}

// Public structured fallback for Tehran market quotes. TGJU's current feed reports IRR.
async function tgjuMarketQuote(kind:LiveKind):Promise<SearchResult>{
  const item=kind==="currency"?"price_dollar_rl":"geram18";
  const label=kind==="currency"?"دلار آمریکا، بازار آزاد":"هر گرم طلای ۱۸ عیار";
  try{
    const r=await fetch(`https://call3.tgju.org/ajax.json?rev=${Date.now()}`,{headers:{"user-agent":"Mozilla/5.0 (compatible; JAHANI-FamilyBot/1.0)"},cache:"no-store",signal:AbortSignal.timeout(8000)});
    if(!r.ok)return failed("tgju",`http_${r.status}`);
    const data=await r.json(),row=data?.current?.[item],rial=marketNumber(row?.p);
    if(!Number.isFinite(rial)||rial<=0)return failed("tgju","invalid_quote");
    const toman=rial/10,quote=`${label}: ${fa(toman)} تومان (${fa(rial)} ریال)`;
    const publishedAt=sourceTime(row?.ts);
    return{used:true,ok:true,provider:"tgju",fetchedAt:stamp(),quote,sources:[{title:"شبکه اطلاع‌رسانی طلا، سکه و ارز",url:"https://www.tgju.org/",content:quote,...(publishedAt?{publishedAt}:{})}]};
  }catch{return failed("tgju","network_or_timeout")}
}
async function marketFallback(kind:LiveKind,primaryError:string,missingEnv?:string[]){
  const fallback=await tgjuMarketQuote(kind);
  return fallback.ok?fallback:failed("market",`${primaryError};tgju_${fallback.error||"failed"}`,missingEnv);
}

// Only the current public query is sent. Family context and conversation history never leave via search.
export const tavilyProvider:SearchProvider={async search(query,kind){
  const key=process.env.TAVILY_API_KEY;
  if(!key)return failed("tavily","missing_key",["TAVILY_API_KEY"]);
  try{
    const r=await fetch("https://api.tavily.com/search",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${key}`},body:JSON.stringify({query,topic:kind==="news"?"news":"general",time_range:"d",max_results:5,search_depth:"advanced",include_answer:false,include_raw_content:false}),cache:"no-store",signal:AbortSignal.timeout(8000)});
    if(!r.ok)return failed("tavily",`http_${r.status}`);
    const data=await r.json();
    const sources:SearchSource[]=[];
    for(const row of Array.isArray(data.results)?data.results:[]){
      const url=safeSourceUrl(row.url),content=typeof row.content==="string"?row.content.trim().slice(0,1800):"";
      if(!url||!content||sources.some(s=>s.url===url))continue;
      const published=typeof row.published_date==="string"?Date.parse(row.published_date):NaN;
      if(kind==="news"&&!Number.isFinite(published))continue;
      // Never label an old (or future-dated) news item as today's news.
      if(Number.isFinite(published)&&(published>Date.now()+60000||published<Date.now()-86400000))continue;
      sources.push({title:String(row.title||new URL(url).hostname).slice(0,180),url,content,...(Number.isFinite(published)?{publishedAt:new Date(published).toISOString()}:{})});
      if(sources.length===4)break;
    }
    return sources.length?{used:true,ok:true,provider:"tavily",fetchedAt:stamp(),sources}:failed("tavily","empty_or_stale");
  }catch{return failed("tavily","network_or_timeout")}
}};

export async function marketQuote(query:string,kind:LiveKind):Promise<SearchResult>{
  if(kind==="crypto"){
    // Explicit crypto assets and units; never substitute USDT for a Tehran USD cash quote.
    const q=query.replace(/\u200c/g," ");
    const assets=[{pattern:/(بیت\s*کوین|bitcoin|\bbtc\b)/i,id:"bitcoin",name:"بیت‌کوین"},{pattern:/(اتریوم|ethereum|\beth\b)/i,id:"ethereum",name:"اتریوم"},{pattern:/(تتر|\busdt\b)/i,id:"tether",name:"تتر"}].filter(a=>a.pattern.test(q));
    if(!assets.length||/(تومان|ریال)/.test(query))return failed("coingecko","unsupported_quote_currency");
    try{
      const headers:Record<string,string>={};if(process.env.COINGECKO_API_KEY)headers["x-cg-demo-api-key"]=process.env.COINGECKO_API_KEY;
      const r=await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${assets.map(a=>a.id).join(",")}&vs_currencies=usd&include_last_updated_at=true`,{headers,cache:"no-store",signal:AbortSignal.timeout(8000)});
      if(!r.ok)return failed("coingecko",`http_${r.status}`);
      const data=await r.json(),sources:SearchSource[]=[];
      for(const asset of assets){
        const row=data[asset.id],value=Number(row?.usd);
        if(!Number.isFinite(value)||value<=0||!fresh(row?.last_updated_at,600000))return failed("coingecko","invalid_or_stale_quote");
        sources.push({title:`CoinGecko · ${asset.name}`,url:`https://www.coingecko.com/en/coins/${asset.id}`,content:`${asset.name}: ${fa(value)} دلار آمریکا`,publishedAt:new Date(row.last_updated_at*1000).toISOString()});
      }
      return{used:true,ok:true,provider:"coingecko",fetchedAt:stamp(),sources,quote:sources.map(s=>s.content).join("\n")};
    }catch{return failed("coingecko","network_or_timeout")}
  }
  if(kind!=="currency"&&kind!=="gold")return failed("market","unsupported_kind");
  if(kind==="currency"&&/(کانادا|استرالیا|رسمی|دولتی|توافقی|هرات|فردایی)/.test(query))return failed("navasan","unsupported_market");
  if(kind==="gold"&&/(اونس|۲۴|24|آبشده|آب شده|سکه)/.test(query))return failed("navasan","unsupported_gold_instrument");

  const missing=[!process.env.NAVASAN_API_KEY?"NAVASAN_API_KEY":"",!process.env.NAVASAN_PRICE_UNIT?"NAVASAN_PRICE_UNIT":""].filter(Boolean);
  if(missing.length)return marketFallback(kind,"navasan_missing_configuration",missing);
  // The documented Navasan payload has no unit field: require an explicitly verified account unit.
  const unit=process.env.NAVASAN_PRICE_UNIT;
  if(unit!=="IRR"&&unit!=="IRT")return marketFallback(kind,"navasan_invalid_price_unit",["NAVASAN_PRICE_UNIT"]);
  const item=kind==="currency"?{id:/خرید/.test(query)?"usd_buy":"usd_sell",label:/خرید/.test(query)?"دلار آمریکا، خرید نقدی تهران":"دلار آمریکا، فروش نقدی تهران"}:{id:"18ayar",label:"هر گرم طلای ۱۸ عیار"};
  try{
    const url=new URL("https://api.navasan.tech/latest/");url.searchParams.set("api_key",process.env.NAVASAN_API_KEY!);url.searchParams.set("item",item.id);
    const r=await fetch(url,{cache:"no-store",redirect:"error",signal:AbortSignal.timeout(8000)});
    if(!r.ok)return marketFallback(kind,`navasan_http_${r.status}`);
    const data=await r.json(),row=data[item.id],value=Number(row?.value);
    const tehranDay=(d:Date)=>d.toLocaleDateString("en-CA",{timeZone:"Asia/Tehran"});
    if(!Number.isFinite(value)||value<=0||!fresh(row?.timestamp,86400000)||tehranDay(new Date(row.timestamp*1000))!==tehranDay(new Date()))return marketFallback(kind,"navasan_invalid_or_stale_quote");
    const toman=unit==="IRR"?value/10:value;
    const quote=`${item.label}: ${fa(toman)} تومان (${fa(toman*10)} ریال)`;
    return{used:true,ok:true,provider:"navasan",fetchedAt:stamp(),quote,sources:[{title:"نوسان",url:"https://www.navasan.tech/",content:quote,publishedAt:new Date(row.timestamp*1000).toISOString()}]};
  }catch{return marketFallback(kind,"navasan_network_or_timeout")}
}
