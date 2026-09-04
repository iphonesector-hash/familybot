export type HouseMaterial = "brick"|"cement"|"wood"|"water"|"tile"|"paint";

export const HOUSE_MAX_LEVEL = 10;
export const HOUSE_MATERIALS: {id:HouseMaterial;name:string;art:string;pack:number;price:number;tier:string}[] = [
  {id:"brick", name:"آجر", art:"/assets/house/materials/brick.png", pack:8, price:180, tier:"basic"},
  {id:"cement", name:"سیمان", art:"/assets/house/materials/cement.png", pack:6, price:220, tier:"basic"},
  {id:"wood", name:"چوب", art:"/assets/house/materials/wood.png", pack:6, price:200, tier:"improved"},
  {id:"water", name:"آب ساخت", art:"/assets/house/materials/water.png", pack:8, price:90, tier:"basic"},
  {id:"tile", name:"کاشی", art:"/assets/house/materials/tile.png", pack:4, price:320, tier:"stone"},
  {id:"paint", name:"رنگ", art:"/assets/house/materials/paint.png", pack:3, price:280, tier:"gold"},
];

export const HOUSE_LEVELS = [
  {level:1, title:"خانه ساده", style:"basic", furniture:["tea_table"]},
  {level:2, title:"اسکلت بهتر", style:"basic", furniture:["tea_table","star_rug"]},
  {level:3, title:"جزئیات داخلی", style:"improved", furniture:["family_photo_frame","nebula_plant"]},
  {level:4, title:"خانه مرتب", style:"improved", furniture:["galaxy_sofa","cosmic_clock"]},
  {level:5, title:"Mid-Tier", style:"stone", furniture:["sky_window","crystal_lantern"]},
  {level:6, title:"مدرن", style:"stone", furniture:["nebula_wardrobe","memory_bench"]},
  {level:7, title:"Premium", style:"silver", furniture:["cosmic_chandelier","home_theater"]},
  {level:8, title:"لوکس", style:"gold", furniture:["nebula_fireplace","trophy_cabinet"]},
  {level:9, title:"ویژه", style:"gold", furniture:["cosmic_aquarium","family_observatory"]},
  {level:10,title:"JAHANI نهایی", style:"jahani", furniture:["cosmic_library","golden_family_tree","royal_cosmic_throne"]},
] as const;

type Cost = Partial<Record<HouseMaterial,number>> & {coins:number};

export const HOUSE_UPGRADE_COST: Record<number,Cost> = {
  2:{brick:8,cement:4,wood:4,water:6,coins:80},
  3:{brick:12,cement:8,wood:6,water:8,coins:160},
  4:{brick:20,cement:10,wood:8,water:10,tile:4,coins:500},
  5:{brick:28,cement:16,wood:12,water:12,tile:8,paint:4,coins:900},
  6:{brick:36,cement:22,wood:16,tile:12,paint:8,coins:1400},
  7:{brick:44,cement:28,wood:20,tile:16,paint:12,coins:2200},
  8:{brick:52,cement:34,wood:26,tile:20,paint:16,coins:3400},
  9:{brick:64,cement:42,wood:32,tile:26,paint:20,coins:5200},
  10:{brick:80,cement:54,wood:40,tile:34,paint:28,coins:8000},
};

export function houseSceneSrc(level:number){
  const lv=Math.min(HOUSE_MAX_LEVEL,Math.max(1,Math.floor(Number(level)||1)));
  return `/assets/house/levels/${String(lv).padStart(2,"0")}.jpg`;
}

export function houseNextCost(level:number){
  if(level>=HOUSE_MAX_LEVEL) return null;
  return HOUSE_UPGRADE_COST[level+1]||null;
}

export function missingMaterials(have:Partial<Record<HouseMaterial,number>>, cost:Cost){
  const miss:Partial<Record<HouseMaterial,number>> = {};
  (Object.keys(cost) as Array<keyof Cost>).forEach(k=>{
    if(k==="coins") return;
    const need=Number(cost[k]||0), got=Number(have[k as HouseMaterial]||0);
    if(got<need) miss[k as HouseMaterial]=need-got;
  });
  return miss;
}

