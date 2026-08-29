export type StoreKind="house"|"profile"|"sagool";
export type StoreRarity="common"|"rare"|"epic"|"legendary";
export type StoreItem={id:string;name:string;price:number;kind:StoreKind;sprite:number;description:string;rarity:StoreRarity};
export const STORE_ITEMS:StoreItem[]=[
{id:"galaxy_sofa",name:"مبل کهکشانی",price:620,kind:"house",sprite:4,description:"مبل لوکس بنفش برای سالن خانه",rarity:"common"},
{id:"cosmic_clock",name:"ساعت کیهانی",price:540,kind:"house",sprite:5,description:"ساعت تزئینی آینده‌نگر",rarity:"common"},
{id:"light_fountain",name:"فواره پنجه نور",price:880,kind:"house",sprite:6,description:"فواره نئونی برای حیاط",rarity:"rare"},
{id:"crystal_lantern",name:"فانوس کریستالی",price:760,kind:"house",sprite:7,description:"چراغ کریستالی با هاله کهکشانی",rarity:"rare"},
{id:"nebula_plant",name:"گلدان سحابی",price:690,kind:"house",sprite:8,description:"گیاه نئونی برای فضای خانه",rarity:"rare"},
{id:"home_theater",name:"سینمای جهانی",price:1650,kind:"house",sprite:9,description:"سینمای خانگی آینده‌نگر",rarity:"epic"},
{id:"memory_bench",name:"نیمکت خاطره",price:780,kind:"house",sprite:4,description:"گوشه‌ای آرام برای خاطره‌های خانواده",rarity:"rare"},
{id:"moon_clock",name:"ساعت ماه",price:930,kind:"house",sprite:5,description:"نسخه ویژه ساعت با تم ماه",rarity:"epic"},
{id:"star_pool",name:"استخر ستاره",price:1950,kind:"house",sprite:6,description:"استخر نورانی با بازتاب ستاره‌ها",rarity:"legendary"},
{id:"family_cinema",name:"سینمای خانواده",price:2400,kind:"house",sprite:9,description:"آیتم افسانه‌ای Family House",rarity:"legendary"},
{id:"sagool_food",name:"غذای انرژی",price:120,kind:"sagool",sprite:0,description:"یک وعده خوشمزه برای سگول",rarity:"common"},
{id:"sagool_water",name:"ظرف آب نئونی",price:90,kind:"sagool",sprite:0,description:"ظرف آب مخصوص سگول",rarity:"common"},
{id:"sagool_bone",name:"استخوان کهکشانی",price:260,kind:"sagool",sprite:1,description:"اسباب‌بازی جویدنی نورانی",rarity:"common"},
{id:"sagool_bone_pro",name:"استخوان سکتور",price:460,kind:"sagool",sprite:1,description:"نسخه حرفه‌ای برای XP بازی بیشتر",rarity:"rare"},
{id:"sagool_bed",name:"تخت ابری",price:650,kind:"sagool",sprite:2,description:"خواب راحت و انرژی بیشتر",rarity:"rare"},
{id:"sagool_bed_royal",name:"تخت رویال",price:1180,kind:"sagool",sprite:2,description:"تخت لوکس سگول برای مراحل بالا",rarity:"epic"},
{id:"sagool_collar",name:"قلاده نئونی",price:480,kind:"sagool",sprite:3,description:"قلاده اختصاصی با آویز نورانی",rarity:"rare"},
{id:"sagool_sector_collar",name:"قلاده سکتور",price:820,kind:"sagool",sprite:3,description:"استایل اختصاصی Sector",rarity:"epic"},
{id:"sagool_crown",name:"تاج جهانی",price:1600,kind:"sagool",sprite:3,description:"برای سگول‌های سطح بالا",rarity:"legendary"},
{id:"sagool_guardian",name:"نشان نگهبان",price:2200,kind:"sagool",sprite:3,description:"آیتم افسانه‌ای مرحله نگهبان",rarity:"legendary"},
{id:"sagool_toy_pack",name:"پک بازی سگول",price:920,kind:"sagool",sprite:1,description:"پک ویژه سرگرمی و تمرین",rarity:"epic"},
{id:"sagool_sleep_pack",name:"پک خواب آرام",price:980,kind:"sagool",sprite:2,description:"پک مخصوص استراحت سگول",rarity:"epic"},
{id:"hero_frame",name:"فریم قهرمان",price:950,kind:"profile",sprite:3,description:"قاب ویژه پروفایل",rarity:"rare"},
{id:"cosmic_badge",name:"نشان جهانی",price:1250,kind:"profile",sprite:5,description:"نشان پروفایل خانواده جهانی",rarity:"epic"},
{id:"legend_glow",name:"هاله افسانه‌ای",price:1900,kind:"profile",sprite:7,description:"هاله ویژه اطراف آواتار",rarity:"legendary"}
];
export const storeItem=(id:string)=>STORE_ITEMS.find(x=>x.id===id);
