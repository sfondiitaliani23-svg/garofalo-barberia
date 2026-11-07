-- Eliseo · Addestramento dell'assistente (FAQ, documenti, istruzioni, passaggio a una persona) e automazioni.
-- Barberia Garofalo: compatibile con i ruoli admin, dipendente e tester.

-- 1. FAQ in cartelle (domanda e risposta)
create table if not exists public.eliseo_faq (
  id             uuid primary key default gen_random_uuid(),
  cartella       text not null default 'Generale' check (char_length(cartella) between 1 and 40),
  domanda        text not null check (char_length(domanda) between 3 and 200),
  parole         text not null default '' check (char_length(parole) <= 300),
  risposta       text not null check (char_length(risposta) between 1 and 1000),
  attiva         boolean not null default true,
  creato_il      timestamptz not null default now(),
  aggiornato_il  timestamptz not null default now()
);

-- 2. Documenti: testo da PDF, listini, biografie (fino a 20.000 caratteri)
create table if not exists public.eliseo_documenti (
  id             uuid primary key default gen_random_uuid(),
  titolo         text not null check (char_length(titolo) between 1 and 120),
  testo          text not null check (char_length(testo) between 1 and 20000),
  attivo         boolean not null default true,
  creato_il      timestamptz not null default now(),
  aggiornato_il  timestamptz not null default now()
);

-- 3. Impostazioni dell'assistente (riga singola)
create table if not exists public.eliseo_assistente (
  id                 smallint primary key default 1 check (id = 1),
  istruzioni         text not null default 'Sei Eliseo, l''assistente virtuale di Barberia Garofalo a Foggia. Rispondi con tono professionale, cordiale ed elegante. Aiuta i clienti a conoscere i servizi di taglio e barba, gli orari e a prenotare sul sito.' check (char_length(istruzioni) <= 10000),
  escalation_attiva  boolean not null default true,
  testo_libero       boolean not null default true,
  regole             jsonb not null default '[]'::jsonb check (jsonb_typeof(regole) = 'array' and jsonb_array_length(regole) <= 30),
  orari              jsonb not null default '{"mar":[["08:30","13:00"],["15:30","20:30"]],"mer":[["08:30","13:00"],["15:30","20:30"]],"gio":[["08:30","13:00"],["15:30","20:30"]],"ven":[["08:30","13:00"],["15:30","20:30"]],"sab":[["08:30","14:00"],["14:30","20:00"]],"dom":[],"lun":[]}'::jsonb check (jsonb_typeof(orari) = 'object'),
  aggiornato_il      timestamptz not null default now()
);
insert into public.eliseo_assistente (id) values (1) on conflict (id) do nothing;

-- Cronologia delle versioni del prompt
create table if not exists public.eliseo_assistente_versioni (
  id         uuid primary key default gen_random_uuid(),
  istruzioni text not null,
  creato_il  timestamptz not null default now(),
  creato_da  uuid default auth.uid()
);

create or replace function public.eliseo_data_modifica() returns trigger
language plpgsql as $$ begin new.aggiornato_il := now(); return new; end $$;

drop trigger if exists eliseo_faq_data on public.eliseo_faq;
create trigger eliseo_faq_data before insert or update on public.eliseo_faq for each row execute function public.eliseo_data_modifica();

drop trigger if exists eliseo_documenti_data on public.eliseo_documenti;
create trigger eliseo_documenti_data before insert or update on public.eliseo_documenti for each row execute function public.eliseo_data_modifica();

drop trigger if exists eliseo_assistente_data on public.eliseo_assistente;
create trigger eliseo_assistente_data before insert or update on public.eliseo_assistente for each row execute function public.eliseo_data_modifica();

create or replace function public.eliseo_assistente_versione() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.istruzioni is distinct from new.istruzioni and old.istruzioni <> '' then
    insert into public.eliseo_assistente_versioni (istruzioni) values (old.istruzioni);
    delete from public.eliseo_assistente_versioni where id in (select id from public.eliseo_assistente_versioni order by creato_il desc offset 30);
  end if;
  return new;
end $$;
drop trigger if exists eliseo_assistente_versione on public.eliseo_assistente;
create trigger eliseo_assistente_versione before update on public.eliseo_assistente for each row execute function public.eliseo_assistente_versione();

-- 4. Automazioni
create table if not exists public.eliseo_automazioni (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null check (char_length(nome) between 1 and 80),
  attiva      boolean not null default true,
  quando      text not null check (quando in ('nuova_richiesta', 'nuova_chat', 'nuovo_contatto', 'cambio_fase')),
  condizione  text check (condizione is null or char_length(condizione) <= 40),
  azione      text not null check (azione in ('assegna', 'crea_contatto', 'etichetta', 'fase', 'barbiere')),
  valore      text check (valore is null or char_length(valore) <= 60),
  eseguite    integer not null default 0,
  ultima      timestamptz,
  creato_il   timestamptz not null default now()
);

create or replace function public.eliseo_segna(a uuid) returns void
language sql security definer set search_path = public as $$
  update public.eliseo_automazioni set eseguite = eseguite + 1, ultima = now() where id = a
$$;
revoke all on function public.eliseo_segna(uuid) from public, anon, authenticated;

-- Automazione: nuova richiesta
create or replace function public.eliseo_auto_richiesta() returns trigger
language plpgsql security definer set search_path = public as $$
declare a record; cid uuid; mail text; tel text;
begin
  for a in select * from public.eliseo_automazioni where attiva and quando = 'nuova_richiesta' and (condizione is null or condizione = new.motivo) order by creato_il loop
    if a.azione = 'assegna' and a.valore is not null then
      insert into public.eliseo_casella_stato (tipo, rif, assegnato) values ('richiesta', new.id, a.valore)
        on conflict (tipo, rif) do update set assegnato = excluded.assegnato;
      perform public.eliseo_segna(a.id);
    elsif a.azione = 'crea_contatto' then
      mail := case when new.contatto like '%@%' then lower(trim(new.contatto)) end;
      tel := case when mail is null then left(regexp_replace(new.contatto, '[^0-9 +().-]', '', 'g'), 40) end;
      select id into cid from public.eliseo_contatti where (mail is not null and lower(email) = mail) or (tel is not null and regexp_replace(telefono, '\D', '', 'g') = regexp_replace(tel, '\D', '', 'g')) limit 1;
      if cid is null then
        insert into public.eliseo_contatti (nome, email, telefono, fonte, fase, note, etichette)
          values (left(new.nome, 120), mail, nullif(tel, ''), 'sito', 'nuovo', left('Richiesta dal sito: ' || new.motivo, 500), case when a.valore is null then '{}' else array[lower(a.valore)] end)
          returning id into cid;
      end if;
      insert into public.eliseo_casella_stato (tipo, rif, contatto_id) values ('richiesta', new.id, cid)
        on conflict (tipo, rif) do update set contatto_id = excluded.contatto_id;
      perform public.eliseo_segna(a.id);
    end if;
  end loop;
  return null;
exception when others then return null;
end $$;
drop trigger if exists eliseo_auto_richiesta on public.eliseo_richieste;
create trigger eliseo_auto_richiesta after insert on public.eliseo_richieste for each row execute function public.eliseo_auto_richiesta();

-- Automazione: nuovo contatto o cambio fase
create or replace function public.eliseo_auto_contatto() returns trigger
language plpgsql security definer set search_path = public as $$
declare a record; ev text;
begin
  if tg_op = 'INSERT' then ev := 'nuovo_contatto';
  elsif new.fase is distinct from old.fase then ev := 'cambio_fase';
  else return new; end if;
  for a in select * from public.eliseo_automazioni where attiva and quando = ev
      and (condizione is null or condizione = case when ev = 'nuovo_contatto' then new.fonte else new.fase end) order by creato_il loop
    if a.azione = 'etichetta' and a.valore is not null and not (lower(a.valore) = any(new.etichette)) and cardinality(new.etichette) < 10 then
      new.etichette := new.etichette || lower(a.valore);
    elsif a.azione = 'fase' and ev = 'nuovo_contatto' and a.valore in ('nuovo', 'contattato', 'cliente', 'da_richiamare', 'perso') then
      new.fase := a.valore;
    elsif a.azione = 'barbiere' and a.valore is not null and new.barbiere is null then
      new.barbiere := a.valore;
    else continue;
    end if;
    perform public.eliseo_segna(a.id);
  end loop;
  return new;
end $$;
drop trigger if exists eliseo_auto_contatto on public.eliseo_contatti;
create trigger eliseo_auto_contatto before insert or update on public.eliseo_contatti for each row execute function public.eliseo_auto_contatto();

-- RLS
alter table public.eliseo_faq enable row level security;
alter table public.eliseo_documenti enable row level security;
alter table public.eliseo_assistente enable row level security;
alter table public.eliseo_assistente_versioni enable row level security;
alter table public.eliseo_automazioni enable row level security;

do $$ declare t text; begin
  foreach t in array array['eliseo_faq', 'eliseo_documenti', 'eliseo_assistente', 'eliseo_assistente_versioni', 'eliseo_automazioni'] loop
    execute format('drop policy if exists %I on public.%I', t || '_staff', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_admin() or exists (select 1 from public.profiles where id = auth.uid() and role in (''admin'', ''dipendente'', ''tester''))) with check (public.is_admin() or exists (select 1 from public.profiles where id = auth.uid() and role in (''admin'', ''dipendente'')))', t || '_staff', t);
  end loop;
end $$;

grant usage on schema public to authenticated, anon;
grant select, insert, update, delete on public.eliseo_faq, public.eliseo_documenti, public.eliseo_assistente, public.eliseo_assistente_versioni, public.eliseo_automazioni to authenticated, service_role;

-- Funzione pubblica per il chatbot del sito
create or replace function public.eliseo_assistente_pubblico() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'faq', coalesce((select jsonb_agg(jsonb_build_object('d', domanda, 'p', parole, 'r', risposta) order by cartella, domanda) from public.eliseo_faq where attiva), '[]'::jsonb),
    'documenti', coalesce((select jsonb_agg(jsonb_build_object('t', titolo, 'x', left(testo, 20000)) order by titolo) from public.eliseo_documenti where attivo), '[]'::jsonb),
    'escalation', coalesce((select escalation_attiva from public.eliseo_assistente where id = 1), false),
    'testo_libero', coalesce((select testo_libero from public.eliseo_assistente where id = 1), false),
    'regole', coalesce((select regole from public.eliseo_assistente where id = 1), '[]'::jsonb),
    'orari', coalesce((select orari from public.eliseo_assistente where id = 1), '{}'::jsonb)
  )
$$;
revoke all on function public.eliseo_assistente_pubblico() from public;
grant execute on function public.eliseo_assistente_pubblico() to anon, authenticated, service_role;

-- Prime FAQ di Barberia Garofalo
insert into public.eliseo_faq (cartella, domanda, parole, risposta)
select * from (values
  ('Prenotazioni', 'Posso spostare o disdire un appuntamento?', 'spostare, anticipare, posticipare, cambiare orario, disdire, cancellare', 'Certo. Puoi gestire la tua prenotazione dalla tua area riservata oppure scriverci direttamente su WhatsApp indicando data e orario.'),
  ('Prenotazioni', 'Bisogna prenotare o si può venire senza appuntamento?', 'senza appuntamento, passare, libero, walk in', 'Consigliamo sempre di prenotare online dal sito per avere la certezza dell''orario e del barbiere scelto. Se passi senza appuntamento saremo felici di accoglierti appena si libera una poltrona.'),
  ('Servizi', 'Quali servizi di barba offrite?', 'barba, panno caldo, modellatura, rasatura, rituale', 'Offriamo modellatura barba classica e il rituale completo con panni caldi, oli essenziali e dopobarba idratante.'),
  ('Buoni & Regali', 'Fate buoni regalo per tagli o trattamenti barba?', 'buono, regalo, gift card, regalare', 'Sì! Puoi regalare un buono per qualsiasi servizio o abbonamento. Contattaci su WhatsApp o vieni a trovarci in salone.')
) as v(cartella, domanda, parole, risposta)
where not exists (select 1 from public.eliseo_faq);
