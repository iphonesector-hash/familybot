import { NextRequest,NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminSession";
import { readAdminStats } from "@/lib/adminSettings";
function sessionFrom(req:NextRequest){const auth=req.headers.get("authorization")||"";const token=auth.startsWith("Bearer ")?auth.slice(7):req.nextUrl.searchParams.get("session")||"";return token?verifyAdminSession(token):null}
export async function GET(req:NextRequest){try{const session=sessionFrom(req);if(!session)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});return NextResponse.json({ok:true,stats:await readAdminStats(session.familyId)});}catch(error){console.error(error);return NextResponse.json({ok:false,error:"stats_unavailable"},{status:500})}}
