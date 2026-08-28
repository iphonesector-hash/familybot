import crypto from "node:crypto";

export type AdminSessionPayload={familyId:string;chatId:number;userId:number;exp:number};
function secret(){const value=process.env.FAMILY_ADMIN_SESSION_SECRET||process.env.BALE_WEBHOOK_SECRET;if(!value)throw new Error("FAMILY_ADMIN_SESSION_SECRET is not configured");return value}
function b64url(input:string|Buffer){return Buffer.from(input).toString("base64url")}
export function createAdminSession(payload:Omit<AdminSessionPayload,"exp">,ttlSeconds=900){const body:AdminSessionPayload={...payload,exp:Math.floor(Date.now()/1000)+ttlSeconds};const encoded=b64url(JSON.stringify(body));const sig=crypto.createHmac("sha256",secret()).update(encoded).digest("base64url");return `${encoded}.${sig}`}
export function verifyAdminSession(token:string){const [encoded,sig]=token.split(".");if(!encoded||!sig)return null;const expected=crypto.createHmac("sha256",secret()).update(encoded).digest("base64url");const a=Buffer.from(sig),b=Buffer.from(expected);if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return null;const payload=JSON.parse(Buffer.from(encoded,"base64url").toString("utf8")) as AdminSessionPayload;if(!payload.familyId||!payload.chatId||!payload.userId||payload.exp<Math.floor(Date.now()/1000))return null;return payload}
