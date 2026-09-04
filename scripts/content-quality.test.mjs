import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const load=p=>readFileSync(new URL(`../${p}`,import.meta.url),"utf8");
const jokes=[...load("lib/curatedJokes.ts").matchAll(/\{id:"(j\d+)",text:"([^"]+)"\}/g)].map(m=>({id:m[1],text:m[2]}));
const unsafe=/سکس|جنسی|پورن|تجاوز|قومیت|مذهب|سیاست|https?:\/\/|www\.|تعریف طنز|در این جوک|این لطیفه نشان می‌دهد|دانشنامه|ویکی‌پدیا/i;
const actual=row=>row.text.length>=20&&row.text.length<=420&&/[\u0600-\u06ff]/.test(row.text)&&/[؟?!]|گفت|پرسید|جواب داد/.test(row.text)&&!unsafe.test(row.text);
assert.equal(jokes.length,100,"curated joke pool must contain 100 distinct reviewed items");
assert.equal(new Set(jokes.map(x=>x.text.replace(/\s+/g," ").trim())).size,100,"jokes must be text-distinct");
const sample=jokes.slice(0,30),accepted=sample.filter(actual);
assert.equal(accepted.length,30,"30/30 joke sample must be recognizable, safe Persian jokes");

const bank=load("lib/funBank.ts");
const riddleBlock=bank.match(/riddle:\[([\s\S]*?)\],\n motivation:/)?.[1]||"";
const riddles=[...riddleBlock.matchAll(/\{id:"(r\d+)",text:"([^"]+)",extra:"([^"]+)",options:\[([^\]]+)\]\}/g)].map(m=>({id:m[1],question:m[2],answer:m[3],options:[...m[4].matchAll(/"([^"]+)"/g)].map(x=>x[1])}));
assert.equal(riddles.length,20);
for(const row of riddles){assert.ok(row.question.length>=8&&row.question.includes("؟"),`${row.id}: invalid question`);assert.equal(row.options.length,4,`${row.id}: malformed options`);assert.equal(new Set(row.options).size,4,`${row.id}: duplicate option`);assert.ok(row.options.includes(row.answer),`${row.id}: answer not grounded in choices`)}

const dez=load("lib/dezfuliCulture.ts");
const words=(dez.match(/DEZFULI_WORDS[\s\S]*?=\[([\s\S]*?)\]\s+as const;/)?.[1].match(/\{id:/g)||[]).length;
const proverbs=(dez.match(/DEZFULI_PROVERBS=\[([\s\S]*?)\]\s+as const;/)?.[1].match(/\{id:/g)||[]).length;
const poems=(dez.match(/DEZFULI_POEMS=\[([\s\S]*?)\]\s+as const;/)?.[1].match(/\{id:/g)||[]).length;
console.log(JSON.stringify({jokes:{total:jokes.length,sample:30,accepted:accepted.length,duplicates:0},riddles:{total:riddles.length,validQuestions:riddles.length,validAnswers:riddles.length,malformedOptions:0,duplicates:0},dezfuli:{verifiedImport:{word:words,proverb:proverbs,poem:poems}}},null,2));
