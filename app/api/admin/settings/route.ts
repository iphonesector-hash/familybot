import { NextRequest, NextResponse } from "next/server";
import { readAdminSettings, writeAdminSettings } from "@/lib/adminSettings";
import { requireLiveAdmin } from "@/lib/adminAuth";

export async function GET(req:NextRequest){try{const session=await requireLiveAdmin(req);if(!session)return NextResponse.json({ok:false,error:"admin_required"},{status:403});const settings=await readAdminSettings(session.familyId);return NextResponse.json({ok:true,settings,expiresAt:session.exp});}catch(error){console.error(error);return NextResponse.json({ok:false,error:"settings_unavailable"},{status:500})}}
export async function PUT(req:NextRequest){try{const session=await requireLiveAdmin(req);if(!session)return NextResponse.json({ok:false,error:"admin_required"},{status:403});const input=await req.json();const settings=await writeAdminSettings(session.familyId,input);return NextResponse.json({ok:true,settings});}catch(error){console.error(error);return NextResponse.json({ok:false,error:"settings_update_failed"},{status:500})}}
