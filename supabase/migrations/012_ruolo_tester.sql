-- 012 · Ruolo "tester" + chiusura di due porte che permettevano di diventare admin da soli.
-- Si esegue UNA volta nel progetto di Garofalo: SQL Editor -> New query -> Run. Si può rieseguire senza danni.

-- 1) Il ruolo "tester": vede tutte le schermate dell'admin, ma non modifica nulla e non vede i dati personali dei clienti.
alter type user_role add value if not exists 'tester';

-- 2) Chi si registra è SEMPRE cliente. Prima il ruolo si leggeva dai dati inviati dalla persona al momento dell'iscrizione:
--    chiunque poteva chiedere "admin". Gli admin e i tester li decide solo chi ha la chiave del progetto (Eliseo, da qui).
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      nullif(new.raw_user_meta_data->>'given_name', ''),
      ''
    )), ''),
    'customer'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- 3) Nessuno può cambiare il proprio ruolo dal browser. Prima la regola "aggiorna il tuo profilo" lasciava cambiare anche il ruolo.
--    Dal SQL Editor e dal server con la chiave segreta si può ancora (lì non c'è un utente collegato).
create or replace function public.profiles_blocca_ruolo()
returns trigger as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null then
    new.role := old.role;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists profiles_blocca_ruolo on public.profiles;
create trigger profiles_blocca_ruolo before update on public.profiles
  for each row execute function public.profiles_blocca_ruolo();
