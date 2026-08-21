create extension if not exists pg_trgm with schema extensions;

alter table public.profiles add column if not exists email text;

update public.profiles p
set email = lower(u.email)
from auth.users u
where u.id = p.id and u.email is not null
  and p.email is distinct from lower(u.email);

create unique index if not exists profiles_email_lower_unique
  on public.profiles (lower(email)) where email is not null;
create index if not exists profiles_email_trgm_idx
  on public.profiles using gin (lower(email) extensions.gin_trgm_ops)
  where email is not null;
create index if not exists profiles_display_name_trgm_idx
  on public.profiles using gin (lower(display_name) extensions.gin_trgm_ops);

create or replace function public.populate_profile_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email is null then
    select lower(u.email) into new.email from auth.users u where u.id = new.id;
  else
    new.email := lower(new.email);
  end if;
  return new;
end;
$$;
revoke all on function public.populate_profile_email() from public, anon, authenticated;
drop trigger if exists profiles_populate_email on public.profiles;
create trigger profiles_populate_email before insert or update of id, email on public.profiles
for each row execute function public.populate_profile_email();

create or replace function public.sync_profile_email_from_auth()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = lower(new.email)
  where id = new.id and email is distinct from lower(new.email);
  return new;
end;
$$;
revoke all on function public.sync_profile_email_from_auth() from public, anon, authenticated;
drop trigger if exists auth_user_sync_profile_email on auth.users;
create trigger auth_user_sync_profile_email after insert or update of email on auth.users
for each row execute function public.sync_profile_email_from_auth();

create or replace function public.search_admin_profiles(
  search_term text, page_size integer default 50, page_offset integer default 0
)
returns table (
  id uuid, email text, display_name text, role public.app_role,
  is_active boolean, created_at timestamptz, total_count bigint
)
language sql stable security invoker set search_path = '' as $$
  select p.id, coalesce(p.email, ''), p.display_name, p.role, p.is_active,
    p.created_at, count(*) over()
  from public.profiles p
  where nullif(pg_catalog.btrim(search_term), '') is null
    or lower(coalesce(p.email, '')) like '%' || lower(pg_catalog.btrim(search_term)) || '%'
    or lower(p.display_name) like '%' || lower(pg_catalog.btrim(search_term)) || '%'
    or p.role::text = lower(pg_catalog.btrim(search_term))
  order by p.created_at desc, p.id desc
  limit least(greatest(page_size, 1), 200) offset greatest(page_offset, 0);
$$;
revoke all on function public.search_admin_profiles(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.search_admin_profiles(text, integer, integer) to service_role;

create unique index if not exists flavors_one_featured_per_product
  on public.flavors (product_id) where is_featured;

create or replace function public.reorder_catalog_items(
  resource_name text, ordered_ids uuid[], start_order integer default 0
)
returns void language plpgsql security definer set search_path = '' as $$
declare updated_count integer;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and p.is_active
  ) then
    raise exception 'active administrator access is required'
      using errcode = 'insufficient_privilege';
  end if;
  if resource_name not in ('brands', 'categories', 'products', 'flavors') then
    raise exception 'unsupported catalog resource' using errcode = 'invalid_parameter_value';
  end if;
  if ordered_ids is null or cardinality(ordered_ids) = 0
    or (select count(distinct value) from unnest(ordered_ids) value) <> cardinality(ordered_ids) then
    raise exception 'ordered_ids must contain unique identifiers'
      using errcode = 'invalid_parameter_value';
  end if;
  if resource_name = 'flavors' and (
    select count(distinct f.product_id) from public.flavors f where f.id = any(ordered_ids)
  ) <> 1 then
    raise exception 'flavors must belong to one product' using errcode = 'check_violation';
  end if;

  if resource_name = 'brands' then
    update public.brands target
    set display_order = start_order + ((input.ordinality - 1) * 10)::integer
    from unnest(ordered_ids) with ordinality input(id, ordinality)
    where target.id = input.id;
  elsif resource_name = 'categories' then
    update public.categories target
    set display_order = start_order + ((input.ordinality - 1) * 10)::integer
    from unnest(ordered_ids) with ordinality input(id, ordinality)
    where target.id = input.id;
  elsif resource_name = 'products' then
    update public.products target
    set display_order = start_order + ((input.ordinality - 1) * 10)::integer
    from unnest(ordered_ids) with ordinality input(id, ordinality)
    where target.id = input.id;
  else
    update public.flavors target
    set display_order = start_order + ((input.ordinality - 1) * 10)::integer
    from unnest(ordered_ids) with ordinality input(id, ordinality)
    where target.id = input.id;
  end if;
  get diagnostics updated_count = row_count;
  if updated_count <> cardinality(ordered_ids) then
    raise exception 'one or more catalog items were not found'
      using errcode = 'foreign_key_violation';
  end if;
end;
$$;
revoke all on function public.reorder_catalog_items(text, uuid[], integer) from public, anon;
grant execute on function public.reorder_catalog_items(text, uuid[], integer) to authenticated;
