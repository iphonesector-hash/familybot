import {createClient} from "@supabase/supabase-js";

function db(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error("Family Core database is not configured");
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}

async function me(familyId:string,userId:number){
  const r=await db().from("members").select("id,display_name,first_name").eq("family_id",familyId).eq("bale_user_id",userId).single();
  if(r.error)throw r.error;
  return r.data;
}

function norm(v:unknown){return String(v||"").trim().replace(/ي/g,"ی").replace(/ك/g,"ک").toLocaleLowerCase("fa-IR")}

export async function createTwentyQuestionsGame(familyId:string,userId:number,input:{secret?:string;hint?:string}){
  const s=db(),m=await me(familyId,userId),secret=norm(input.secret),hint=String(input.hint||"").trim().slice(0,120);
  if(secret.length<2||secret.length>80)throw new Error("twenty_secret_required");
  const g=await s.from("multiplayer_games").insert({family_id:familyId,host_member_id:m.id,game_type:"twenty_questions",public_state:{hint,questionLimit:20},secret_state:{secret},status:"lobby"}).select("id,status,host_member_id,public_state,created_at").single();
  if(g.error)throw g.error;
  const p=await s.from("multiplayer_players").insert({game_id:g.data.id,member_id:m.id});
  if(p.error)throw p.error;
  return g.data;
}

export async function joinTwentyQuestionsGame(familyId:string,userId:number,gameId:string){
  const s=db(),m=await me(familyId,userId);
  const g=await s.from("multiplayer_games").select("id,status").eq("id",gameId).eq("family_id",familyId).eq("game_type","twenty_questions").single();
  if(g.error)throw g.error;
  if(!["lobby","active"].includes(g.data.status))throw new Error("twenty_game_closed");
  const p=await s.from("multiplayer_players").upsert({game_id:gameId,member_id:m.id},{onConflict:"game_id,member_id"});
  if(p.error)throw p.error;
  return{joined:true};
}

export async function startTwentyQuestionsGame(familyId:string,userId:number,gameId:string){
  const s=db(),m=await me(familyId,userId);
  const g=await s.from("multiplayer_games").select("id,status,host_member_id").eq("id",gameId).eq("family_id",familyId).eq("game_type","twenty_questions").single();
  if(g.error)throw g.error;
  if(g.data.host_member_id!==m.id)throw new Error("twenty_host_only");
  if(g.data.status!=="lobby")throw new Error("twenty_game_started");
  const players=await s.from("multiplayer_players").select("member_id",{count:"exact",head:true}).eq("game_id",gameId);
  if(players.error)throw players.error;
  if((players.count||0)<2)throw new Error("twenty_needs_two_players");
  const up=await s.from("multiplayer_games").update({status:"active",started_at:new Date().toISOString()}).eq("id",gameId).eq("status","lobby");
  if(up.error)throw up.error;
  return{started:true};
}

export async function askTwentyQuestion(familyId:string,userId:number,gameId:string,question:string){
  const s=db(),m=await me(familyId,userId),q=String(question||"").trim().slice(0,240);
  if(!q)throw new Error("twenty_question_required");
  const g=await s.from("multiplayer_games").select("id,status,host_member_id").eq("id",gameId).eq("family_id",familyId).eq("game_type","twenty_questions").single();
  if(g.error)throw g.error;
  if(g.data.status!=="active")throw new Error("twenty_not_active");
  if(g.data.host_member_id===m.id)throw new Error("twenty_host_cannot_ask");
  const joined=await s.from("multiplayer_players").select("member_id").eq("game_id",gameId).eq("member_id",m.id).maybeSingle();
  if(joined.error)throw joined.error;
  if(!joined.data)throw new Error("twenty_join_required");
  const count=await s.from("multiplayer_questions").select("id",{count:"exact",head:true}).eq("game_id",gameId);
  if(count.error)throw count.error;
  if((count.count||0)>=20)throw new Error("twenty_question_limit");
  const ins=await s.from("multiplayer_questions").insert({game_id:gameId,asker_member_id:m.id,question:q}).select("id,question,asked_at").single();
  if(ins.error)throw ins.error;
  return ins.data;
}

export async function answerTwentyQuestion(familyId:string,userId:number,gameId:string,questionId:string,answer:"yes"|"no"|"maybe"){
  const s=db(),m=await me(familyId,userId);
  const g=await s.from("multiplayer_games").select("id,status,host_member_id").eq("id",gameId).eq("family_id",familyId).eq("game_type","twenty_questions").single();
  if(g.error)throw g.error;
  if(g.data.host_member_id!==m.id)throw new Error("twenty_host_only");
  if(g.data.status!=="active")throw new Error("twenty_not_active");
  if(!["yes","no","maybe"].includes(answer))throw new Error("twenty_invalid_answer");
  const up=await s.from("multiplayer_questions").update({answer,answered_at:new Date().toISOString()}).eq("id",questionId).eq("game_id",gameId).is("answer",null).select("id").maybeSingle();
  if(!up.data)throw new Error("twenty_already_answered");
  return{answered:true};
}

export async function guessTwentyQuestions(familyId:string,userId:number,gameId:string,guess:string){
  const s=db(),m=await me(familyId,userId),value=norm(guess);
  if(!value)throw new Error("twenty_guess_required");
  const g=await s.from("multiplayer_games").select("id,status,host_member_id,secret_state,public_state").eq("id",gameId).eq("family_id",familyId).eq("game_type","twenty_questions").single();
  if(g.error)throw g.error;
  if(!["active","finished"].includes(g.data.status))throw new Error("twenty_not_active");
  if(g.data.host_member_id===m.id)throw new Error("twenty_host_cannot_guess");
  const joined=await s.from("multiplayer_players").select("member_id").eq("game_id",gameId).eq("member_id",m.id).maybeSingle();
  if(joined.error)throw joined.error;
  if(!joined.data)throw new Error("twenty_join_required");
  const secret=norm((g.data.secret_state as {secret?:unknown}|null)?.secret);
  if(value!==secret)return{correct:false};
  if(g.data.status==="finished"&&String((g.data.public_state as {winnerMemberId?:unknown}|null)?.winnerMemberId||"")!==m.id)throw new Error("twenty_game_closed");
  const settled=await s.rpc("family_finish_twenty_questions_atomic",{p_family_id:familyId,p_game_id:gameId,p_winner_member_id:m.id,p_reward:30});
  if(settled.error)throw settled.error;
  const row=(settled.data||{}) as {reward?:number;alreadyRewarded?:boolean;coins?:number};
  return{correct:true,reward:Number(row.reward||0),alreadyRewarded:Boolean(row.alreadyRewarded),coins:Number(row.coins||0)};
}

export async function finishTwentyQuestionsGame(familyId:string,userId:number,gameId:string){
  const s=db(),m=await me(familyId,userId);
  const g=await s.from("multiplayer_games").select("id,status,host_member_id,secret_state").eq("id",gameId).eq("family_id",familyId).eq("game_type","twenty_questions").single();
  if(g.error)throw g.error;
  if(g.data.host_member_id!==m.id)throw new Error("twenty_host_only");
  if(g.data.status!=="active")throw new Error("twenty_not_active");
  const up=await s.from("multiplayer_games").update({status:"finished",finished_at:new Date().toISOString()}).eq("id",gameId).eq("status","active").select("id").maybeSingle();
  if(!up.data)throw new Error("twenty_game_closed");
  return{finished:true,secret:(g.data.secret_state as {secret?:unknown}|null)?.secret||""};
}

export async function readTwentyQuestionsGames(familyId:string,userId:number){
  const s=db(),m=await me(familyId,userId);
  const games=await s.from("multiplayer_games").select("id,status,host_member_id,public_state,created_at,started_at,finished_at").eq("family_id",familyId).eq("game_type","twenty_questions").order("created_at",{ascending:false}).limit(12);
  if(games.error)throw games.error;
  const ids=(games.data||[]).map(g=>g.id);
  if(!ids.length)return{me:m,games:[]};
  const [players,questions]=await Promise.all([
    s.from("multiplayer_players").select("game_id,member_id,members!multiplayer_players_member_id_fkey(display_name,first_name)").in("game_id",ids),
    s.from("multiplayer_questions").select("id,game_id,asker_member_id,question,answer,asked_at,answered_at").in("game_id",ids).order("asked_at",{ascending:true})
  ]);
  if(players.error)throw players.error;
  if(questions.error)throw questions.error;
  return{me:m,games:(games.data||[]).map(g=>{
    const ps=(players.data||[]).filter(p=>p.game_id===g.id),qs=(questions.data||[]).filter(q=>q.game_id===g.id);
    return{...g,players:ps.map(p=>({member_id:p.member_id,name:(p.members as any)?.display_name||(p.members as any)?.first_name||"عضو"})),joined:ps.some(p=>p.member_id===m.id),isHost:g.host_member_id===m.id,questions:qs.map(q=>({...q,askerName:ps.find(p=>p.member_id===q.asker_member_id)?((ps.find(p=>p.member_id===q.asker_member_id)!.members as any)?.display_name||(ps.find(p=>p.member_id===q.asker_member_id)!.members as any)?.first_name||"عضو"):"عضو"}))};
  })};
}
