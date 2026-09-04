const UNSAFE=/سکس|جنسی|پورن|فاحش|عتصابی|تجاوز|همجنس|لخت|برهنه|حزب‌?الله|انتخابات|اصلاحات|اصولگرا|جمهوری اسلامی|رهبر|خامن|ترامپ|نژادپرست|بلوند|مواد مخدر|کوکائین|هروئین|قتل عام|ترور/i;

export function isFamilySafe(text:string){
  const t=String(text||"").trim();
  if(t.length<8||t.length>900)return false;
  return !UNSAFE.test(t);
}
