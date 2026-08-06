-- Migración: reemplazar file_url con storage_key en verification_documents
-- Fecha: 2026-08-05
-- Propósito: los documentos ya no se almacenan como URL pública directa.
-- Se guarda el storage_key de R2 para generar URLs prefirmadas bajo demanda.

-- 1. Agregar storage_key
ALTER TABLE verification_documents
  ADD COLUMN IF NOT EXISTS storage_key TEXT;

-- 2. Hacer storage_key NOT NULL una vez que no haya registros huérfanos
-- (descomentar después de migrar datos existentes si los hay)
-- ALTER TABLE verification_documents ALTER COLUMN storage_key SET NOT NULL;

-- 3. Remover file_url
ALTER TABLE verification_documents
  DROP COLUMN IF EXISTS file_url;
