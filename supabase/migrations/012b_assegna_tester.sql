-- Da eseguire DOPO 012_ruolo_tester.sql e DOPO che Maurizio si è registrato sul sito di Garofalo come cliente.
-- Cambia SOLO l'email qui sotto con quella di Maurizio, poi Run. Per togliere il ruolo: metti 'customer' al posto di 'tester'.
update public.profiles set role = 'tester', updated_at = now() where email = 'EMAIL-DI-MAURIZIO';
