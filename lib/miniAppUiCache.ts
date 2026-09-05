export type UiProfile={
  id?:string;
  display_name?:string|null;
  first_name?:string|null;
  avatar_url?:string|null;
  resolved_avatar_url?:string|null;
  level?:number;
  xp?:number;
  coins?:number;
  streak?:number;
  rank?:number|null;
  is_founder?:boolean;
  equipped_profile_item?:string|null;
};

export type UiFamily={
  id?:string;
  name?:string;
  level?:number;
  xp?:number;
  coins?:number;
  houseLevel?:number;
  membersCount?:number;
  upcomingEventsCount?:number;
  upcomingBirthdaysCount?:number;
  memoriesCount?:number;
  levelProgress?:{current:number;target:number};
};

type UiSnapshot={familyId:string;savedAt:number;family?:UiFamily|null;profile?:UiProfile|null};
const KEY="familybot.uiSnapshot.v2";
const MAX_AGE=12*60*60*1000;

function currentFamilyId(){
  try{return sessionStorage.getItem("familybot.familyId")||""}catch{return ""}
}

export function readUiSnapshot():UiSnapshot|null{
  try{
    const raw=localStorage.getItem(KEY);if(!raw)return null;
    const parsed=JSON.parse(raw) as UiSnapshot;
    const familyId=currentFamilyId();
    if(!parsed||!parsed.savedAt||Date.now()-parsed.savedAt>MAX_AGE)return null;
    if(familyId&&parsed.familyId&&familyId!==parsed.familyId)return null;
    return parsed;
  }catch{return null}
}

export function writeUiSnapshot(input:{family?:UiFamily|null;profile?:UiProfile|null;familyId?:string}){
  try{
    const previous=readUiSnapshot();
    const familyId=String(input.familyId||input.family?.id||currentFamilyId()||previous?.familyId||"");
    if(!familyId)return;
    const next:UiSnapshot={
      familyId,
      savedAt:Date.now(),
      family:input.family===undefined?previous?.family||null:{...(previous?.family||{}),...(input.family||{})},
      profile:input.profile===undefined?previous?.profile||null:{...(previous?.profile||{}),...(input.profile||{})},
    };
    localStorage.setItem(KEY,JSON.stringify(next));
  }catch{}
}

export function cacheDashboardShell(dashboard:any){
  if(!dashboard)return;
  writeUiSnapshot({familyId:String(dashboard.family?.id||""),family:dashboard.family||undefined,profile:dashboard.profile||undefined});
}

export function patchCachedProfile(patch:UiProfile){
  const previous=readUiSnapshot();
  if(!previous)return;
  writeUiSnapshot({familyId:previous.familyId,profile:{...(previous.profile||{}),...patch}});
}
