create extension if not exists pgcrypto;
create table if not exists public.gifts (
 id uuid primary key default gen_random_uuid(),
 name text not null check(char_length(name) between 1 and 100),
 description text not null default '',
 price numeric(10,2) not null default 0 check(price>=0),
 supplier text not null default '',
 url text not null,
 image_url text,
 inspiration text not null default '',
 created_at timestamptz not null default now()
);
create table if not exists public.gift_holds (
 gift_id uuid primary key references public.gifts(id) on delete cascade,
 status text not null check(status in ('held','bought')),
 hold_kind text check(hold_kind in ('purchase','maybe')),
 guest_name text,
 token_hash text,
 expires_at timestamptz,
 updated_at timestamptz not null default now(),
 constraint bought_has_no_expiry check(status <> 'bought' or expires_at is null)
);
alter table public.gifts enable row level security;
alter table public.gift_holds enable row level security;
create or replace function public.is_christmas_admin()
returns boolean language sql stable security definer set search_path = '' as $$
 select coalesce((auth.jwt()->'app_metadata'->>'role')='admin',false);
$$;
drop policy if exists "Anyone can view gifts" on public.gifts;
create policy "Anyone can view gifts" on public.gifts for select to anon,authenticated using(true);
drop policy if exists "Admins can add gifts" on public.gifts;
create policy "Admins can add gifts" on public.gifts for insert to authenticated with check(public.is_christmas_admin());
drop policy if exists "Admins can edit gifts" on public.gifts;
create policy "Admins can edit gifts" on public.gifts for update to authenticated using(public.is_christmas_admin()) with check(public.is_christmas_admin());
drop policy if exists "Admins can delete gifts" on public.gifts;
create policy "Admins can delete gifts" on public.gifts for delete to authenticated using(public.is_christmas_admin());
revoke all on public.gift_holds from anon,authenticated;
grant select,insert,update,delete on public.gifts to anon,authenticated;
create or replace function public.get_public_gift_statuses()
returns table(gift_id uuid,status text,expires_at timestamptz)
language sql stable security definer set search_path = '' as $$
 select h.gift_id,
 case when h.status='held' and h.expires_at<=now() then 'available' else h.status end,
 case when h.status='held' and h.expires_at<=now() then null else h.expires_at end
 from public.gift_holds h;
$$;
grant execute on function public.get_public_gift_statuses() to anon,authenticated;
create or replace function public.reserve_gift(p_gift_id uuid,p_kind text,p_guest_name text,p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_expires timestamptz := now()+interval '24 hours';
begin
 if p_kind not in ('purchase','maybe') then raise exception 'Invalid reservation type'; end if;
 if p_token is null or length(p_token)<32 then raise exception 'Invalid reservation token'; end if;
 if not exists(select 1 from public.gifts where id=p_gift_id) then raise exception 'Gift not found'; end if;
 insert into public.gift_holds(gift_id,status,hold_kind,guest_name,token_hash,expires_at,updated_at)
 values(p_gift_id,'held',p_kind,left(coalesce(p_guest_name,''),50),encode(extensions.digest(p_token,'sha256'),'hex'),v_expires,now())
 on conflict(gift_id) do update set status='held',hold_kind=excluded.hold_kind,
 guest_name=excluded.guest_name,token_hash=excluded.token_hash,expires_at=excluded.expires_at,updated_at=now()
 where public.gift_holds.status='held' and public.gift_holds.expires_at<=now();
 if not found then raise exception 'This gift is already on hold or has been bought'; end if;
 return jsonb_build_object('status','held','expires_at',v_expires);
end; $$;
grant execute on function public.reserve_gift(uuid,text,text,text) to anon,authenticated;
create or replace function public.mark_gift_bought(p_gift_id uuid,p_token text)
returns void language plpgsql security definer set search_path = '' as $$
begin
 update public.gift_holds set status='bought',hold_kind=null,token_hash=null,expires_at=null,updated_at=now()
 where gift_id=p_gift_id and status='held'
 and token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and expires_at>now();
 if not found then raise exception 'This hold is expired or the reservation token does not match'; end if;
end; $$;
grant execute on function public.mark_gift_bought(uuid,text) to anon,authenticated;
-- Create your user in Authentication > Users, then replace the UUID below and run:
-- update auth.users set raw_app_meta_data=coalesce(raw_app_meta_data,'{}'::jsonb)||'{"role":"admin"}'::jsonb
-- where id='YOUR-USER-UUID';
-- Sign out and back in to refresh the admin role in your session.
