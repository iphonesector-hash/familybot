import { createClient } from "@supabase/supabase-js";

function db(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Family Core database is not configured");return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}
function normalize(v:string){return v.trim().toLocaleLowerCase("fa-IR").replace(/ي/g,"ی").replace(/ك/g,"ک").replace(/\s+/g," ")}

export async function findFamilyMemberByName(familyId:string,name:string){
  const q=normalize(name);if(!q)throw new Error("member_name_required");const {data,error}=await db().from("members").select("id,bale_user_id,display_name,first_name,last_name").eq("family_id",familyId).limit(100);if(error)throw error;const rows=data||[];
  const scored=rows.map(row=>{const display=normalize(String(row.display_name||""));const full=normalize([row.first_name,row.last_name].filter(Boolean).join(" "));const first=normalize(String(row.first_name||""));let score=0;if(display===q||full===q||first===q)score=100;else if(display.includes(q)||full.includes(q))score=70;else if(q.includes(display)&&display)score=50;return{row,score}}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
  if(!scored.length)throw new Error("member_not_found");if(scored.length>1&&scored[0].score===scored[1].score)throw new Error("member_name_ambiguous");return scored[0].row;
}

export function normalizeFaNumber(text:string){const fa="۰۱۲۳۴۵۶۷۸۹",ar="٠١٢٣٤٥٦٧٨٩";return text.replace(/[۰-۹]/g,d=>String(fa.indexOf(d))).replace(/[٠-٩]/g,d=>String(ar.indexOf(d)))}
