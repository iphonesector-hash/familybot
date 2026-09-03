import {createClient} from "@supabase/supabase-js";
import {HOUSE_MATERIALS, houseNextCost} from "@/lib/houseProgression";

function db(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key) throw new Error("Family Core database is not configured");
  return createClient(url,key,{db:{schema:"familybot"},auth:{persistSession:false,autoRefreshToken:false}});
}

async function memberRow(familyId:string,userId:number){
  const r=await db().from("members").select("id,is_founder,role,coins").eq("family_id",familyId).eq("bale_user_id",userId).single();
  if(r.error) throw r.error;
  return r.data;
}

export async function readHouseProgress(familyId:string,userId:number){
  const s=db(), m=await memberRow(familyId,userId);
  const [family, mats, owned]=await Promise.all([
    s.from("families").select("id,name,house_level,xp").eq("id",familyId).single(),
    s.from("family_materials").select("material,quantity").eq("family_id",familyId).eq("member_id",m.id),
    s.from("member_items").select("item_id,item_kind").eq("family_id",familyId).eq("member_id",m.id),
  ]);
  if(family.error) throw family.error;
  const materials:Record<string,number>={};
  for(const row of mats.data||[]) materials[row.material]=Number(row.quantity||0);
  const houseLevel=Math.max(1,Math.min(10,Number(family.data?.house_level||1)));
  return {
    houseLevel,
    familyName:family.data?.name||"خانواده",
    coins:Number(m.coins||0),
    founder:Boolean(m.is_founder||m.role==="founder"),
    materials,
    ownedItems:(owned.data||[]).map(x=>x.item_id),
    nextCost:houseNextCost(houseLevel),
  };
}

export async function buyHouseMaterial(familyId:string,userId:number,materialId:string){
  const pack=HOUSE_MATERIALS.find(x=>x.id===materialId);
  if(!pack) throw new Error("unknown_material");
  const m=await memberRow(familyId,userId);
  const r=await db().rpc("house_buy_material_atomic",{
    p_family_id:familyId,
    p_member_id:m.id,
    p_material:pack.id,
    p_qty:pack.pack,
    p_price:pack.price,
  });
  if(r.error) throw r.error;
  return r.data;
}

export async function collectDailyHouseMats(familyId:string,userId:number){
  const m=await memberRow(familyId,userId);
  const r=await db().rpc("house_collect_daily_atomic",{p_family_id:familyId,p_member_id:m.id});
  if(r.error) throw r.error;
  return r.data;
}

export async function upgradeFamilyHouse(familyId:string,userId:number,fromLevel:number){
  const m=await memberRow(familyId,userId);
  const r=await db().rpc("house_upgrade_atomic",{
    p_family_id:familyId,
    p_member_id:m.id,
    p_from_level:fromLevel,
  });
  if(r.error) throw r.error;
  return r.data;
}
