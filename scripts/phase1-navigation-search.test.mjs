import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url),root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function loader(overrides={},globals={}){
  const cache=new Map();
  function load(file){
    const abs=path.resolve(root,file);if(cache.has(abs))return cache.get(abs).exports;
    const module={exports:{}};cache.set(abs,module);
    const code=ts.transpileModule(fs.readFileSync(abs,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
    const localRequire=id=>{
      if(Object.hasOwn(overrides,id))return overrides[id];
      if(id.startsWith('.')||id.startsWith('@/')){
        const base=id.startsWith('@/')?path.join(root,id.slice(2)):path.resolve(path.dirname(abs),id);
        const resolved=[base,base+'.ts',base+'.tsx',path.join(base,'index.ts')].find(p=>fs.existsSync(p)&&fs.statSync(p).isFile());
        if(resolved)return load(resolved);
      }
      return require(id);
    };
    vm.runInNewContext(code,{module,exports:module.exports,require:localRequire,process,console,URL,Date,Intl,AbortSignal,fetch:(...a)=>fetch(...a),setTimeout,clearTimeout,...globals},{filename:abs});
    return module.exports;
  }
  return load;
}
const load=loader(),{classifyLiveQuery}=load('lib/webSearch/classifier.ts'),{searchLive}=load('lib/webSearch/index.ts');
const {LIVE_SEARCH_WARNING,marketQuote,tavilyProvider}=load('lib/webSearch/provider.ts');
for(const [q,kind] of Object.entries({'قیمت امروز دلار رو بگو':'currency','قیمت طلا':'gold','بیت کوین':'crypto','بیت‌کوین':'crypto','هوا امروز':'weather','خبر امروز':'news','آخرین اخبار':'news','قیمت آیفون امروز':'search','نتیجه بازی':'search','آخرین خبر تکنولوژی':'news','سلام':'none','امروز چندتا سکه دارم':'none','کارهای امروز خانواده':'none','دلار چنده':'currency','بیت کوین چیست؟':'none'}))assert.equal(classifyLiveQuery(q),kind,q);
const originalFetch=globalThis.fetch;
const oldEnv={...process.env};
let networkCalls=0;
try{
  delete process.env.TAVILY_API_KEY;delete process.env.NAVASAN_API_KEY;delete process.env.NAVASAN_PRICE_UNIT;
  globalThis.fetch=async url=>{
    networkCalls++;
    if(String(url).startsWith('https://call3.tgju.org/ajax.json'))return Response.json({current:{price_dollar_rl:{p:'1234560'},geram18:{p:'98765430'}}});
    throw Error('unexpected network');
  };
  assert.equal((await searchLive('سلام')).used,false);
  const fallbackUsd=await searchLive('قیمت امروز دلار');assert.equal(fallbackUsd.ok,true);assert.equal(fallbackUsd.provider,'tgju');assert.match(fallbackUsd.quote,/تومان/);assert.doesNotMatch(fallbackUsd.quote,new RegExp(LIVE_SEARCH_WARNING));
  const fallbackGold=await searchLive('قیمت طلا');assert.equal(fallbackGold.ok,true);assert.equal(fallbackGold.provider,'tgju');assert.match(fallbackGold.quote,/طلای ۱۸ عیار/);
  assert.equal((await searchLive('آخرین خبر مهم تکنولوژی')).missingEnv[0],'TAVILY_API_KEY');
  assert.equal(networkCalls,2);
  assert.equal((await searchLive('خبر امروز',{search:async()=>{throw Error('offline')}})).ok,false);
  process.env.TAVILY_API_KEY='test-only';
  globalThis.fetch=async(url,options)=>{
    const body=JSON.parse(options.body);assert.equal(body.topic,'news');assert.equal(body.time_range,'d');assert.equal(options.cache,'no-store');assert.ok(options.signal);
    return Response.json({results:[{title:'fresh',url:'https://example.com/new',content:'New evidence',published_date:new Date().toISOString()},{title:'old',url:'https://example.com/old',content:'Old evidence',published_date:'2020-01-01'},{title:'unsafe',url:'javascript:alert(1)',content:'x'}]});
  };
  const news=await tavilyProvider.search('آخرین خبر تکنولوژی','news');assert.equal(news.ok,true);assert.equal(news.sources.length,1);assert.ok(news.fetchedAt);
  globalThis.fetch=async()=>new Response('blocked',{status:429});assert.equal((await tavilyProvider.search('خبر','news')).ok,false);
  globalThis.fetch=async()=>Response.json({results:[]});assert.equal((await tavilyProvider.search('خبر','news')).ok,false);
  globalThis.fetch=async()=>new Response('not json');assert.equal((await tavilyProvider.search('خبر','news')).ok,false);
  process.env.NAVASAN_API_KEY='test-only';process.env.NAVASAN_PRICE_UNIT='IRT';
  globalThis.fetch=async url=>{assert.equal(new URL(url).searchParams.get('item'),'usd_sell');return Response.json({usd_sell:{value:'123456',timestamp:Math.floor(Date.now()/1000)}})};
  const usd=await marketQuote('قیمت امروز دلار','currency');assert.equal(usd.ok,true);assert.match(usd.quote,/تومان/);assert.match(usd.quote,/ریال/);assert.equal(usd.sources[0].url,'https://www.navasan.tech/');
  process.env.NAVASAN_PRICE_UNIT='IRR';const irr=await marketQuote('قیمت امروز دلار','currency');assert.notEqual(irr.quote,usd.quote);
  globalThis.fetch=async url=>String(url).startsWith('https://api.navasan.tech/')?Response.json({usd_sell:{value:'123456',timestamp:1}}):Response.json({current:{price_dollar_rl:{p:'1234560'}}});
  const staleFallback=await marketQuote('قیمت دلار','currency');assert.equal(staleFallback.ok,true);assert.equal(staleFallback.provider,'tgju');
  globalThis.fetch=async()=>Response.json({'18ayar':{value:'12345',timestamp:Math.floor(Date.now()/1000)}});assert.equal((await marketQuote('قیمت طلا','gold')).ok,true);
  globalThis.fetch=async()=>Response.json({bitcoin:{usd:123,last_updated_at:Math.floor(Date.now()/1000)}});assert.equal((await marketQuote('بیت کوین','crypto')).ok,true);
  globalThis.fetch=async()=>Response.json({bitcoin:{usd:123,last_updated_at:1}});assert.equal((await marketQuote('بیت کوین','crypto')).ok,false);

  // Execute the real route with dependencies mocked, not a copy of its implementation.
  let llmCalls=0;
  const mockModules={
    '@/lib/familySession':{verifyFamilySession:()=>({familyId:'test-family',userId:1})},
    '@/lib/miniAppData':{readMiniAppDashboard:async()=>null},
    '@/lib/familyMutations':{},'@/lib/familyFeatures':{},
    '@/lib/memberLookup':{normalizeFaNumber:s=>s},
    '@/lib/aiMemory':{readAiMemory:async()=>[],rememberAiTurn:async()=>{}},
    '@/lib/aiProvider':{aiProviderMeta:()=>({}),completeChat:async()=>{llmCalls++;return{ok:true,text:'سلام'}}},
  };
  const route=loader(mockModules)('app/api/ai/chat/route.ts');
  const request=q=>new Request('http://localhost/api/ai/chat',{method:'POST',headers:{authorization:'Bearer test','content-type':'application/json'},body:JSON.stringify({message:q,history:[]})});
  delete process.env.TAVILY_API_KEY;
  const fail=await(await route.POST(request('آخرین خبر تکنولوژی'))).json();assert.equal(fail.reply,LIVE_SEARCH_WARNING);assert.equal(fail.reply.split(LIVE_SEARCH_WARNING).length-1,1);assert.equal(llmCalls,0);
  process.env.GROQ_API_KEY='test-only';assert.equal((await(await route.POST(request('سلام'))).json()).reply,'سلام');assert.equal(llmCalls,1);

  delete process.env.NAVASAN_API_KEY;delete process.env.NAVASAN_PRICE_UNIT;
  globalThis.fetch=async url=>{if(String(url).startsWith('https://call3.tgju.org/ajax.json'))return Response.json({current:{price_dollar_rl:{p:'2233000'}}});throw Error('unexpected network')};
  const marketReply=await(await route.POST(request('دلار چنده'))).json();assert.equal(marketReply.searched,true);assert.equal(marketReply.grounded,true);assert.match(marketReply.reply,/تومان/);assert.notEqual(marketReply.reply,LIVE_SEARCH_WARNING);assert.equal(llmCalls,1);

  process.env.TAVILY_API_KEY='test-only';
  globalThis.fetch=async()=>Response.json({results:[{title:'Fixture source',url:'https://example.com/current',content:'TEST CURRENT NEWS EVIDENCE',published_date:new Date().toISOString()}]});
  let groundedPrompt='';
  const newsRoute=loader({...mockModules,'@/lib/aiProvider':{aiProviderMeta:()=>({}),completeChat:async({messages})=>{groundedPrompt=messages[0].content;return{ok:true,text:'خلاصه خبر آزمایشی'}}}})('app/api/ai/chat/route.ts');
  const grounded=await(await newsRoute.POST(request('آخرین خبر تکنولوژی'))).json();assert.equal(grounded.searched,true);assert.equal(grounded.sources[0].url,'https://example.com/current');assert.ok(grounded.fetchedAt);assert.match(groundedPrompt,/TEST CURRENT NEWS EVIDENCE/);
  globalThis.fetch=async()=>{throw Error('timeout')};
  assert.equal((await(await newsRoute.POST(request('آخرین خبر تکنولوژی'))).json()).reply,LIVE_SEARCH_WARNING);

}finally{globalThis.fetch=originalFetch;for(const name of ['TAVILY_API_KEY','NAVASAN_API_KEY','NAVASAN_PRICE_UNIT','GROQ_API_KEY']){if(oldEnv[name]===undefined)delete process.env[name];else process.env[name]=oldEnv[name]}}

// Render and execute the real bootstrap with an isolated hook/storage/network harness.
async function bootstrapCase({token=null,status=200,response={ok:true,status:'ready',session:'new-session'},pending=false,supported=true,initData='signed-test-data'}={}){
  let states=[],cursor=0,refs=[],refCursor=0,effects=[],reloads=0,requests=[];
  const storage=new Map(token?[['familybot.session',token]]:[]),events=[];
  const react={...require('react'),useState:initial=>{const i=cursor++;if(!(i in states))states[i]=initial;return[states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v}]},useRef:initial=>{const i=refCursor++;return refs[i]??(refs[i]={current:initial})},useEffect:fn=>effects.push(fn)};
  const component=loader({'react':react,'@/lib/useBaleMiniApp':{useBaleMiniApp:()=>({inBale:true,webApp:{},initData,supported,startParam:''})}}, {window:{sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},location:{reload:()=>reloads++},dispatchEvent:e=>events.push(e.type)},Event,fetch:async(url)=>{requests.push(url);if(pending)return new Promise(()=>{});return url==='/api/family/dashboard'?new Response('{}',{status}):Response.json(response)}})('app/MiniAppBootstrap.tsx').default;
  const render=()=>{cursor=0;refCursor=0;effects=[];return component()};
  assert.equal(render(),null);const initialEffects=[...effects];initialEffects.forEach(f=>f());
  for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r));
  const tree=render();return{tree,reloads,requests,events};
}
assert.equal((await bootstrapCase({pending:true})).tree,null,'fresh ordinary network wait is silent');
assert.equal((await bootstrapCase()).reloads,1,'fresh session creation reloads once');
for(const launch of ['existing','reload','close/reopen']){const r=await bootstrapCase({token:'existing'});assert.equal(r.tree,null,launch);assert.equal(r.reloads,0);assert.ok(r.events.includes('familybot:boot-ready'))}
const expired=await bootstrapCase({token:'expired',status:401});assert.equal(expired.tree,null);assert.equal(expired.reloads,1);assert.equal(expired.requests.length,2);
assert.equal((await bootstrapCase({token:'existing',status:503})).tree,null);
assert.ok((await bootstrapCase({response:{ok:false,error:'invalid_init_data'}})).tree);
assert.ok((await bootstrapCase({supported:false,initData:''})).tree);
assert.ok((await bootstrapCase({response:{ok:true,status:'choose_family',families:[{id:'1',name:'test'}]}})).tree);
assert.doesNotMatch(read('app/MiniAppBootstrap.tsx'),/در حال ورود امن|هویت Mini App از خود/);
assert.doesNotMatch(read('app/AppSplash.tsx'),/4600/);

// Parse actual JSX links. Exclude legacy bottomNav, which current CSS hides.
function links(file){const out=new Set(),source=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);function walk(node){
  if(ts.isJsxElement(node)&&node.openingElement.attributes.properties.some(p=>ts.isJsxAttribute(p)&&p.name.text==='className'&&p.initializer&&ts.isStringLiteral(p.initializer)&&p.initializer.text==='bottomNav'))return;
  if(ts.isJsxAttribute(node)&&node.name.text==='href'&&node.initializer&&ts.isStringLiteral(node.initializer))out.add(node.initializer.text);
  if(ts.isPropertyAssignment(node)&&node.name.getText(source)==='href'&&ts.isStringLiteral(node.initializer))out.add(node.initializer.text);
  ts.forEachChild(node,walk);
}walk(source);return out}
const profile=read('app/section/leaderboard/page.tsx');assert.match(profile,/<a href="\/section\/achievements"[^>]*aria-label="دستاوردها"[^>]*><IconOrb name="trophy"/);
assert.ok(links('app/section/achievements/page.tsx').has('/section/leaderboard'));
assert.ok(links('app/HomeDashboard.tsx').has('/section/family'));
assert.match(read('app/section/[slug]/LiveSection.tsx'),/if\(slug==="family"\).*?<FamilyTools\/>/);
assert.ok(links('app/FamilyTools.tsx').has('/section/fund'));assert.match(read('app/FamilyTools.tsx'),/>صندوق خانوادگی</);
assert.ok(links('app/section/fund/page.tsx').has('/section/family'));
const routes=fs.readdirSync(path.join(root,'app/section')).filter(s=>s!=='[slug]'&&fs.existsSync(path.join(root,'app/section',s,'page.tsx')));
const graph=new Map([['/',new Set([...links('app/HomeDashboard.tsx'),...links('app/BottomNav.tsx')])]]);
for(const slug of routes)graph.set('/section/'+slug,links('app/section/'+slug+'/page.tsx'));
for(const dest of links('app/FamilyTools.tsx'))graph.get('/section/family').add(dest);
const reached=new Set(['/']);let changed=true;while(changed){changed=false;for(const from of [...reached])for(const to of graph.get(from)||[])if(!reached.has(to)){reached.add(to);changed=true}}
const aliases={culture:'fun',wallet:'finance'};
for(const slug of routes){if(aliases[slug]){assert.match(read(`app/section/${slug}/page.tsx`),new RegExp(`export \\{default\\} from "../${aliases[slug]}/page"`));continue}assert.ok(reached.has('/section/'+slug),`orphan route: ${slug}`)}
console.log(`phase1: classifier, resilient live market fallback, provider validation, real route handler, bootstrap lifecycle and ${routes.length} route checks passed (mocked data; NOT real Bale QA)`);
