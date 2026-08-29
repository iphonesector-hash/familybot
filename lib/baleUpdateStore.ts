import { createClient } from "@supabase/supabase-js";

function db(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return null;
  return createClient(url,key,{db:{schema:"familybot"},auth:{persistSession:false,autoRefreshToken:false}});
}

export async function claimBaleUpdate(updateId:number,kind:string,chatId?:number){
  const supabase=db();
  if(!supabase||!Number.isSafeInteger(updateId))return{tracked:false,duplicate:false};
  const {error}=await supabase.from("bale_updates").insert({update_id:updateId,payload_kind:kind,chat_id:chatId??null,status:"processing"});
  if(!error)return{tracked:true,duplicate:false};
  if(error.code==="23505")return{tracked:true,duplicate:true};
  throw error;
}

export async function completeBaleUpdate(updateId:number){
  const supabase=db();if(!supabase||!Number.isSafeInteger(updateId))return;
  const {error}=await supabase.from("bale_updates").update({status:"processed",processed_at:new Date().toISOString(),last_error:null}).eq("update_id",updateId);
  if(error)throw error;
}

export async function releaseBaleUpdate(updateId:number,error:unknown){
  const supabase=db();if(!supabase||!Number.isSafeInteger(updateId))return;
  const message=error instanceof Error?error.message:String(error||"processing_failed");
  const {error:dbError}=await supabase.from("bale_updates").update({status:"failed",last_error:message.slice(0,1000)}).eq("update_id",updateId);
  if(dbError)console.error("failed to release Bale update",dbError);
}
