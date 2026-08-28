import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminSession";
import { readModerationLog } from "@/lib/adminSettings";

function sessionFrom(req:NextRequest){const auth=req.headers.get("authorization")||"";const token=auth.startsWith("Bearer ")?auth.slice(7):req.nextUrl.searchParams.get("session")||"";return token?verifyAdminSession(token):null}
export async function GET(req:NextRequest){try{const session=sessionFrom(req);if(!session)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});const limit=Math.max(1,Math.min(100,Number(req.nextUrl.searchParams.get("limit"))||30));const rows=await readModerationLog(session.familyId,limit);return NextResponse.json({ok:true,rows,expiresAt:session.exp});}catch(error){console.error(error);return NextResponse.json({ok:false,error:"logs_unavailable"},{status:500})}}
