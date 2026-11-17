-- Run this after supabase-setup.sql.
create or replace function public.admin_mark_gift_bought(p_gift_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_christmas_admin() then raise exception 'Admin access required'; end if;
 insert into public.gift_holds(gift_id,status,hold_kind,guest_name,token_hash,expires_at,updated_at)
 values(p_gift_id,'bought',null,null,null,null,now())
 on conflict(gift_id) do update set status='bought',hold_kind=null,token_hash=null,expires_at=null,updated_at=now();
end; $$;
grant execute on function public.admin_mark_gift_bought(uuid) to authenticated;
