-- Migración: agregar other_entity_type a organization_profiles
-- Fecha: 2026-08-28
--
-- Motivo: el formulario de registro de organización pide especificar el
-- tipo de entidad cuando se elige "Otra (cual)" en el selector de tipo de
-- entidad, pero ese texto libre nunca se guardaba — no existía columna
-- para él (ver comentario en registro/organization/mapper.ts).
--
-- Aditiva, no toca filas existentes.

ALTER TABLE organization_profiles
  ADD COLUMN IF NOT EXISTS other_entity_type VARCHAR(100);
