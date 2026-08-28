import crypto from "node:crypto";

export function getBaleWebhookSecret(){
  const direct=process.env.BALE_WEBHOOK_PATH_TOKEN||process.env.BALE_WEBHOOK_SECRET;
  if(direct)return direct;
  const seed=process.env.FAMILY_MEMBER_SESSION_SECRET;
  if(!seed)return null;
  return crypto.createHmac("sha256",seed).update("familybot:bale:webhook:v1").digest("hex");
}
