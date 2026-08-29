-- Migración: agregar tax_id_type a organization_profiles
-- Fecha: 2026-08-28
--
-- Motivo: el formulario de registro de organización ya pide el TIPO de
-- identificador fiscal (RIF, NIT, RUC, CUIT, CNPJ, CIF, RFC, RUT, o "Otro"
-- para organizaciones en trámite que usan documento de identidad personal),
-- pero solo el número (tax_id) se guardaba — el tipo se descartaba en el
-- frontend (ver mapper.ts). Sin el tipo, un admin revisando la solicitud no
-- puede distinguir un identificador fiscal formal de un documento personal
-- usado como alternativa temporal (bug de QA #7, 22/08/2026).
--
-- Aditiva, no toca filas existentes.

ALTER TABLE organization_profiles
  ADD COLUMN IF NOT EXISTS tax_id_type VARCHAR(30);
