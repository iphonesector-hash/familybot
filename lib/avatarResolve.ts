export type PhotoLike={
  photo_url?:unknown;
  photoUrl?:unknown;
  photo?:unknown;
  avatar_url?:unknown;
  avatarUrl?:unknown;
};

const PHOTO_KEYS=["photo_url","photoUrl","photo","avatar_url","avatarUrl"] as const;

export function photoFieldsPresent(source:unknown){
  const row=source&&typeof source==="object"?source as Record<string,unknown>:{};
  return {
    photo_url:hasNonEmpty(row.photo_url),
    photoUrl:hasNonEmpty(row.photoUrl),
    photo:hasNonEmpty(row.photo),
    avatar_url:hasNonEmpty(row.avatar_url),
    avatarUrl:hasNonEmpty(row.avatarUrl)
  };
}

function hasNonEmpty(value:unknown){
  return String(value||"").trim().length>0;
}

export function extractBalePhotoUrl(source:unknown):string|null{
  if(!source||typeof source!=="object")return null;
  const row=source as PhotoLike;
  for(const key of PHOTO_KEYS){
    const url=usableHttpUrl((row as Record<string,unknown>)[key]);
    if(url)return url;
  }
  return null;
}

export function usableHttpUrl(value:unknown):string|null{
  const text=String(value||"").trim();
  if(!text||text.startsWith("storage:")||text.startsWith("bale-proxy:"))return null;
  if(!/^https?:\/\//i.test(text))return null;
  if(text.length>2000)return null;
  return text;
}

export function isFamilyUpload(value:unknown){
  const text=String(value||"");
  return text.startsWith("storage:")&&!text.startsWith("storage:bale/");
}

export function isServerBaleAvatar(value:unknown){
  const text=String(value||"");
  return text.startsWith("storage:bale/")||text.startsWith("bale-proxy:");
}

export function pickDisplayAvatar(input:{stored?:string|null;live?:string|null;server?:string|null}){
  return usableHttpUrl(input.stored)||usableHttpUrl(input.live)||usableHttpUrl(input.server)||"";
}

export function resolveAvatarUrl(stored?:string|null,live?:string|null):string{
  return pickDisplayAvatar({stored,live});
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

export function balePhotoDiagnostic(user:unknown){
  const present=Boolean(user&&typeof user==="object");
  const id=present?Number((user as {id?:unknown}).id):NaN;
  const photo=extractBalePhotoUrl(user);
  return {
    userPresent:present,
    userIdPresent:Number.isFinite(id)&&id>0,
    photoFieldsPresent:photoFieldsPresent(user),
    normalizedPhotoPresent:Boolean(photo)
  };
}
