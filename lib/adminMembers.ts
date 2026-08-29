import { createClient } from "@supabase/supabase-js";

function db(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Family Core database is not configured");return createClient(url,key,{db:{schema:"familybot"},auth:{persistSession:false,autoRefreshToken:false}})}

export async function readAdminMembers(familyId:string){
  const supabase=db();
  const [members,warnings]=await Promise.all([
    supabase.from("members").select("id,bale_user_id,display_name,first_name,last_name,relation_label,avatar_url").eq("family_id",familyId).order("display_name",{ascending:true}),
    supabase.from("warnings").select("target_bale_user_id,id").eq("family_id",familyId).is("cleared_at",null),
  ]);
  if(members.error)throw members.error;if(warnings.error)throw warnings.error;
  const counts=new Map<number,number>();for(const w of warnings.data||[]){const id=Number(w.target_bale_user_id);counts.set(id,(counts.get(id)||0)+1)}
  return (members.data||[]).map(m=>({...m,active_warnings:counts.get(Number(m.bale_user_id))||0}));
}
