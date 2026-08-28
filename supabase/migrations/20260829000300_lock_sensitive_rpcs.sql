-- Critical Family Bot mutation RPCs are server-only. The browser never needs
-- direct EXECUTE permission because all calls are made with the Supabase
-- service-role client after Bale/Family session authorization.
do $$
declare
  v_sig text;
  v_functions text[] := array[
    'public.family_add_member_coins(uuid,bigint)',
    'public.family_add_member_xp(uuid,integer)',
    'public.family_claim_daily_atomic(uuid,uuid,date,integer)',
    'public.family_complete_task_atomic(uuid,uuid,uuid)',
    'public.family_purchase_item_atomic(uuid,uuid,text,text,text,integer)',
    'public.family_transfer_coins_atomic(uuid,uuid,uuid,bigint)',
    'public.family_claim_daily_spin_atomic(uuid,uuid,text,integer)',
    'public.family_owner_gift_atomic(uuid,uuid,uuid,text,integer,text)',
    'public.family_claim_achievement_atomic(uuid,uuid,text)',
    'public.family_claim_mission_atomic(uuid,uuid,text,text,integer)',
    'public.family_complete_challenge_atomic(uuid,uuid,uuid)',
    'public.family_create_expense_atomic(uuid,uuid,text,bigint,text,text,timestamp with time zone,uuid[])'
  ];
begin
  foreach v_sig in array v_functions loop
    if to_regprocedure(v_sig) is not null then
      execute format('revoke all privileges on function %s from public', v_sig);
      execute format('revoke all privileges on function %s from anon', v_sig);
      execute format('revoke all privileges on function %s from authenticated', v_sig);
      execute format('grant execute on function %s to service_role', v_sig);
    end if;
  end loop;
end;
$$;
