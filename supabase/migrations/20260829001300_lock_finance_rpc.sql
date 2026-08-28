do $$
begin
  if to_regprocedure('public.family_create_expense_atomic(uuid,uuid,text,bigint,text,text,timestamp with time zone,uuid[])') is not null then
    revoke all privileges on function public.family_create_expense_atomic(uuid,uuid,text,bigint,text,text,timestamp with time zone,uuid[]) from public;
    revoke all privileges on function public.family_create_expense_atomic(uuid,uuid,text,bigint,text,text,timestamp with time zone,uuid[]) from anon;
    revoke all privileges on function public.family_create_expense_atomic(uuid,uuid,text,bigint,text,text,timestamp with time zone,uuid[]) from authenticated;
    grant execute on function public.family_create_expense_atomic(uuid,uuid,text,bigint,text,text,timestamp with time zone,uuid[]) to service_role;
  end if;
end;
$$;
