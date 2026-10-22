-- 015 · Ruolo "dipendente".
-- Admin: tutto. Dipendente: come l'admin, senza incassi e profitti.
-- Tester: vede l'area riservata, non modifica, non vede gli incassi, può solo proporre novità.
-- Si esegue una volta nel progetto Garofalo Barberia. Si può rieseguire.

alter type user_role add value if not exists 'dipendente';

-- Un admin collegato può cambiare il ruolo degli altri. Nessuno cambia il proprio da qui.
-- Dal server con la chiave segreta auth.uid() è nullo e il cambio resta consentito.
create or replace function public.profiles_blocca_ruolo()
returns trigger as $$
declare
  actor public.user_role;
begin
  if new.role is not distinct from old.role or auth.uid() is null then
    return new;
  end if;
  select role into actor from public.profiles where id = auth.uid();
  if actor = 'admin' and auth.uid() is distinct from old.id then
    return new;
  end if;
  new.role := old.role;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
