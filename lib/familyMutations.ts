import { createClient } from "@supabase/supabase-js";

function db(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Family Core database is not configured");return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}

export async function updateOwnProfile(familyId:string,userId:number,input:{displayName?:string;relationLabel?:string;bio?:string;birthday?:string|null}){
  const patch={display_name:String(input.displayName||"").trim().slice(0,80)||null,relation_label:String(input.relationLabel||"").trim().slice(0,60)||null,bio:String(input.bio||"").trim().slice(0,500)||null,birthday:input.birthday?String(input.birthday):null};
  const {data,error}=await db().from("members").update(patch).eq("family_id",familyId).eq("bale_user_id",userId).select("id,display_name,relation_label,bio,birthday,xp,coins,level,streak").single();
  if(error)throw error;return data;
}

export async function createFamilyTask(familyId:string,userId:number,input:{title?:string;description?:string;dueAt?:string|null;rewardCoins?:number}){
  const supabase=db();const creator=await supabase.from("members").select("id").eq("family_id",familyId).eq("bale_user_id",userId).single();if(creator.error)throw creator.error;
  const title=String(input.title||"").trim().slice(0,160);if(!title)throw new Error("task_title_required");
  const reward=Math.max(0,Math.min(500,Number(input.rewardCoins)||0));
  const {data,error}=await supabase.from("tasks").insert({family_id:familyId,creator_member_id:creator.data.id,title,description:String(input.description||"").slice(0,1000)||null,due_at:input.dueAt||null,reward_coins:reward}).select("id,title,status,due_at,reward_coins").single();if(error)throw error;return data;
}

export async function completeFamilyTask(familyId:string,userId:number,taskId:string){
  const supabase=db();const member=await supabase.from("members").select("id,coins").eq("family_id",familyId).eq("bale_user_id",userId).single();if(member.error)throw member.error;
  const task=await supabase.from("tasks").select("id,status,reward_coins").eq("id",taskId).eq("family_id",familyId).single();if(task.error)throw task.error;if(task.data.status==="done")return task.data;
  const done=await supabase.from("tasks").update({status:"done",completed_at:new Date().toISOString(),assignee_member_id:member.data.id}).eq("id",taskId).eq("family_id",familyId).neq("status","done").select("id,status,reward_coins").single();if(done.error)throw done.error;
  const reward=Number(done.data.reward_coins||0);if(reward>0){await supabase.from("members").update({coins:Number(member.data.coins||0)+reward}).eq("id",member.data.id);await supabase.from("coin_ledger").insert({family_id:familyId,member_id:member.data.id,amount:reward,reason:"task_complete",reference_type:"task",reference_id:taskId})}return done.data;
}

export async function createMemory(familyId:string,userId:number,input:{title?:string;caption?:string;memoryDate?:string|null;mediaUrl?:string|null;tags?:string[]}){
  const supabase=db();const member=await supabase.from("members").select("id").eq("family_id",familyId).eq("bale_user_id",userId).single();if(member.error)throw member.error;
  const title=String(input.title||"").trim().slice(0,160);if(!title)throw new Error("memory_title_required");const tags=(input.tags||[]).map(x=>String(x).trim().slice(0,40)).filter(Boolean).slice(0,12);
  const {data,error}=await supabase.from("memories").insert({family_id:familyId,creator_member_id:member.data.id,title,caption:String(input.caption||"").slice(0,1200)||null,media_url:input.mediaUrl||null,memory_date:input.memoryDate||null,tags}).select("id,title,caption,media_url,memory_date,tags,created_at").single();if(error)throw error;return data;
}

export async function saveRelationship(familyId:string,userId:number,input:{toMemberId?:string;relationType?:string}){
  const supabase=db();const from=await supabase.from("members").select("id").eq("family_id",familyId).eq("bale_user_id",userId).single();if(from.error)throw from.error;const to=String(input.toMemberId||"");const relation=String(input.relationType||"").trim().slice(0,60);if(!to||!relation)throw new Error("relationship_required");
  const target=await supabase.from("members").select("id").eq("id",to).eq("family_id",familyId).single();if(target.error)throw target.error;
  const {data,error}=await supabase.from("relationships").upsert({family_id:familyId,from_member_id:from.data.id,to_member_id:target.data.id,relation_type:relation},{onConflict:"from_member_id,to_member_id,relation_type"}).select("id,from_member_id,to_member_id,relation_type").single();if(error)throw error;return data;
}

export const STORE_ITEMS=[
  {id:"purple_tree",name:"درخت بنفش",price:500,kind:"house",icon:"tree"},
  {id:"light_fountain",name:"فواره نور",price:800,kind:"house",icon:"spark"},
  {id:"heart_bench",name:"نیمکت قلبی",price:600,kind:"house",icon:"gift"},
  {id:"hero_frame",name:"فریم قهرمان",price:950,kind:"profile",icon:"trophy"},
] as const;

export async function purchaseStoreItem(familyId:string,userId:number,itemId:string){
  const item=STORE_ITEMS.find(x=>x.id===itemId);if(!item)throw new Error("unknown_item");const supabase=db();const member=await supabase.from("members").select("id,coins").eq("family_id",familyId).eq("bale_user_id",userId).single();if(member.error)throw member.error;
  const owned=await supabase.from("member_items").select("id").eq("member_id",member.data.id).eq("item_id",item.id).maybeSingle();if(owned.error)throw owned.error;if(owned.data)return {alreadyOwned:true,item,coins:Number(member.data.coins||0)};
  const coins=Number(member.data.coins||0);if(coins<item.price)throw new Error("insufficient_coins");
  const next=coins-item.price;const insert=await supabase.from("member_items").insert({family_id:familyId,member_id:member.data.id,item_id:item.id,item_name:item.name,item_kind:item.kind,price_paid:item.price}).select("id,item_id,item_name,item_kind,price_paid,created_at").single();if(insert.error)throw insert.error;await supabase.from("members").update({coins:next}).eq("id",member.data.id);await supabase.from("coin_ledger").insert({family_id:familyId,member_id:member.data.id,amount:-item.price,reason:"store_purchase",reference_type:"store_item",reference_id:item.id});return {alreadyOwned:false,item,coins:next,owned:insert.data};
}
