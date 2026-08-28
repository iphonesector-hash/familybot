import { NextRequest, NextResponse } from "next/server";
import { readAdminSettings, writeAdminSettings } from "@/lib/adminSettings";
import { verifyAdminSession } from "@/lib/adminSession";

function sessionFrom(req:NextRequest){const auth=req.headers.get("authorization")||"";const token=auth.startsWith("Bearer ")?auth.slice(7):req.nextUrl.searchParams.get("session")||"";return token?verifyAdminSession(token):null}
export async function GET(req:NextRequest){try{const session=sessionFrom(req);if(!session)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});const settings=await readAdminSettings(session.familyId);return NextResponse.json({ok:true,settings,expiresAt:session.exp});}catch(error){console.error(error);return NextResponse.json({ok:false,error:"settings_unavailable"},{status:500})}}
export async function PUT(req:NextRequest){try{const session=sessionFrom(req);if(!session)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});const input=await req.json();const settings=await writeAdminSettings(session.familyId,input);return NextResponse.json({ok:true,settings});}catch(error){console.error(error);return NextResponse.json({ok:false,error:"settings_update_failed"},{status:500})}}
