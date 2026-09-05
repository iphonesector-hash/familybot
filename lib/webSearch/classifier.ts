export type LiveKind="none"|"currency"|"gold"|"crypto"|"news"|"weather"|"search";
export function classifyLiveQuery(input:string):LiveKind{
  const q=input.normalize("NFKC").replace(/[يى]/g,"ی").replace(/ك/g,"ک").replace(/[\u200c\u200f]/g," ").replace(/\s+/g," ").trim().toLowerCase();
  const current=/(امروز|الان|لحظه|آخرین|جدیدترین|به روز|بروز|قیمت|نرخ|نتیجه|today|latest|current|price|news|weather)/i.test(q);
  const educational=/(چیست|چیه|یعنی چی|چطور کار|توضیح بده|what is)/i.test(q);
  if(educational&&!current)return "none";
  if(/(خبر|اخبار|news)/.test(q))return "news";
  if(/(آب\s*و?\s*هوا|هوا(?:ی|یی)?\s*(امروز|الان|فردا)|weather)/.test(q))return "weather";
  // A named asset alone conventionally asks for its current quote.
  if(/(بیت\s*کوین|اتریوم|تتر|bitcoin|ethereum|\bbtc\b|\beth\b|\busdt\b)/.test(q))return "crypto";
  if((/(طلا|gold)/.test(q)||/(قیمت|نرخ).*سکه|سکه.*(امامی|بهار|طلا)/.test(q))&&current)return "gold";
  if(/(دلار|\busd\b)/.test(q)&&!/(آیفون|ایفون|iphone|گوشی|لپ\s*تاپ)/.test(q))return "currency";
  if(/(خانواده|تولد|کارهای|سکه.*(دارم|داریم)|رتبه من)/.test(q)&&!/(قیمت|خبر|اخبار|اینترنت|جستجو)/.test(q))return "none";
  if(current||/(اینترنت|جست\s*و?\s*جو|سرچ|نتیجه بازی)/.test(q))return "search";
  return "none";
}
