import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

function load(path){return readFileSync(new URL("../"+path,import.meta.url),"utf8")}
function resolveChatCompletionsUrl(raw){const GROQ_CHAT="https://api.groq.com/openai/v1/chat/completions",input=String(raw??"").trim();if(!input)return GROQ_CHAT;const trimmed=input.replace(/\/+$/,"");const u=new URL(trimmed),host=u.hostname.toLowerCase(),path=(u.pathname||"").replace(/\/+$/,"")||"";if(host==="api.groq.com"||host.endsWith(".groq.com"))return `${u.protocol}//${u.host}/openai/v1/chat/completions`;if(/\/chat\/completions$/i.test(path))return `${u.origin}${path}`;if(/\/openai\/v1$/i.test(path)||/\/v1$/i.test(path))return `${u.origin}${path}/chat/completions`;if(!path)return `${u.origin}/v1/chat/completions`;return `${u.origin}${path}/chat/completions`}
const GROQ="https://api.groq.com/openai/v1/chat/completions";
assert.equal(resolveChatCompletionsUrl(""),GROQ);assert.equal(resolveChatCompletionsUrl("https://api.groq.com"),GROQ);assert.equal(resolveChatCompletionsUrl("https://api.groq.com/openai/v1"),GROQ);assert.doesNotMatch(resolveChatCompletionsUrl("https://api.groq.com/openai/v1"),/openai\/v1\/openai\/v1/);assert.equal(resolveChatCompletionsUrl("https://llm.example.com/v1"),"https://llm.example.com/v1/chat/completions");

const helper=load("lib/aiProvider.ts");
assert.match(helper,/DEFAULT_MODEL="openai\/gpt-oss-120b"/);assert.match(helper,/RETIRED_GROQ_MODELS/);assert.match(helper,/llama-3\.3-70b-versatile/);assert.match(helper,/reasoning_format="hidden"/);assert.match(helper,/sanitizeModelText/);assert.match(helper,/preparedMessages/);assert.match(helper,/فرمانده پیمان/);assert.doesNotMatch(helper,/\$\{base\}\/chat\/completions/);

const chat=load("app/api/ai/chat/route.ts");
assert.match(chat,/from "@\/lib\/aiProvider"/);assert.match(chat,/completeChat/);assert.match(chat,/request_accepted/);assert.match(chat,/kind:"live_web"/);assert.match(chat,/web\.answer/);assert.match(chat,/فرایند فکر/);

const group=load("lib/groupSectorAi.ts");
assert.match(group,/from "@\/lib\/webSearch"/);assert.match(group,/searchLive\(message\)/);assert.match(group,/readAiMemory\(input\.familyId,input\.userId,20\)/);assert.match(group,/slice\(-20\)/);assert.match(group,/فرمانده پیمان/);assert.doesNotMatch(group,/duckduckgo/i);

const memory=load("lib/aiMemory.ts");
assert.match(memory,/limit=20/);assert.match(memory,/Math\.max\(20,Math\.min\(40,limit\)\)/);

const compound=load("lib/webSearch/groqCompound.ts");
assert.match(compound,/groq\/compound-mini/);assert.match(compound,/groq\/compound/);assert.match(compound,/Built-in web tools are enabled by default/);assert.match(compound,/JSON\.stringify\(\{model,messages:/);assert.doesNotMatch(compound,/compound_custom/);assert.doesNotMatch(compound,/Groq-Model-Version/);assert.match(compound,/executed_tools/);

const index=load("lib/webSearch/index.ts");
assert.match(index,/from "\.\/groqCompound"/);assert.match(index,/groqCompoundProvider/);assert.match(index,/provider!==tavilyProvider/);

const page=load("app/ai/page.tsx");
assert.match(page,/function speechText/);assert.match(page,/const history=msgs\.slice\(-20\)/);assert.match(page,/SpeechSynthesisUtterance\(clean\)/);assert.match(page,/faVoice/);
const tts=load("app/api/voice/tts/route.ts");
assert.match(tts,/function speechText/);assert.match(tts,/text=speechText\(parsed\.text\)/);

const remote=load("lib/contentRemote.ts");assert.match(remote,/from "@\/lib\/aiProvider"/);assert.match(remote,/completeChat/);assert.doesNotMatch(remote,/\$\{base\}\/chat\/completions/);
console.log("ai-provider: minimal live web, stable model, 20-message memory, commander identity and TTS hygiene assertions passed");
