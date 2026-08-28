type BaleMethod =
  | "sendMessage"
  | "editMessageText"
  | "deleteMessage"
  | "answerCallbackQuery"
  | "banChatMember"
  | "unbanChatMember"
  | "restrictChatMember"
  | "getChatAdministrators"
  | "pinChatMessage"
  | "unpinChatMessage"
  | "setWebhook"
  | "getWebhookInfo";

const API_BASE = "https://tapi.bale.ai/bot";
const DEFAULT_APP_URL = "https://familybot-gray.vercel.app";
export type BaleInlineButton={text:string;callback_data?:string;url?:string;web_app?:{url:string}};
export async function baleApi<T=unknown>(method:BaleMethod,payload:Record<string,unknown>={}){const token=process.env.BALE_BOT_TOKEN;if(!token)throw new Error("BALE_BOT_TOKEN is not configured");const response=await fetch(`${API_BASE}${token}/${method}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload),cache:"no-store"});const data=await response.json();if(!response.ok||data?.ok===false)throw new Error(data?.description??`Bale API ${method} failed`);return data as T}
export function sendMessage(chatId:string|number,text:string,extra:Record<string,unknown>={}){return baleApi("sendMessage",{chat_id:chatId,text,...extra})}
export function answerCallbackQuery(callbackQueryId:string,text?:string,showAlert=false){return baleApi("answerCallbackQuery",{callback_query_id:callbackQueryId,...(text?{text}:{}),show_alert:showAlert})}
export function editMessageText(chatId:string|number,messageId:number,text:string,extra:Record<string,unknown>={}){return baleApi("editMessageText",{chat_id:chatId,message_id:messageId,text,...extra})}
export function openMiniAppKeyboard(){const url=process.env.NEXT_PUBLIC_APP_URL||DEFAULT_APP_URL;return{inline_keyboard:[[{text:"🏠 باز کردن Family Bot",web_app:{url}}],[{text:"🎮 بازی‌ها",callback_data:"menu:games"},{text:"👤 پروفایل",callback_data:"menu:profile"}]]}}
function webAppButton(base:string|undefined,path:string,text:string):BaleInlineButton{return base?{text,web_app:{url:new URL(path,base).toString()}}:{text,callback_data:"menu:miniapp"}}
export function mainMenuKeyboard(canManage=false){
  const base=process.env.NEXT_PUBLIC_APP_URL||DEFAULT_APP_URL;
  const miniAppButton=webAppButton(base,"/","🏠 Mini App");
  const familyButton=webAppButton(base,"/section/family","👨‍👩‍👧‍👦 خانواده");
  const treeButton=webAppButton(base,"/section/tree","🌳 شجره‌نامه");
  const plannerButton=webAppButton(base,"/section/planner","📅 برنامه‌ریز");
  const wheelButton=webAppButton(base,"/section/wheel","🎡 گردونه شانس");
  const fundButton=webAppButton(base,"/section/fund","🏦 صندوق خانوادگی");
  const financeButton=webAppButton(base,"/section/finance","💳 حساب خانواده");
  const memoriesButton=webAppButton(base,"/section/memories","🖼 خاطرات");
  const communityButton=webAppButton(base,"/section/community","🌍 چالش و سفر");
  const secretGiftButton=webAppButton(base,"/section/secret-gift","🎁 Secret Gift");
  const storeButton=webAppButton(base,"/section/store","🛍 فروشگاه");
  const achievementsButton=webAppButton(base,"/section/achievements","🏅 دستاوردها");
  const funButton=webAppButton(base,"/section/fun","😄 سرگرمی خانواده");
  const toolsButton=webAppButton(base,"/section/tools","🧰 ابزارهای کاربردی");
  const aiButton=webAppButton(base,"/ai","🤖 Family AI");
  const rows:BaleInlineButton[][]=[
    [miniAppButton],
    [familyButton,treeButton],
    [plannerButton,wheelButton],
    [fundButton,financeButton],
    [memoriesButton,communityButton],
    [secretGiftButton,storeButton],
    [achievementsButton,{text:"🎮 بازی‌ها",callback_data:"menu:games"}],
    [funButton,toolsButton],
    [aiButton,{text:"👤 پروفایل",callback_data:"menu:profile"}],
    [{text:"🏆 رتبه‌بندی",callback_data:"menu:rank"},{text:"🎁 جایزه روزانه",callback_data:"menu:daily"}],
    [{text:"📜 قوانین",callback_data:"menu:rules"},{text:"❓ راهنما",callback_data:"menu:help"}],
  ];
  if(canManage)rows.push([{text:"🛡 مدیریت گروه",callback_data:"menu:admin"}]);
  return{inline_keyboard:rows};
}
export async function isAdmin(chatId:string|number,userId:string|number){const result=await baleApi<{result?:Array<{user?:{id?:number}}> }>("getChatAdministrators",{chat_id:chatId});return Boolean(result.result?.some(admin=>String(admin.user?.id)===String(userId)))}
