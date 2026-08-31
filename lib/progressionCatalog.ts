export type MaterialId="wood"|"plank"|"brick"|"cement"|"paint"|"stone"|"tile"|"glass"|"metal"|"cable"|"solar"|"marble"|"silver"|"gold"|"crystal";
export type SagoolSupplyId="food"|"water"|"toy"|"groom"|"bed"|"training"|"outfit"|"legend_token";
export type QtyRequirement<T extends string>={id:T;qty:number};
export type CareRequirement={feed?:number;water?:number;play?:number;sleep?:number;clean?:number;pet?:number;walk?:number;train?:number};

export const MATERIALS:Record<MaterialId,{name:string;unitPrice:number;asset:string}>={
 wood:{name:"چوب",unitPrice:45,asset:"/assets/progression/materials/wood.png"},
 plank:{name:"الوار",unitPrice:65,asset:"/assets/progression/materials/plank.png"},
 brick:{name:"آجر",unitPrice:55,asset:"/assets/progression/materials/brick.png"},
 cement:{name:"سیمان",unitPrice:90,asset:"/assets/progression/materials/cement.png"},
 paint:{name:"رنگ",unitPrice:180,asset:"/assets/progression/materials/paint.png"},
 stone:{name:"سنگ",unitPrice:140,asset:"/assets/progression/materials/stone.png"},
 tile:{name:"کاشی",unitPrice:160,asset:"/assets/progression/materials/tile.png"},
 glass:{name:"شیشه",unitPrice:240,asset:"/assets/progression/materials/glass.png"},
 metal:{name:"فلز",unitPrice:280,asset:"/assets/progression/materials/metal.png"},
 cable:{name:"کابل و برق",unitPrice:320,asset:"/assets/progression/materials/cable.png"},
 solar:{name:"پنل خورشیدی",unitPrice:850,asset:"/assets/progression/materials/solar.png"},
 marble:{name:"مرمر",unitPrice:720,asset:"/assets/progression/materials/marble.png"},
 silver:{name:"نقره",unitPrice:1100,asset:"/assets/progression/materials/silver.png"},
 gold:{name:"طلا",unitPrice:1800,asset:"/assets/progression/materials/gold.png"},
 crystal:{name:"کریستال جهانی",unitPrice:2600,asset:"/assets/progression/materials/crystal.png"}
};

export const SAGOOL_SUPPLIES:Record<SagoolSupplyId,{name:string;unitPrice:number;asset:string}>={
 food:{name:"غذای سگول",unitPrice:220,asset:"/assets/progression/sagool/food.png"},
 water:{name:"آب تازه",unitPrice:90,asset:"/assets/progression/sagool/water.png"},
 toy:{name:"اسباب‌بازی",unitPrice:520,asset:"/assets/progression/sagool/toy.png"},
 groom:{name:"پک نظافت",unitPrice:680,asset:"/assets/progression/sagool/groom.png"},
 bed:{name:"تخت و استراحت",unitPrice:1100,asset:"/assets/progression/sagool/bed.png"},
 training:{name:"پک آموزش",unitPrice:1450,asset:"/assets/progression/sagool/training.png"},
 outfit:{name:"لباس ویژه",unitPrice:2100,asset:"/assets/progression/sagool/outfit.png"},
 legend_token:{name:"نشان افسانه‌ای",unitPrice:5200,asset:"/assets/progression/sagool/legend-token.png"}
};

export type HouseLevel={level:number;title:string;asset:string;xpRequired:number;upgradeCoins:number;materials:QtyRequirement<MaterialId>[]};
export const HOUSE_LEVELS:HouseLevel[]=[
 {level:1,title:"کلبه فرسوده",asset:"/assets/house/levels/01.png",xpRequired:0,upgradeCoins:0,materials:[]},
 {level:2,title:"کلبه تعمیرشده",asset:"/assets/house/levels/02.png",xpRequired:500,upgradeCoins:2500,materials:[{id:"wood",qty:6000},{id:"plank",qty:10000},{id:"paint",qty:6},{id:"brick",qty:2500}]},
 {level:3,title:"خانه سنگی",asset:"/assets/house/levels/03.png",xpRequired:1400,upgradeCoins:6200,materials:[{id:"plank",qty:15000},{id:"brick",qty:8000},{id:"cement",qty:1200},{id:"paint",qty:12},{id:"stone",qty:2400}]},
 {level:4,title:"خانه خانوادگی",asset:"/assets/house/levels/04.png",xpRequired:2800,upgradeCoins:12500,materials:[{id:"brick",qty:14000},{id:"cement",qty:2600},{id:"stone",qty:5200},{id:"tile",qty:1800},{id:"glass",qty:450}]},
 {level:5,title:"ویلای باغ",asset:"/assets/house/levels/05.png",xpRequired:4800,upgradeCoins:22500,materials:[{id:"brick",qty:21000},{id:"cement",qty:4200},{id:"tile",qty:3600},{id:"glass",qty:900},{id:"metal",qty:1200},{id:"paint",qty:30}]},
 {level:6,title:"ویلای مدرن",asset:"/assets/house/levels/06.png",xpRequired:7600,upgradeCoins:38000,materials:[{id:"cement",qty:6500},{id:"glass",qty:1800},{id:"metal",qty:2800},{id:"cable",qty:1200},{id:"solar",qty:12},{id:"tile",qty:5200}]},
 {level:7,title:"خانه هوشمند",asset:"/assets/house/levels/07.png",xpRequired:11200,upgradeCoins:62000,materials:[{id:"glass",qty:3200},{id:"metal",qty:5200},{id:"cable",qty:2600},{id:"solar",qty:30},{id:"marble",qty:1600},{id:"paint",qty:55}]},
 {level:8,title:"عمارت آینده",asset:"/assets/house/levels/08.png",xpRequired:15800,upgradeCoins:98000,materials:[{id:"metal",qty:8200},{id:"cable",qty:4200},{id:"solar",qty:60},{id:"marble",qty:3400},{id:"silver",qty:900},{id:"crystal",qty:180}]},
 {level:9,title:"عمارت شناور",asset:"/assets/house/levels/09.png",xpRequired:21600,upgradeCoins:155000,materials:[{id:"marble",qty:6200},{id:"silver",qty:2200},{id:"gold",qty:850},{id:"crystal",qty:520},{id:"metal",qty:12000},{id:"cable",qty:7000}]},
 {level:10,title:"قصر جهانی",asset:"/assets/house/levels/10.png",xpRequired:30000,upgradeCoins:260000,materials:[{id:"marble",qty:10000},{id:"silver",qty:4800},{id:"gold",qty:2400},{id:"crystal",qty:1400},{id:"solar",qty:120},{id:"cable",qty:12000}]}
];

export type SagoolLevel={level:number;title:string;asset:string;xpRequired:number;upgradeCoins:number;supplies:QtyRequirement<SagoolSupplyId>[];care:CareRequirement};
export const SAGOOL_LEVELS:SagoolLevel[]=[
 {level:1,title:"نوزاد",asset:"/assets/sagool/levels/01.png",xpRequired:0,upgradeCoins:0,supplies:[],care:{}},
 {level:2,title:"توله",asset:"/assets/sagool/levels/02.png",xpRequired:120,upgradeCoins:500,supplies:[{id:"food",qty:3},{id:"water",qty:3}],care:{feed:3,water:3,sleep:2,pet:2}},
 {level:3,title:"کوچولو",asset:"/assets/sagool/levels/03.png",xpRequired:320,upgradeCoins:1200,supplies:[{id:"food",qty:5},{id:"water",qty:5},{id:"toy",qty:1}],care:{feed:4,water:4,play:3,sleep:3}},
 {level:4,title:"جوان",asset:"/assets/sagool/levels/04.png",xpRequired:650,upgradeCoins:2600,supplies:[{id:"food",qty:7},{id:"toy",qty:2},{id:"groom",qty:1}],care:{feed:5,play:4,clean:2,walk:2}},
 {level:5,title:"نوجوان",asset:"/assets/sagool/levels/05.png",xpRequired:1100,upgradeCoins:4800,supplies:[{id:"food",qty:9},{id:"water",qty:8},{id:"bed",qty:1},{id:"groom",qty:2}],care:{feed:6,water:6,sleep:4,clean:3,pet:4}},
 {level:6,title:"قهرمان نوپا",asset:"/assets/sagool/levels/06.png",xpRequired:1800,upgradeCoins:8200,supplies:[{id:"food",qty:12},{id:"toy",qty:4},{id:"training",qty:2}],care:{play:6,walk:4,train:3,pet:5}},
 {level:7,title:"بزرگسال",asset:"/assets/sagool/levels/07.png",xpRequired:2800,upgradeCoins:13500,supplies:[{id:"food",qty:16},{id:"bed",qty:2},{id:"training",qty:4},{id:"groom",qty:3}],care:{feed:8,sleep:6,clean:5,train:5,walk:5}},
 {level:8,title:"قهرمان",asset:"/assets/sagool/levels/08.png",xpRequired:4200,upgradeCoins:22000,supplies:[{id:"food",qty:20},{id:"training",qty:6},{id:"outfit",qty:1}],care:{play:8,train:8,walk:7,pet:8}},
 {level:9,title:"نگهبان آسمانی",asset:"/assets/sagool/levels/09.png",xpRequired:6200,upgradeCoins:36000,supplies:[{id:"food",qty:25},{id:"outfit",qty:2},{id:"legend_token",qty:1}],care:{feed:10,water:10,clean:7,train:10,pet:10}},
 {level:10,title:"افسانه‌ای",asset:"/assets/sagool/levels/10.png",xpRequired:9000,upgradeCoins:62000,supplies:[{id:"food",qty:32},{id:"training",qty:10},{id:"outfit",qty:3},{id:"legend_token",qty:3}],care:{feed:12,play:12,sleep:8,clean:9,walk:10,train:12,pet:12}}
];

export const houseLevel=(level:number)=>HOUSE_LEVELS[Math.max(0,Math.min(9,Math.floor(level)-1))]||HOUSE_LEVELS[0];
export const sagoolLevel=(level:number)=>SAGOOL_LEVELS[Math.max(0,Math.min(9,Math.floor(level)-1))]||SAGOOL_LEVELS[0];
export const nextHouseLevel=(level:number)=>level>=10?null:HOUSE_LEVELS[level]||null;
export const nextSagoolLevel=(level:number)=>level>=10?null:SAGOOL_LEVELS[level]||null;
