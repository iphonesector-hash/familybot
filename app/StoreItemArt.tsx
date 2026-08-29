import AssetSprite from "./AssetSprite";
import {STORE_ITEMS} from "@/lib/storeCatalog";

export default function StoreItemArt({itemId,size=86,className="",label}:{itemId:string;size?:number;className?:string;label?:string}){
  const item=STORE_ITEMS.find(x=>x.id===itemId);
  return <AssetSprite index={item?.sprite??0} size={size} className={className} label={label||item?.name||itemId}/>;
}
