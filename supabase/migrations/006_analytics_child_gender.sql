-- Aggiunge categoria "bimbi" al sondaggio visitatori
ALTER TYPE visitor_gender ADD VALUE IF NOT EXISTS 'child';