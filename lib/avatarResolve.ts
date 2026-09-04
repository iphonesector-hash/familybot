export type PhotoLike={
  photo_url?:unknown;
  photoUrl?:unknown;
  photo?:unknown;
  avatar_url?:unknown;
  avatarUrl?:unknown;
};

export function extractBalePhotoUrl(source:unknown):string|null{
  if(!source||typeof source!=="object")return null;
  const row=source as PhotoLike;
  const raw=[row.photo_url,row.photoUrl,row.photo,row.avatar_url,row.avatarUrl];
  for(const value of raw){
    const url=usableHttpUrl(value);
    if(url)return url;
  }
  return null;
}

export function usableHttpUrl(value:unknown):string|null{
  const text=String(value||"").trim();
  if(!text||text.startsWith("storage:"))return null;
  if(!/^https?:\/\//i.test(text))return null;
  if(text.length>2000)return null;
  return text;
}

export function isFamilyUpload(value:unknown){
  return String(value||"").startsWith("storage:");
}

export function resolveAvatarUrl(stored?:string|null,live?:string|null):string{
  const family=usableHttpUrl(stored);
  if(family)return family;
  const bale=usableHttpUrl(live);
  if(bale)return bale;
  return "";
}

export function avatarInitials(name?:string|null){
  const text=String(name||"").trim();
  if(!text)return "✦";
  const parts=text.split(/\s+/).slice(0,2);
  return parts.map(p=>p[0]).join("")||"✦";
}

export function normalizeBaleUser<T extends Record<string,unknown>>(user:T):T&{photo_url?:string}{
  const photo=extractBalePhotoUrl(user);
  return photo?{...user,photo_url:photo}:user;
}
