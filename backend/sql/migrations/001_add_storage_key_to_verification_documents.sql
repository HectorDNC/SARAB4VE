-- Migración: agregar storage_key a verification_documents
-- Fecha: 2026-08-05
-- Propósito: almacenar la clave R2 para generar URLs prefirmadas seguras

ALTER TABLE verification_documents
  ADD COLUMN IF NOT EXISTS storage_key TEXT;
