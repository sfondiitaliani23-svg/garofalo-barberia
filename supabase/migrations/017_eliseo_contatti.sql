-- 017 · Eliseo CRM: Contatti, Modelli, Campagne e Casella (Barberia Garofalo)
-- Stessa architettura, funzioni e tabelle della versione proprietaria di Maurizio Barber Shop.
-- Eseguibile in Supabase SQL Editor senza errori se ripetuto.

-- 1. Tabella Contatti
create table if not exists public.eliseo_contatti (
  id                 uuid primary key default gen_random_uuid(),
  nome               text not null check (char_length(nome) between 1 and 120),
  email              text check (email is null or (char_length(email) <= 200 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')),
  telefono           text check (telefono is null or (char_length(telefono) <= 40 and telefono ~ '^[0-9 +().-]+$')),
  fonte              text not null default 'altro' check (fonte in ('sito', 'whatsapp', 'instagram', 'negozio', 'passaparola', 'treatwell', 'altro')),
  fase               text not null default 'nuovo' check (fase in ('nuovo', 'contattato', 'cliente', 'da_richiamare', 'perso')),
  barbiere           text check (barbiere is null or char_length(barbiere) <= 60),
  consenso_marketing boolean not null default false,
  consenso_il        timestamptz,
  note               text check (note is null or char_length(note) <= 500),
  etichette          text[] not null default '{}' check (cardinality(etichette) <= 10),
  user_id            uuid unique references auth.users(id) on delete set null,
  creato_il          timestamptz not null default now(),
  aggiornato_il      timestamptz not null default now(),
  creato_da          uuid default auth.uid()
);

create unique index if not exists eliseo_contatti_email on public.eliseo_contatti (lower(email)) where email is not null;
create index if not exists eliseo_contatti_fase on public.eliseo_contatti (fase, aggiornato_il desc);
create index if not exists eliseo_contatti_etichette on public.eliseo_contatti using gin (etichette);

-- Trigger aggiornamento date e consenso
create or replace function public.eliseo_contatti_date() returns trigger
language plpgsql as $$
begin
  new.aggiornato_il := now();
  if new.consenso_marketing and (tg_op = 'INSERT' or not old.consenso_marketing) then new.consenso_il := now(); end if;
  if not new.consenso_marketing then new.consenso_il := null; end if;
  if new.email is not null then new.email := lower(trim(new.email)); end if;
  return new;
end $$;

drop trigger if exists eliseo_contatti_date on public.eliseo_contatti;
create trigger eliseo_contatti_date before insert or update on public.eliseo_contatti
  for each row execute function public.eliseo_contatti_date();

alter table public.eliseo_contatti enable row level security;
drop policy if exists eliseo_contatti_staff on public.eliseo_contatti;
create policy eliseo_contatti_staff on public.eliseo_contatti for all to authenticated
  using (public.is_admin() or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'dipendente', 'tester')))
  with check (public.is_admin() or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'dipendente')));

-- 2. Modelli di messaggio
create table if not exists public.eliseo_modelli (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null check (char_length(nome) between 1 and 60),
  categoria      text not null default 'altro' check (categoria in ('benvenuto', 'promemoria', 'follow_up', 'feedback', 'recensione', 'ritorno', 'upsell', 'altro')),
  testo          text not null check (char_length(testo) between 1 and 1000),
  creato_il      timestamptz not null default now(),
  aggiornato_il  timestamptz not null default now()
);

create or replace function public.eliseo_modelli_data() returns trigger
language plpgsql as $$ begin new.aggiornato_il := now(); return new; end $$;
drop trigger if exists eliseo_modelli_data on public.eliseo_modelli;
create trigger eliseo_modelli_data before insert or update on public.eliseo_modelli
  for each row execute function public.eliseo_modelli_data();

alter table public.eliseo_modelli enable row level security;
drop policy if exists eliseo_modelli_staff on public.eliseo_modelli;
create policy eliseo_modelli_staff on public.eliseo_modelli for all to authenticated
  using (public.is_admin() or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'dipendente', 'tester')))
  with check (public.is_admin() or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'dipendente')));

-- Inserimento modelli predefiniti per Barberia Garofalo
insert into public.eliseo_modelli (nome, categoria, testo)
select * from (values
  ('Promemoria appuntamento', 'promemoria', 'Ciao {nome}, ti ricordiamo il tuo appuntamento da Barberia Garofalo. Ti aspettiamo volentieri 👍'),
  ('Come ti trovi?', 'follow_up', 'Ciao {nome}, come ti stai trovando con il taglio o il trattamento fatto da noi a Barberia Garofalo?'),
  ('Feedback', 'feedback', 'Ciao {nome}, come ti sei trovato l''ultima volta con {barbiere}? Per noi il tuo parere è prezioso.'),
  ('Recensione', 'recensione', 'Ciao {nome}, grazie per essere passato da noi! Se ti va, lasciaci una recensione su Google: ci aiuta tanto.'),
  ('È ora di tornare', 'ritorno', 'Ciao {nome}, è passato un po'' dall''ultima visita da Barberia Garofalo. Vuoi che ti teniamo un posto con {barbiere}?'),
  ('Servizio barba', 'upsell', 'Ciao {nome}, al prossimo appuntamento possiamo aggiungere anche il rituale barba con panno caldo.')
) as v(nome, categoria, testo)
where not exists (select 1 from public.eliseo_modelli);

-- 3. Campagne
create table if not exists public.eliseo_campagne (
  id           uuid primary key default gen_random_uuid(),
  creato_il    timestamptz not null default now(),
  nome         text not null check (char_length(nome) between 1 and 80),
  titolo       text not null check (char_length(titolo) between 1 and 60),
  testo        text not null check (char_length(testo) between 1 and 160),
  url          text not null check (url ~ '^/' and char_length(url) <= 200),
  fasi         text[] not null default '{}',
  destinatari  integer not null default 0 check (destinatari >= 0),
  inviati      integer not null default 0 check (inviati >= 0),
  falliti      integer not null default 0 check (falliti >= 0),
  creato_da    uuid default auth.uid()
);

alter table public.eliseo_campagne enable row level security;
drop policy if exists eliseo_campagne_staff on public.eliseo_campagne;
create policy eliseo_campagne_staff on public.eliseo_campagne for all to authenticated
  using (public.is_admin() or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'dipendente', 'tester')))
  with check (public.is_admin() or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'dipendente')));

-- 4. Casella e Richieste
create table if not exists public.eliseo_richieste (
  id         uuid primary key default gen_random_uuid(),
  creato_il  timestamptz not null default now(),
  nome       text not null check (char_length(nome) between 2 and 80),
  contatto   text not null check (char_length(contatto) between 5 and 120),
  motivo     text not null check (motivo in ('informazioni', 'formazione', 'lavoro', 'regalo')),
  messaggio  text not null check (char_length(messaggio) between 10 and 1500)
);

create table if not exists public.eliseo_casella_stato (
  tipo           text not null check (tipo in ('chat', 'richiesta')),
  rif            uuid not null,
  stato          text not null default 'aperta' check (stato in ('aperta', 'in_corso', 'chiusa')),
  assegnato      text check (assegnato is null or char_length(assegnato) <= 60),
  contatto_id    uuid references public.eliseo_contatti(id) on delete set null,
  aggiornato_il  timestamptz not null default now(),
  primary key (tipo, rif)
);

create or replace function public.eliseo_casella_data() returns trigger
language plpgsql as $$ begin new.aggiornato_il := now(); return new; end $$;
drop trigger if exists eliseo_casella_data on public.eliseo_casella_stato;
create trigger eliseo_casella_data before insert or update on public.eliseo_casella_stato
  for each row execute function public.eliseo_casella_data();

alter table public.eliseo_richieste enable row level security;
alter table public.eliseo_casella_stato enable row level security;

drop policy if exists eliseo_richieste_staff on public.eliseo_richieste;
create policy eliseo_richieste_staff on public.eliseo_richieste for all to authenticated
  using (public.is_admin() or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'dipendente', 'tester')));

drop policy if exists eliseo_casella_staff on public.eliseo_casella_stato;
create policy eliseo_casella_staff on public.eliseo_casella_stato for all to authenticated
  using (public.is_admin() or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'dipendente', 'tester')))
  with check (public.is_admin() or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'dipendente')));

-- 5. Copia iscritti del sito
create or replace function public.eliseo_importa_iscritti() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  insert into public.eliseo_contatti (nome, email, user_id, fonte, fase)
  select left(coalesce(nullif(p.full_name, ''), nullif(u.raw_user_meta_data ->> 'name', ''), split_part(u.email, '@', 1)), 120),
         lower(u.email),
         u.id,
         'sito',
         'nuovo'
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.email is not null and coalesce(p.role, 'customer') not in ('admin', 'dipendente', 'tester')
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.eliseo_contatti, public.eliseo_modelli, public.eliseo_campagne, public.eliseo_richieste, public.eliseo_casella_stato to authenticated;
grant select, insert, update, delete on public.eliseo_contatti, public.eliseo_modelli, public.eliseo_campagne, public.eliseo_richieste, public.eliseo_casella_stato to service_role;
grant execute on function public.eliseo_importa_iscritti() to authenticated, service_role;
