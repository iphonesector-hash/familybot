import { NextRequest, NextResponse } from "next/server";
import { dispatchDueReminders } from "@/lib/reminders";

function authorized(req:NextRequest){const expected=process.env.CRON_SECRET;if(!expected)return false;const auth=req.headers.get("authorization")||"";return auth===`Bearer ${expected}`||req.nextUrl.searchParams.get("secret")===expected}

export async function GET(req:NextRequest){if(!authorized(req))return NextResponse.json({ok:false,error:"unauthorized"},{status:401});try{return NextResponse.json({ok:true,...await dispatchDueReminders()})}catch(error){console.error("reminder cron failed",error);return NextResponse.json({ok:false,error:error instanceof Error?error.message:"reminder_failed"},{status:500})}}
