export type StoreKind="house"|"profile"|"sagool";
export type StoreRarity="common"|"rare"|"epic"|"legendary";
export type StoreItem={id:string;name:string;price:number;kind:StoreKind;description:string;rarity:StoreRarity;sprite?:number;asset?:string};

export const STORE_ITEMS:StoreItem[]=[
  {id:"house_sofa",name:"مبل کهکشانی",price:850,kind:"house",sprite:4,description:"مبل مخملی نئون برای سالن خانه",rarity:"rare"},
  {id:"house_sofa_royal",name:"مبل سلطنتی جهانی",price:1650,kind:"house",sprite:4,description:"نسخه لوکس سالن با هاله طلایی",rarity:"epic"},
  {id:"house_clock",name:"ساعت مدار",price:620,kind:"house",sprite:5,description:"ساعت دیواری آینده‌نگر با مدار نوری",rarity:"common"},
  {id:"house_clock_legend",name:"ساعت زمان جهانی",price:1800,kind:"house",sprite:5,description:"ساعت ویژه خانه‌های سطح بالا",rarity:"legendary"},
  {id:"light_fountain",name:"فواره پنجه نور",price:900,kind:"house",sprite:6,description:"فواره آبی با نشان پنجه و هاله نئون",rarity:"rare"},
  {id:"star_fountain",name:"فواره ستاره‌ای",price:1500,kind:"house",sprite:6,description:"نسخه ارتقایافته فواره با افکت ستاره‌ای",rarity:"epic"},
  {id:"house_lantern",name:"فانوس کریستالی",price:760,kind:"house",sprite:7,description:"فانوس کریستالی برای فضای گرم خانه",rarity:"rare"},
  {id:"house_lantern_royal",name:"فانوس سلطنتی",price:1420,kind:"house",sprite:7,description:"نورپردازی ویژه با کریستال بنفش",rarity:"epic"},
  {id:"house_plant",name:"گیاه سحابی",price:540,kind:"house",sprite:8,description:"گلدان زنده با برگ‌های کهکشانی",rarity:"common"},
  {id:"house_plant_orbit",name:"باغچه مدار",price:1180,kind:"house",sprite:8,description:"نسخه کمیاب گلدان با درخشش مداری",rarity:"epic"},
  {id:"house_theater",name:"سینمای خانگی",price:1950,kind:"house",sprite:9,description:"تلویزیون، کنسول و سیستم صوتی نئونی",rarity:"legendary"},
  {id:"house_theater_plus",name:"سینمای جهانی+",price:2600,kind:"house",sprite:9,description:"مرکز سرگرمی کامل برای خانه سطح بالا",rarity:"legendary"},

  {id:"sagool_food",name:"ظرف غذای انرژی",price:120,kind:"sagool",sprite:0,description:"یک وعده غذای پرانرژی برای سگول",rarity:"common"},
  {id:"sagool_food_royal",name:"غذای رویال سگول",price:420,kind:"sagool",sprite:0,description:"وعده ویژه با پاداش شادی بیشتر",rarity:"rare"},
  {id:"sagool_bone",name:"استخوان کهکشانی",price:260,kind:"sagool",sprite:1,description:"اسباب‌بازی جویدنی برای شادی و بازی",rarity:"common"},
  {id:"sagool_bone_hero",name:"استخوان قهرمان",price:680,kind:"sagool",sprite:1,description:"نسخه اپیک برای سگول‌های آموزش‌دیده",rarity:"epic"},
  {id:"sagool_bed",name:"تخت ابری",price:650,kind:"sagool",sprite:2,description:"خواب بهتر و بازیابی انرژی بیشتر",rarity:"rare"},
  {id:"sagool_bed_legend",name:"تخت افسانه‌ای",price:1550,kind:"sagool",sprite:2,description:"تخت لوکس برای مراحل بالای سگول",rarity:"legendary"},
  {id:"sagool_collar",name:"قلاده سکتور",price:520,kind:"sagool",sprite:3,description:"استایل اختصاصی با نشان S",rarity:"rare"},
  {id:"sagool_collar_royal",name:"قلاده جهانی",price:1350,kind:"sagool",sprite:3,description:"قلاده سلطنتی با آویز کهکشانی",rarity:"epic"},
  {id:"sagool_training",name:"پکیج آموزش",price:390,kind:"sagool",sprite:1,description:"تمرین انفرادی برای افزایش Bond و XP",rarity:"rare"},
  {id:"sagool_playpack",name:"پکیج بازی",price:470,kind:"sagool",sprite:1,description:"بازی‌های روزانه برای افزایش شادی",rarity:"rare"},
  {id:"sagool_sleepkit",name:"کیت خواب آرام",price:580,kind:"sagool",sprite:2,description:"استراحت عمیق و بازیابی سریع انرژی",rarity:"epic"},
  {id:"sagool_stylepack",name:"استایل نگهبان",price:1850,kind:"sagool",sprite:3,description:"ظاهر ویژه برای مرحله نگهبان و افسانه‌ای",rarity:"legendary"},

  {id:"hero_frame",name:"فریم قهرمان",price:950,kind:"profile",asset:"/brand/familybot-mark.svg",description:"قاب ویژه پروفایل خانواده",rarity:"rare"},
  {id:"founder_glow",name:"هاله جهانی",price:1450,kind:"profile",asset:"/brand/familybot-mark.svg",description:"هاله پروفایل با درخشش کهکشانی",rarity:"epic"},
  {id:"memory_badge",name:"نشان خاطره‌ساز",price:780,kind:"profile",asset:"/brand/familybot-mark.svg",description:"نشان مخصوص اعضای فعال خاطرات",rarity:"rare"},
  {id:"legend_badge",name:"نشان افسانه خانواده",price:2400,kind:"profile",asset:"/brand/familybot-mark.svg",description:"نشان نهایی اعضای سطح بالا",rarity:"legendary"}
];

export const storeItem=(id:string)=>STORE_ITEMS.find(x=>x.id===id);
