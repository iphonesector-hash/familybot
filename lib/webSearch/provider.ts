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
  const missing=[!process.env.NAVASAN_API_KEY?"NAVASAN_API_KEY":"",!process.env.NAVASAN_PRICE_UNIT?"NAVASAN_PRICE_UNIT":""].filter(Boolean);
  if(missing.length)return failed("navasan","missing_configuration",missing);
  // The documented payload has no unit field: require an explicitly verified account unit.
  const unit=process.env.NAVASAN_PRICE_UNIT;
  if(unit!=="IRR"&&unit!=="IRT")return failed("navasan","invalid_price_unit",["NAVASAN_PRICE_UNIT"]);
  const items:Array<{id:string;label:string}>=[];
  if(kind==="currency"){
    if(/(کانادا|استرالیا|رسمی|دولتی|توافقی|هرات|فردایی)/.test(query))return failed("navasan","unsupported_market");
    items.push({id:/خرید/.test(query)?"usd_buy":"usd_sell",label:/خرید/.test(query)?"دلار آمریکا، خرید نقدی تهران":"دلار آمریکا، فروش نقدی تهران"});
  }else{
    if(/(اونس|۲۴|24|آبشده|آب شده|سکه)/.test(query))return failed("navasan","unsupported_gold_instrument");
    items.push({id:"18ayar",label:"هر گرم طلای ۱۸ عیار"});
  }
  try{
    const url=new URL("https://api.navasan.tech/latest/");url.searchParams.set("api_key",process.env.NAVASAN_API_KEY!);url.searchParams.set("item",items[0].id);
    const r=await fetch(url,{cache:"no-store",redirect:"error",signal:AbortSignal.timeout(8000)});
    if(!r.ok)return failed("navasan",`http_${r.status}`);
    const data=await r.json(),row=data[items[0].id],value=Number(row?.value);
    const tehranDay=(d:Date)=>d.toLocaleDateString("en-CA",{timeZone:"Asia/Tehran"});
    if(!Number.isFinite(value)||value<=0||!fresh(row?.timestamp,86400000)||tehranDay(new Date(row.timestamp*1000))!==tehranDay(new Date()))return failed("navasan","invalid_or_stale_quote");
    const toman=unit==="IRR"?value/10:value;
    const quote=`${items[0].label}: ${fa(toman)} تومان (${fa(toman*10)} ریال)`;
    return{used:true,ok:true,provider:"navasan",fetchedAt:stamp(),quote,sources:[{title:"نوسان",url:"https://www.navasan.tech/",content:quote,publishedAt:new Date(row.timestamp*1000).toISOString()}]};
  }catch{return failed("navasan","network_or_timeout")}
}
