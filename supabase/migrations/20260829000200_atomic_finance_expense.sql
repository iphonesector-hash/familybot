create or replace function family_create_expense_atomic(
  p_family_id uuid,
  p_creator_member_id uuid,
  p_title text,
  p_amount bigint,
  p_category text,
  p_notes text,
  p_spent_at timestamptz,
  p_participant_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
  v_expense_id uuid;
  v_base bigint;
  v_rem bigint;
  v_id uuid;
  v_share bigint;
begin
  if coalesce(length(trim(p_title)), 0) = 0 then raise exception 'expense_title_required'; end if;
  if p_amount <= 0 then raise exception 'expense_amount_required'; end if;

  if not exists(select 1 from members where id=p_creator_member_id and family_id=p_family_id) then
    raise exception 'member_not_found';
  end if;

  select coalesce(array_agg(id order by id), array[]::uuid[])
    into v_ids
  from members
  where family_id=p_family_id and id=any(p_participant_ids);

  if cardinality(v_ids)=0 then raise exception 'expense_participants_required'; end if;
  if cardinality(v_ids)<>cardinality(p_participant_ids) then raise exception 'invalid_expense_participant'; end if;

  insert into family_expenses(
    family_id, creator_member_id, payer_member_id, title, amount, category, notes, spent_at
  ) values (
    p_family_id,
    p_creator_member_id,
    p_creator_member_id,
    left(trim(p_title),160),
    p_amount,
    nullif(left(trim(coalesce(p_category,'')),60),''),
    nullif(left(trim(coalesce(p_notes,'')),500),''),
    coalesce(p_spent_at,now())
  ) returning id into v_expense_id;

  v_base := p_amount / cardinality(v_ids);
  v_rem := p_amount - (v_base * cardinality(v_ids));

  foreach v_id in array v_ids loop
    v_share := v_base + case when v_rem > 0 then 1 else 0 end;
    if v_rem > 0 then v_rem := v_rem - 1; end if;
    insert into expense_splits(expense_id,member_id,share_amount,settled,settled_at)
    values(
      v_expense_id,
      v_id,
      v_share,
      v_id=p_creator_member_id,
      case when v_id=p_creator_member_id then now() else null end
    );
  end loop;

  return jsonb_build_object(
    'id',v_expense_id,
    'title',left(trim(p_title),160),
    'amount',p_amount,
    'spent_at',coalesce(p_spent_at,now()),
    'payer_member_id',p_creator_member_id
  );
end;
$$;
