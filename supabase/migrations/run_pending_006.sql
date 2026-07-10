-- Migration 006: categoria Bimbi nel sondaggio visitatori
ALTER TYPE visitor_gender ADD VALUE IF NOT EXISTS 'child';