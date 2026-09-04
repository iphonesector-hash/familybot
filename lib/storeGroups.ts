import {STORE_ITEMS, type StoreItem} from "./storeCatalog";

export type StoreGroup = {
  id: string;
  title: string;
  summary: string;
  match: (item: StoreItem) => boolean;
};

const CARE_IDS = new Set([
  "sagool_food","sagool_royal_food","sagool_water","sagool_hydration_station",
  "sagool_shampoo","sagool_smart_feeder","sagool_grooming_kit",
  "sagool_bed","sagool_bed_royal","sagool_sleep_pod","sagool_sleep_pack","sagool_house",
]);
const TOY_IDS = new Set([
  "sagool_bone","sagool_bone_pro","sagool_ball","sagool_robo_disc",
  "sagool_toy_pack","sagool_training_beacon","sagool_hoverboard",
]);
const FURNITURE_IDS = new Set([
  "galaxy_sofa","home_theater","family_cinema","cosmic_library","tea_table",
  "nebula_wardrobe","memory_bench","galaxy_grand_piano","royal_cosmic_throne",
  "nebula_fireplace","sagool_dog_house","toy_chest","pet_corner",
  "family_observatory","royal_room","trophy_cabinet",
]);

export const STORE_GROUPS: StoreGroup[] = [
  {id:"care", title:"غذا و مراقبت سگول", summary:"غذا، آب، خواب و نظافت", match:i=>i.kind==="sagool"&&CARE_IDS.has(i.id)},
  {id:"toys", title:"اسباب‌بازی سگول", summary:"توپ، استخوان و ابزار بازی", match:i=>i.kind==="sagool"&&TOY_IDS.has(i.id)},
  {id:"accessories", title:"پوشیدنی و اکسسوری سگول", summary:"قلاده، تاج، زره و جلوه", match:i=>i.kind==="sagool"&&!CARE_IDS.has(i.id)&&!TOY_IDS.has(i.id)},
  {id:"materials", title:"مصالح خانه", summary:"آجر، سیمان، چوب، آب، کاشی و رنگ", match:i=>i.kind==="material"},
  {id:"furniture", title:"مبلمان", summary:"مبل، میز، کمد و فضای زندگی", match:i=>i.kind==="house"&&FURNITURE_IDS.has(i.id)},
  {id:"decor", title:"دکور خانه", summary:"چراغ، ساعت، گیاه و جلوه فضایی", match:i=>i.kind==="house"&&!FURNITURE_IDS.has(i.id)},
  {id:"profile", title:"پروفایل و پرمیوم", summary:"قاب، نشان و جلوه‌های هویتی", match:i=>i.kind==="profile"},
];

export function classifyStoreItems(){
  const classified: Record<string,string[]> = {};
  const seen = new Map<string,string>();
  const missing: string[] = [];
  const duplicates: Array<{id:string; groups:string[]}> = [];
  for(const g of STORE_GROUPS) classified[g.id]=[];
  for(const item of STORE_ITEMS){
    const hits = STORE_GROUPS.filter(g=>g.match(item)).map(g=>g.id);
    if(!hits.length) missing.push(item.id);
    if(hits.length>1) duplicates.push({id:item.id, groups:hits});
    if(hits.length===1){
      seen.set(item.id, hits[0]);
      classified[hits[0]].push(item.id);
    }
  }
  return {
    catalog: STORE_ITEMS.length,
    classified: STORE_ITEMS.length - missing.length,
    missing,
    duplicates,
    groups: classified,
  };
}
