export type StoreKind="house"|"profile"|"sagool";
export type StoreItem={id:string;name:string;price:number;kind:StoreKind;asset:string;description:string;rarity:"common"|"rare"|"epic"|"legendary"};
export const STORE_ITEMS:StoreItem[]=[
{id:"purple_tree",name:"درخت کهکشانی",price:500,kind:"house",asset:"/assets/house/tree-galaxy.png",description:"درخت نورانی برای حیاط خانه",rarity:"common"},
{id:"light_fountain",name:"فواره نور",price:800,kind:"house",asset:"/assets/house/fountain-light.png",description:"فواره آبی با هاله‌ی نئون",rarity:"rare"},
{id:"heart_bench",name:"نیمکت خاطره",price:600,kind:"house",asset:"/assets/house/bench-memory.png",description:"نیمکت گرم برای گوشه‌ی باغ",rarity:"common"},
{id:"hero_frame",name:"فریم قهرمان",price:950,kind:"profile",asset:"/assets/profile/hero-frame.png",description:"قاب ویژه‌ی پروفایل",rarity:"rare"},
{id:"moon_lamp",name:"چراغ ماه",price:720,kind:"house",asset:"/assets/house/moon-lamp.png",description:"چراغ شب با نور ماه",rarity:"rare"},
{id:"family_gazebo",name:"آلاچیق جهانی",price:1450,kind:"house",asset:"/assets/house/family-gazebo.png",description:"آلاچیق لوکس برای خانه",rarity:"epic"},
{id:"garden_bridge",name:"پل باغ",price:1250,kind:"house",asset:"/assets/house/garden-bridge.png",description:"پل چوبی روی جوی نور",rarity:"epic"},
{id:"star_pool",name:"استخر ستاره",price:1800,kind:"house",asset:"/assets/house/star-pool.png",description:"استخر با بازتاب آسمان",rarity:"legendary"},
{id:"flower_garden",name:"باغچه‌ی نور",price:900,kind:"house",asset:"/assets/house/flower-garden.png",description:"گل‌های رنگی متحرک",rarity:"rare"},
{id:"sagool_kibble",name:"غذای انرژی",price:120,kind:"sagool",asset:"/assets/sagool/items/food-energy.png",description:"گرسنگی سگول را کم می‌کند",rarity:"common"},
{id:"sagool_water",name:"آب خنک",price:80,kind:"sagool",asset:"/assets/sagool/items/water.png",description:"تشنگی سگول را برطرف می‌کند",rarity:"common"},
{id:"sagool_ball",name:"توپ کهکشانی",price:280,kind:"sagool",asset:"/assets/sagool/items/ball-galaxy.png",description:"شادی و XP بازی",rarity:"rare"},
{id:"sagool_bed",name:"تخت ابری",price:650,kind:"sagool",asset:"/assets/sagool/items/cloud-bed.png",description:"خواب بهتر و انرژی بیشتر",rarity:"rare"},
{id:"sagool_glasses",name:"عینک آبی",price:480,kind:"sagool",asset:"/assets/sagool/items/blue-glasses.png",description:"استایل اختصاصی سگول",rarity:"rare"},
{id:"sagool_scarf",name:"دستمال گردن سکتور",price:520,kind:"sagool",asset:"/assets/sagool/items/sector-scarf.png",description:"استایل حرفه‌ای سگول",rarity:"epic"},
{id:"sagool_crown",name:"تاج جهانی",price:1600,kind:"sagool",asset:"/assets/sagool/items/jahani-crown.png",description:"برای سگول‌های سطح بالا",rarity:"legendary"},
{id:"sagool_armor",name:"زره نگهبان",price:2200,kind:"sagool",asset:"/assets/sagool/items/guardian-armor.png",description:"ظاهر افسانه‌ای مرحله‌ی نهایی",rarity:"legendary"}
];
export const storeItem=(id:string)=>STORE_ITEMS.find(x=>x.id===id);
