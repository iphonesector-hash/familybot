import crypto from "node:crypto";
import {extractBalePhotoUrl} from "@/lib/avatarResolve";

export type BaleMiniAppUser={id:number;first_name?:string;last_name?:string;username?:string;allows_write_to_pm?:boolean;photo_url?:string};
export type BaleInitData={query_id?:string;user?:BaleMiniAppUser;auth_date:number;hash:string;raw:Record<string,string>};

function safeEqualHex(a:string,b:string){
  if(!/^[0-9a-f]+$/i.test(a)||!(/^[0-9a-f]+$/i.test(b)))return false;
  const x=Buffer.from(a,"hex"),y=Buffer.from(b,"hex");
  return x.length===y.length&&crypto.timingSafeEqual(x,y);
}

export function validateBaleInitData(initData:string,maxAgeSeconds=15*60):BaleInitData|null{
  const token=process.env.BALE_BOT_TOKEN;
  if(!token||!initData)return null;
  const params=new URLSearchParams(initData);
  const receivedHash=params.get("hash")||"";
  if(!receivedHash)return null;
  const entries=[...params.entries()].filter(([key])=>key!=="hash").sort(([a],[b])=>a.localeCompare(b));
  const dataCheckString=entries.map(([key,value])=>`${key}=${value}`).join("\n");
  const secretKey=crypto.createHmac("sha256","WebAppData").update(token).digest();
  const expected=crypto.createHmac("sha256",secretKey).update(dataCheckString).digest("hex");
  if(!safeEqualHex(receivedHash,expected))return null;
  const authDate=Number(params.get("auth_date")||0),now=Math.floor(Date.now()/1000);
  if(!Number.isFinite(authDate)||authDate<=0||authDate>now+60||now-authDate>maxAgeSeconds)return null;
  let user:BaleMiniAppUser|undefined;
  const rawUser=params.get("user");
  if(rawUser){
    try{
      const parsed=JSON.parse(rawUser);
      if(!Number.isFinite(Number(parsed?.id)))return null;
      const photo=extractBalePhotoUrl(parsed);
      user={...parsed,id:Number(parsed.id),photo_url:photo||undefined};
    }catch{return null}
  }
  return {query_id:params.get("query_id")||undefined,user,auth_date:authDate,hash:receivedHash,raw:Object.fromEntries(params.entries())};
}
