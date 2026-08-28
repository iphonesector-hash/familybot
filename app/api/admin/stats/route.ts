import { NextRequest,NextResponse } from "next/server";
import { requireLiveAdmin } from "@/lib/adminAuth";
import { readAdminStats } from "@/lib/adminSettings";
export async function GET(req:NextRequest){try{const session=await requireLiveAdmin(req);if(!session)return NextResponse.json({ok:false,error:"admin_required"},{status:403});return NextResponse.json({ok:true,stats:await readAdminStats(session.familyId)});}catch(error){console.error(error);return NextResponse.json({ok:false,error:"stats_unavailable"},{status:500})}}
