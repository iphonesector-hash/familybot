import { createClient } from "@supabase/supabase-js";

function db(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Family Core database is not configured");return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}
async function member(familyId:string,userId:number){const r=await db().from("members").select("id,display_name,first_name").eq("family_id",familyId).eq("bale_user_id",userId).single();if(r.error)throw r.error;return r.data}

export async function readFinance(familyId:string,userId:number){
  const s=db();const me=await member(familyId,userId);const [members,expenses,shopping]=await Promise.all([
    s.from("members").select("id,bale_user_id,display_name,first_name").eq("family_id",familyId).order("display_name"),
    s.from("family_expenses").select("id,title,amount,category,notes,spent_at,payer_member_id,creator_member_id,expense_splits(member_id,share_amount,settled,settled_at)").eq("family_id",familyId).order("spent_at",{ascending:false}).limit(50),
    s.from("shopping_items").select("id,title,quantity,done,assigned_member_id,created_at,completed_at").eq("family_id",familyId).order("done",{ascending:true}).order("created_at",{ascending:false}).limit(100)
  ]);if(members.error)throw members.error;if(expenses.error)throw expenses.error;if(shopping.error)throw shopping.error;
  let owedByMe=0,owedToMe=0;for(const e of expenses.data||[]){for(const split of (e.expense_splits||[]) as Array<{member_id:string;share_amount:number;settled:boolean}>){if(split.settled)continue;if(split.member_id===me.id&&e.payer_member_id!==me.id)owedByMe+=Number(split.share_amount||0);if(e.payer_member_id===me.id&&split.member_id!==me.id)owedToMe+=Number(split.share_amount||0)}}
  return{me,members:members.data||[],expenses:expenses.data||[],shopping:shopping.data||[],summary:{owedByMe,owedToMe,balance:owedToMe-owedByMe}};
}

export async function createExpense(familyId:string,userId:number,input:{title?:string;amount?:number;category?:string;notes?:string;participantMemberIds?:string[];spentAt?:string}){
  const s=db();const me=await member(familyId,userId);const title=String(input.title||"").trim().slice(0,160);const amount=Math.round(Number(input.amount)||0);if(!title||amount<=0)throw new Error("expense_title_and_amount_required");
  const requested=Array.from(new Set((input.participantMemberIds||[]).map(String).filter(Boolean)));if(!requested.length)requested.push(me.id);
  const valid=await s.from("members").select("id").eq("family_id",familyId).in("id",requested);if(valid.error)throw valid.error;const ids=(valid.data||[]).map(x=>x.id);if(ids.length!==requested.length)throw new Error("invalid_expense_participant");if(!ids.length)throw new Error("expense_participants_required");
  const result=await s.rpc("family_create_expense_atomic",{p_family_id:familyId,p_creator_member_id:me.id,p_title:title,p_amount:amount,p_category:String(input.category||"").trim().slice(0,60)||null,p_notes:String(input.notes||"").trim().slice(0,500)||null,p_spent_at:input.spentAt||null,p_participant_ids:ids});if(result.error)throw result.error;return result.data;
}

export async function settleExpenseShare(familyId:string,userId:number,expenseId:string){
  const s=db();const me=await member(familyId,userId);const expense=await s.from("family_expenses").select("id").eq("id",expenseId).eq("family_id",familyId).single();if(expense.error)throw expense.error;const r=await s.from("expense_splits").update({settled:true,settled_at:new Date().toISOString()}).eq("expense_id",expenseId).eq("member_id",me.id).select("expense_id,member_id,share_amount,settled").single();if(r.error)throw r.error;return r.data;
}

export async function addShoppingItem(familyId:string,userId:number,input:{title?:string;quantity?:string;assignedMemberId?:string|null}){
  const s=db();const me=await member(familyId,userId);const title=String(input.title||"").trim().slice(0,160);if(!title)throw new Error("shopping_title_required");let assigned:string|null=null;if(input.assignedMemberId){const q=await s.from("members").select("id").eq("id",String(input.assignedMemberId)).eq("family_id",familyId).single();if(q.error)throw q.error;assigned=q.data.id}
  const r=await s.from("shopping_items").insert({family_id:familyId,creator_member_id:me.id,assigned_member_id:assigned,title,quantity:String(input.quantity||"").trim().slice(0,80)||null}).select("id,title,quantity,done,assigned_member_id,created_at").single();if(r.error)throw r.error;return r.data;
}

export async function toggleShoppingItem(familyId:string,itemId:string,done:boolean){const r=await db().from("shopping_items").update({done,completed_at:done?new Date().toISOString():null}).eq("id",itemId).eq("family_id",familyId).select("id,title,quantity,done,assigned_member_id,completed_at").single();if(r.error)throw r.error;return r.data}
