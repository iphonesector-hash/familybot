import {NextRequest,NextResponse} from "next/server";
import {verifyFamilySession} from "@/lib/familySession";
import {buyHouseMaterial,collectDailyHouseMats,readHouseProgress,upgradeFamilyHouse} from "@/lib/houseMutations";

function auth(req:NextRequest){const h=req.headers.get("authorization")||"";return h.startsWith("Bearer ")?verifyFamilySession(h.slice(7)):null}

export async function GET(req:NextRequest){
  const ses=auth(req); if(!ses) return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
  try{return NextResponse.json({ok:true,data:await readHouseProgress(ses.familyId,ses.userId)},{headers:{"cache-control":"no-store"}})}
  catch(e){console.error("house read",e);return NextResponse.json({ok:false,error:"house_read_failed"},{status:500})}
}

export async function POST(req:NextRequest){
  const ses=auth(req); if(!ses) return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
  try{
    const body=await req.json();
    const type=String(body.type||"");
    if(type==="upgrade"){
      const data=await upgradeFamilyHouse(ses.familyId,ses.userId,Number(body.fromLevel||1));
      const fresh=await readHouseProgress(ses.familyId,ses.userId);
      return NextResponse.json({ok:true,data:{...fresh,upgrade:data}});
    }
    if(type==="buy_material"){
      const buy=await buyHouseMaterial(ses.familyId,ses.userId,String(body.material||""));
      const fresh=await readHouseProgress(ses.familyId,ses.userId);
      return NextResponse.json({ok:true,data:{...fresh,buy}});
    }
    if(type==="collect_daily"){
      const collect=await collectDailyHouseMats(ses.familyId,ses.userId);
      const fresh=await readHouseProgress(ses.familyId,ses.userId);
      return NextResponse.json({ok:true,data:{...fresh,collect}});
    }
    return NextResponse.json({ok:false,error:"unknown_action"},{status:400});
  }catch(e:any){
    const msg=String(e?.message||e?.code||"");
    const mapped=msg.includes("insufficient_coins")?"insufficient_coins"
      :msg.includes("missing_materials")?"missing_materials"
      :msg.includes("house_level_changed")?"house_level_changed"
      :msg.includes("house_max_level")?"house_max_level"
      :"house_action_failed";
    console.error("house action",e);
    return NextResponse.json({ok:false,error:mapped},{status:400});
  }
}
