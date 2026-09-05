import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {verifyFamilySession} from "@/lib/familySession";
import {isAdmin} from "@/lib/bale";
import {RELATION_TYPES,isTreeOnlyMember,planSiblingLinks,treeOnlyMemberInsert,validateRelation,type TreeRel} from "@/lib/familyTree";

const AVATAR_BUCKET="familybot-avatars";
function db(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Family Core database is not configured");return createClient(url,key,{db:{schema:"familybot"},auth:{persistSession:false,autoRefreshToken:false}})}
function sessionFrom(req:NextRequest){const a=req.headers.get("authorization")||"";return a.startsWith("Bearer ")?verifyFamilySession(a.slice(7)):null}
async function memberBelongs(familyId:string,id:string){const r=await db().from("members").select("id").eq("id",id).eq("family_id",familyId).maybeSingle();if(r.error)throw r.error;return Boolean(r.data)}
async function isFounder(familyId:string,userId:number){const r=await db().from("members").select("is_founder,role").eq("family_id",familyId).eq("bale_user_id",userId).maybeSingle();if(r.error)throw r.error;return Boolean(r.data?.is_founder||r.data?.role==="founder")}
async function canManage(familyId:string,chatId:number,userId:number){if(await isFounder(familyId,userId))return true;return isAdmin(chatId,userId).catch(()=>false)}
async function signedAvatar(supabase:ReturnType<typeof db>,value:string|null){if(!value)return null;if(!value.startsWith("storage:"))return value;const path=value.slice(8);const signed=await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(path,60*30);return signed.error?null:signed.data.signedUrl}

export async function GET(req:NextRequest){
  try{
    const s=sessionFrom(req);if(!s)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
    const supabase=db();
    const memberId=req.nextUrl.searchParams.get("memberId");
    const [members,rels]=await Promise.all([
      supabase.from("members").select("id,bale_user_id,display_name,first_name,last_name,relation_label,avatar_url,birthday,death_date,gender,bio,level").eq("family_id",s.familyId).order("created_at"),
      supabase.from("relationships").select("id,from_member_id,to_member_id,relation_type").eq("family_id",s.familyId)
    ]);
    const memberRows=members.error
      ? await supabase.from("members").select("id,bale_user_id,display_name,first_name,last_name,relation_label,avatar_url,birthday,level").eq("family_id",s.familyId).order("created_at")
      : members;
    if(memberRows.error)throw memberRows.error;if(rels.error)throw rels.error;
    const safeMembers=await Promise.all((memberRows.data||[]).map(async m=>({...m,avatar_url:await signedAvatar(supabase,m.avatar_url)})));
    const manageable=await canManage(s.familyId,s.chatId,s.userId);
    let links:Record<string,unknown>|undefined;
    if(memberId&&safeMembers.some(m=>m.id===memberId)){
      const [profile,legend,memorial]=await Promise.all([
        supabase.from("family_people_profiles").select("id").eq("family_id",s.familyId).eq("member_id",memberId).maybeSingle(),
        supabase.from("family_legends").select("id").eq("family_id",s.familyId).eq("member_id",memberId).limit(1).maybeSingle(),
        supabase.from("family_memorials").select("id").eq("family_id",s.familyId).eq("member_id",memberId).limit(1).maybeSingle(),
      ]);
      links={
        profileId:profile.data?.id||null,
        legendId:legend.data?.id||null,
        memorialId:memorial.data?.id||null,
      };
    }
    return NextResponse.json({ok:true,canManage:manageable,members:safeMembers,relationships:rels.data||[],links},{headers:{"cache-control":"no-store"}});
  }catch(error){console.error("tree read failed",error);return NextResponse.json({ok:false,error:"tree_unavailable"},{status:500})}
}

async function saveEdge(familyId:string,from:string,to:string,type:string){
  if(!(RELATION_TYPES as readonly string[]).includes(type))return "invalid_relation";
  if(!await memberBelongs(familyId,from)||!await memberBelongs(familyId,to))return "member_not_found";
  const existing=await db().from("relationships").select("id,from_member_id,to_member_id,relation_type").eq("family_id",familyId);
  if(existing.error)throw existing.error;
  const problem=validateRelation((existing.data||[]) as TreeRel[],from,to,type);
  if(problem)return problem;
  const row=await db().from("relationships").upsert({family_id:familyId,from_member_id:from,to_member_id:to,relation_type:type},{onConflict:"from_member_id,to_member_id,relation_type"});
  if(row.error)throw row.error;
  return null;
}

export async function POST(req:NextRequest){
  try{
    const s=sessionFrom(req);if(!s)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
    if(!await canManage(s.familyId,s.chatId,s.userId))return NextResponse.json({ok:false,error:"admin_required"},{status:403});
    const content=req.headers.get("content-type")||"",supabase=db();
    if(content.includes("multipart/form-data")){
      const form=await req.formData();const memberId=String(form.get("memberId")||"");const file=form.get("file");
      if(!memberId||!(file instanceof File))return NextResponse.json({ok:false,error:"invalid_upload"},{status:400});
      if(!await memberBelongs(s.familyId,memberId))return NextResponse.json({ok:false,error:"member_not_found"},{status:404});
      if(file.size>4*1024*1024)return NextResponse.json({ok:false,error:"file_too_large"},{status:413});
      if(!["image/jpeg","image/png","image/webp"].includes(file.type))return NextResponse.json({ok:false,error:"image_required"},{status:400});
      const check=await supabase.storage.getBucket(AVATAR_BUCKET);
      if(check.error){const created=await supabase.storage.createBucket(AVATAR_BUCKET,{public:false,fileSizeLimit:4194304,allowedMimeTypes:["image/jpeg","image/png","image/webp"]});if(created.error)throw created.error}
      else if(check.data.public){const updated=await supabase.storage.updateBucket(AVATAR_BUCKET,{public:false,fileSizeLimit:4194304,allowedMimeTypes:["image/jpeg","image/png","image/webp"]});if(updated.error)throw updated.error}
      const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";const path=`${s.familyId}/${memberId}-${Date.now()}.${ext}`;
      const up=await supabase.storage.from(AVATAR_BUCKET).upload(path,new Uint8Array(await file.arrayBuffer()),{contentType:file.type,upsert:false});if(up.error)throw up.error;
      const saved=await supabase.from("members").update({avatar_url:`storage:${path}`}).eq("id",memberId).eq("family_id",s.familyId);if(saved.error)throw saved.error;
      const signed=await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(path,60*30);if(signed.error)throw signed.error;
      return NextResponse.json({ok:true,avatarUrl:signed.data.signedUrl});
    }
    const body=await req.json() as Record<string,unknown>;
    const action=String(body.action||"");
    if(action==="member.create"){
      const firstName=String(body.firstName||"").trim().slice(0,60);
      const lastName=String(body.lastName||"").trim().slice(0,60);
      const displayName=String(body.displayName||"").trim().slice(0,100)||[firstName,lastName].filter(Boolean).join(" ");
      const relationLabel=String(body.relationLabel||"").trim().slice(0,80)||null;
      const birthday=body.birthday?String(body.birthday).slice(0,10):null;
      const deathDate=body.deathDate?String(body.deathDate).slice(0,10):null;
      const gender=["male","female"].includes(String(body.gender||""))?String(body.gender):null;
      if(!firstName&&!displayName)return NextResponse.json({ok:false,error:"name_required"},{status:400});
      const payload=treeOnlyMemberInsert({
        family_id:s.familyId,
        first_name:firstName||displayName,
        last_name:lastName||null,
        display_name:displayName||firstName,
        relation_label:relationLabel,
        birthday,
        death_date:deathDate,
        gender,
      });
      const ins=await supabase.from("members").insert(payload).select("id").single();
      if(ins.error){
        const raw=String(ins.error.message||"");
        const code=String((ins.error as {code?:string}).code||"");
        if(code==="23502"||/bale_user_id/i.test(raw))return NextResponse.json({ok:false,error:"tree_offline_members_required"},{status:409});
        if(/death_date|gender/i.test(raw)){
          const fallback=treeOnlyMemberInsert({family_id:s.familyId,first_name:firstName||displayName,last_name:lastName||null,display_name:displayName||firstName,relation_label:relationLabel,birthday});
          const retry=await supabase.from("members").insert(fallback).select("id").single();
          if(retry.error)return NextResponse.json({ok:false,error:retry.error.message||"member_create_failed"},{status:400});
          return NextResponse.json({ok:true,memberId:retry.data.id});
        }
        return NextResponse.json({ok:false,error:raw||"member_create_failed"},{status:400});
      }
      return NextResponse.json({ok:true,memberId:ins.data.id});
    }
    if(action==="member.update"){
      const id=String(body.memberId||"");if(!await memberBelongs(s.familyId,id))return NextResponse.json({ok:false,error:"member_not_found"},{status:404});
      const patch:Record<string,unknown>={
        display_name:String(body.displayName||"").trim().slice(0,100)||null,
        relation_label:String(body.relationLabel||"").trim().slice(0,80)||null,
      };
      if(body.firstName!==undefined)patch.first_name=String(body.firstName||"").trim().slice(0,60)||null;
      if(body.lastName!==undefined)patch.last_name=String(body.lastName||"").trim().slice(0,60)||null;
      if(body.birthday!==undefined)patch.birthday=body.birthday?String(body.birthday).slice(0,10):null;
      if(body.deathDate!==undefined)patch.death_date=body.deathDate?String(body.deathDate).slice(0,10):null;
      if(body.gender!==undefined)patch.gender=["male","female"].includes(String(body.gender||""))?String(body.gender):null;
      const upd=await supabase.from("members").update(patch).eq("id",id).eq("family_id",s.familyId);
      if(upd.error&&/death_date|gender/i.test(String(upd.error.message||""))){
        delete patch.death_date;delete patch.gender;
        const retry=await supabase.from("members").update(patch).eq("id",id).eq("family_id",s.familyId);if(retry.error)throw retry.error;
        return NextResponse.json({ok:true});
      }
      if(upd.error)throw upd.error;return NextResponse.json({ok:true});
    }
    if(action==="member.photo.remove"){
      const id=String(body.memberId||"");if(!await memberBelongs(s.familyId,id))return NextResponse.json({ok:false,error:"member_not_found"},{status:404});
      const current=await supabase.from("members").select("avatar_url").eq("id",id).eq("family_id",s.familyId).maybeSingle();
      if(current.error)throw current.error;
      const value=String(current.data?.avatar_url||"");
      if(value.startsWith("storage:"))await supabase.storage.from(AVATAR_BUCKET).remove([value.slice(8)]).catch(()=>undefined);
      const upd=await supabase.from("members").update({avatar_url:null}).eq("id",id).eq("family_id",s.familyId);if(upd.error)throw upd.error;
      return NextResponse.json({ok:true});
    }
    if(action==="member.delete"){
      const id=String(body.memberId||"");
      const row=await supabase.from("members").select("id,bale_user_id").eq("id",id).eq("family_id",s.familyId).maybeSingle();
      if(row.error)throw row.error;if(!row.data)return NextResponse.json({ok:false,error:"member_not_found"},{status:404});
      if(!isTreeOnlyMember(row.data))return NextResponse.json({ok:false,error:"linked_member"},{status:409});
      const deps=await Promise.all([
        supabase.from("family_people_profiles").select("id",{count:"exact",head:true}).eq("family_id",s.familyId).eq("member_id",id),
        supabase.from("family_legends").select("id",{count:"exact",head:true}).eq("family_id",s.familyId).eq("member_id",id),
        supabase.from("family_memorials").select("id",{count:"exact",head:true}).eq("family_id",s.familyId).eq("member_id",id),
        supabase.from("family_legacy_article_members").select("article_id",{count:"exact",head:true}).eq("member_id",id),
        supabase.from("family_legacy_media_tags").select("media_id",{count:"exact",head:true}).eq("member_id",id),
        supabase.from("family_journal_posts").select("id",{count:"exact",head:true}).eq("family_id",s.familyId).eq("author_member_id",id),
        supabase.from("memories").select("id",{count:"exact",head:true}).eq("family_id",s.familyId).eq("creator_member_id",id),
      ]);
      if(deps.some(d=>!d.error&&Number(d.count||0)>0))return NextResponse.json({ok:false,error:"member_has_legacy"},{status:409});
      await supabase.from("relationships").delete().eq("family_id",s.familyId).or(`from_member_id.eq.${id},to_member_id.eq.${id}`);
      const del=await supabase.from("members").delete().eq("id",id).eq("family_id",s.familyId);if(del.error)throw del.error;
      return NextResponse.json({ok:true});
    }
    if(action==="relation.save"){
      const from=String(body.fromMemberId||""),to=String(body.toMemberId||""),type=String(body.relationType||"").trim();
      const problem=await saveEdge(s.familyId,from,to,type);
      if(problem)return NextResponse.json({ok:false,error:problem},{status:400});
      return NextResponse.json({ok:true});
    }
    if(action==="relation.sibling"){
      const person=String(body.fromMemberId||""),sibling=String(body.toMemberId||"");
      const existing=await supabase.from("relationships").select("id,from_member_id,to_member_id,relation_type").eq("family_id",s.familyId);
      if(existing.error)throw existing.error;
      const plan=planSiblingLinks((existing.data||[]) as TreeRel[],person,sibling);
      if(plan.error)return NextResponse.json({ok:false,error:plan.error},{status:400});
      for(const edge of plan.edges){
        const problem=await saveEdge(s.familyId,edge.from,edge.to,edge.type);
        if(problem)return NextResponse.json({ok:false,error:problem},{status:400});
      }
      return NextResponse.json({ok:true});
    }
    if(action==="relation.delete"){
      const id=String(body.relationId||"");if(!id)return NextResponse.json({ok:false,error:"relation_required"},{status:400});
      const row=await supabase.from("relationships").delete().eq("id",id).eq("family_id",s.familyId).select("id").maybeSingle();if(row.error)throw row.error;if(!row.data)return NextResponse.json({ok:false,error:"relation_not_found"},{status:404});return NextResponse.json({ok:true});
    }
    return NextResponse.json({ok:false,error:"unknown_action"},{status:400});
  }catch(error){console.error("tree action failed",error);return NextResponse.json({ok:false,error:"tree_action_failed"},{status:500})}
}
