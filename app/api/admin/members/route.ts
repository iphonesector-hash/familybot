import { NextRequest,NextResponse } from "next/server";
import { requireLiveAdmin } from "@/lib/adminAuth";
import { readAdminMembers } from "@/lib/adminMembers";

export async function GET(req:NextRequest){try{const session=await requireLiveAdmin(req);if(!session)return NextResponse.json({ok:false,error:"admin_required"},{status:403});return NextResponse.json({ok:true,rows:await readAdminMembers(session.familyId)});}catch(error){console.error(error);return NextResponse.json({ok:false,error:"members_unavailable"},{status:500})}}
