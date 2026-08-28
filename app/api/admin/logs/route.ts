import { NextRequest, NextResponse } from "next/server";
import { requireLiveAdmin } from "@/lib/adminAuth";
import { readModerationLog } from "@/lib/adminSettings";

export async function GET(req:NextRequest){try{const session=await requireLiveAdmin(req);if(!session)return NextResponse.json({ok:false,error:"admin_required"},{status:403});const limit=Math.max(1,Math.min(100,Number(req.nextUrl.searchParams.get("limit"))||30));const rows=await readModerationLog(session.familyId,limit);return NextResponse.json({ok:true,rows,expiresAt:session.exp});}catch(error){console.error(error);return NextResponse.json({ok:false,error:"logs_unavailable"},{status:500})}}
