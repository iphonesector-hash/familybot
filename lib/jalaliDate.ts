const DAY_MS=24*60*60*1000;

const persianCalendar=new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn",{
  year:"numeric",
  month:"2-digit",
  day:"2-digit",
  timeZone:"UTC",
});

const digitMap:Record<string,string>={
  "۰":"0","۱":"1","۲":"2","۳":"3","۴":"4","۵":"5","۶":"6","۷":"7","۸":"8","۹":"9",
  "٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9",
};

export function normalizeDateDigits(input:string){
  return String(input||"").replace(/[۰-۹٠-٩]/g,ch=>digitMap[ch]||ch).trim();
}

export function toPersianDigits(input:string){
  return String(input||"").replace(/\d/g,d=>"۰۱۲۳۴۵۶۷۸۹"[Number(d)]||d);
}

function persianParts(date:Date){
  const values:{year?:number;month?:number;day?:number}={};
  for(const part of persianCalendar.formatToParts(date)){
    if(part.type==="year"||part.type==="month"||part.type==="day")values[part.type]=Number(part.value);
  }
  if(!values.year||!values.month||!values.day)return null;
  return {year:values.year,month:values.month,day:values.day};
}

export function isoToJalali(value?:string|null){
  const iso=String(value||"").slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(iso))return "";
  const date=new Date(`${iso}T12:00:00Z`);
  if(Number.isNaN(date.getTime()))return "";
  const p=persianParts(date);
  if(!p)return "";
  return `${p.year}/${String(p.month).padStart(2,"0")}/${String(p.day).padStart(2,"0")}`;
}

export function jalaliToIso(value?:string|null){
  const normalized=normalizeDateDigits(String(value||"")).replace(/[.\-]/g,"/").replace(/\s+/g,"");
  const match=normalized.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if(!match)return null;
  const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
  if(year<1000||year>1999||month<1||month>12||day<1||day>31)return null;
  if(month>=7&&month<=11&&day>30)return null;
  if(month===12&&day>30)return null;

  // Intl knows the Persian calendar on modern iOS/Node. Search around the
  // corresponding Gregorian year, then keep ISO/Gregorian only as storage.
  const approx=Date.UTC(year+621,month-1,day,12);
  for(let offset=-200;offset<=200;offset+=1){
    const date=new Date(approx+offset*DAY_MS);
    const p=persianParts(date);
    if(p&&p.year===year&&p.month===month&&p.day===day)return date.toISOString().slice(0,10);
  }
  return null;
}

export function displayJalali(value?:string|null){
  const jalali=isoToJalali(value);
  return jalali?toPersianDigits(jalali):"";
}
