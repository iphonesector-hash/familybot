import { NextRequest,NextResponse } from "next/server";
import { verifyFamilySession } from "@/lib/familySession";
import { addShoppingItem,createExpense,readFinance,settleExpenseShare,toggleShoppingItem } from "@/lib/familyFinance";

function sessionFrom(req:NextRequest){const auth=req.headers.get("authorization")||"";return auth.startsWith("Bearer ")?verifyFamilySession(auth.slice(7)):null}

export async function GET(req:NextRequest){try{const session=sessionFrom(req);if(!session)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});return NextResponse.json({ok:true,data:await readFinance(session.familyId,session.userId)})}catch(error){console.error("finance read failed",error);return NextResponse.json({ok:false,error:"finance_unavailable"},{status:500})}}

export async function POST(req:NextRequest){try{const session=sessionFrom(req);if(!session)return NextResponse.json({ok:false,error:"unauthorized"},{status:401});const body=await req.json();const action=String(body?.action||"");const input=(body?.payload||{}) as Record<string,unknown>;let data:unknown;
  if(action==="expense.create")data=await createExpense(session.familyId,session.userId,input);
  else if(action==="expense.settle")data=await settleExpenseShare(session.familyId,session.userId,String(input.expenseId||""));
  else if(action==="shopping.add")data=await addShoppingItem(session.familyId,session.userId,input);
  else if(action==="shopping.toggle")data=await toggleShoppingItem(session.familyId,String(input.itemId||""),Boolean(input.done));
  else return NextResponse.json({ok:false,error:"unknown_action"},{status:400});
  return NextResponse.json({ok:true,data});
}catch(error){console.error("finance action failed",error);return NextResponse.json({ok:false,error:error instanceof Error?error.message:"finance_action_failed"},{status:500})}}
