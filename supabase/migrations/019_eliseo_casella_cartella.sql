-- 019_eliseo_casella_cartella.sql
-- Aggiunge la colonna cartella alla casella unica di Eliseo CRM per organizzare le conversazioni in cartelle (stile Keplero)
alter table public.eliseo_casella_stato add column if not exists cartella text check (cartella is null or char_length(cartella) <= 60);
