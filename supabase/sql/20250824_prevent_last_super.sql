create or replace function public.prevent_last_super_admin()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'UPDATE' and OLD.role = 'super_admin' and NEW.role <> 'super_admin' then
    if (select count(*) from public.users where role = 'super_admin' and id <> OLD.id) = 0 then
      raise exception 'Cannot demote the last super_admin';
    end if;
  end if;
  if TG_OP = 'DELETE' and OLD.role = 'super_admin' then
    if (select count(*) from public.users where role = 'super_admin' and id <> OLD.id) = 0 then
      raise exception 'Cannot delete the last super_admin';
    end if;
  end if;
  return case when TG_OP='DELETE' then OLD else NEW end;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger t join pg_class c on c.oid=t.tgrelid
    where t.tgname = 'trg_prevent_last_super_admin_update' and c.relname = 'users'
  ) then
    create trigger trg_prevent_last_super_admin_update
    before update on public.users
    for each row execute function public.prevent_last_super_admin();
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger t join pg_class c on c.oid=t.tgrelid
    where t.tgname = 'trg_prevent_last_super_admin_delete' and c.relname = 'users'
  ) then
    create trigger trg_prevent_last_super_admin_delete
    before delete on public.users
    for each row execute function public.prevent_last_super_admin();
  end if;
end $$;
