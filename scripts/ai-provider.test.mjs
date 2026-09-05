import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

function load(path){return readFileSync(new URL("../"+path,import.meta.url),"utf8")}

function resolveChatCompletionsUrl(raw){
  const GROQ_CHAT="https://api.groq.com/openai/v1/chat/completions";
  const input=String(raw??"").trim();
  if(!input)return GROQ_CHAT;
  const trimmed=input.replace(/\/+$/,"");
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
}

const GROQ="https://api.groq.com/openai/v1/chat/completions";
assert.equal(resolveChatCompletionsUrl(""),GROQ);
assert.equal(resolveChatCompletionsUrl("https://api.groq.com"),GROQ);
assert.equal(resolveChatCompletionsUrl("https://api.groq.com/"),GROQ);
assert.equal(resolveChatCompletionsUrl("https://api.groq.com/openai/v1"),GROQ);
assert.equal(resolveChatCompletionsUrl("https://api.groq.com/openai/v1/"),GROQ);
assert.equal(resolveChatCompletionsUrl("https://api.groq.com/openai/v1/chat/completions"),GROQ);
assert.equal(resolveChatCompletionsUrl("https://api.groq.com/chat/completions"),GROQ);
assert.doesNotMatch(resolveChatCompletionsUrl("https://api.groq.com/openai/v1"),/openai\/v1\/openai\/v1/);
assert.doesNotMatch(resolveChatCompletionsUrl("https://api.groq.com"),/^https:\/\/api\.groq\.com\/chat\/completions$/);
assert.equal(resolveChatCompletionsUrl("https://llm.example.com/v1"),"https://llm.example.com/v1/chat/completions");
assert.equal(resolveChatCompletionsUrl("https://llm.example.com/openai/v1/"),"https://llm.example.com/openai/v1/chat/completions");
assert.equal(resolveChatCompletionsUrl("https://llm.example.com/openai/v1/chat/completions"),"https://llm.example.com/openai/v1/chat/completions");

const helper=load("lib/aiProvider.ts");
assert.match(helper,/resolveChatCompletionsUrl/);
assert.match(helper,/completeChat/);
assert.match(helper,/DEFAULT_MODEL="openai\/gpt-oss-120b"/);
assert.match(helper,/reasoning_format="hidden"/);
assert.match(helper,/sanitizeModelText/);
assert.match(helper,/openai\/gpt-oss-120b/);
assert.match(helper,/openai\/gpt-oss-20b/);
assert.doesNotMatch(helper,/\$\{base\}\/chat\/completions/);

const chat=load("app/api/ai/chat/route.ts");
assert.match(chat,/from "@\/lib\/aiProvider"/);
assert.match(chat,/completeChat/);
assert.match(chat,/request_accepted/);
assert.match(chat,/kind:"live_web"/);
assert.match(chat,/web\.answer/);
assert.match(chat,/فرایند فکر/);
assert.doesNotMatch(chat,/\$\{base\}\/chat\/completions/);

const remote=load("lib/contentRemote.ts");
assert.match(remote,/from "@\/lib\/aiProvider"/);
assert.match(remote,/completeChat/);
assert.match(remote,/interpretHafez/);
assert.match(remote,/logTag:"\[ai\.content\]"/);
assert.match(remote,/logTag:"\[ai\.hafez\]"/);
assert.match(remote,/JOKE_SOURCE_ORDER/);
assert.match(remote,/RIDDLE_SOURCE_ORDER/);
assert.match(remote,/sourceMode:"verified-import"/);
assert.match(remote,/sourceMode:"cached-remote"/);
assert.doesNotMatch(remote,/\$\{base\}\/chat\/completions/);

const group=load("lib/groupSectorAi.ts");
assert.match(group,/from "@\/lib\/aiProvider"/);
assert.match(group,/from "@\/lib\/webSearch"/);
assert.match(group,/searchLive\(message\)/);
assert.match(group,/LIVE_SEARCH_WARNING/);
assert.match(group,/web\.answer\|\|web\.quote/);
assert.doesNotMatch(group,/duckduckgo/i);
assert.doesNotMatch(group,/\$\{base\}\/chat\/completions/);

const web=load("lib/webSearch/provider.ts");
assert.match(web,/groqCompoundProvider/);
assert.match(web,/groq\/compound/);
assert.match(web,/web_search/);
assert.match(web,/visit_website/);
assert.match(web,/GROQ_API_KEY/);
assert.match(web,/answer\?:string/);

const index=load("lib/webSearch/index.ts");
assert.match(index,/groqCompoundProvider/);
assert.match(index,/provider!==tavilyProvider/);

console.log("ai-provider: stable model, hidden reasoning, shared live web fallback assertions passed");
