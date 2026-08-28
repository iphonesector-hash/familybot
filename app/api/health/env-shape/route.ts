import { NextResponse } from "next/server";

export async function GET(){
  const appDot=process.env.NEXT_PUBLIC_APP_URL||"";
  const appBracket=process.env["NEXT_PUBLIC_APP_URL"]||"";
  const supabaseDot=process.env.NEXT_PUBLIC_SUPABASE_URL||"";
  const supabaseBracket=process.env["NEXT_PUBLIC_SUPABASE_URL"]||"";
  return NextResponse.json({
    appDot,
    appBracket,
    supabaseDot,
    supabaseBracket,
    serviceRole:Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  },{headers:{"cache-control":"no-store","x-robots-tag":"noindex"}});
}
