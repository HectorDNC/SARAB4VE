-- Migración: corregir document_types de organización para que coincidan
--            con lo que realmente pide el formulario de registro
-- Fecha: 2026-08-31
-- Propósito: los nombres sembrados originalmente no coincidían con las
-- etiquetas del formulario (ej. "CIF" en el registro vs "Registro de
-- Información Fiscal (RIF)" en el panel de aprobación), y 3 documentos
-- distintos del formulario (Acuerdo de Participación, Código Ético,
-- Política de Accesibilidad) se guardaban bajo el mismo tipo "Memoria de
-- actividades" (id 7) porque solo había 7 tipos sembrados y el formulario
-- pide 9. Este script renombra los 7 existentes para que coincidan
-- textualmente con el formulario y agrega los 2 que faltan.

-- 1) Renombrar los 7 tipos existentes (mismo id, nuevo nombre + requerido)
UPDATE document_types SET name = 'Estatutos', is_required = true
  WHERE code = 'estatutos' AND entity_type = 'organization';

UPDATE document_types SET name = 'Identificación Fiscal', is_required = true
  WHERE code = 'rif' AND entity_type = 'organization';

UPDATE document_types SET name = 'Inscripción registral', is_required = true
  WHERE code = 'acta_constitutiva' AND entity_type = 'organization';

UPDATE document_types SET name = 'Documento de identidad representante', is_required = true
  WHERE code = 'identificacion_representante' AND entity_type = 'organization';

-- Antes "Certificado bancario" (opcional, sin uso real en el formulario) —
-- se repurpone como "Seguro de responsabilidad civil" (obligatorio),
-- que sí pide el formulario y no tenía tipo propio.
UPDATE document_types SET name = 'Seguro de responsabilidad civil', is_required = true
  WHERE code = 'certificado_bancario' AND entity_type = 'organization';

-- Antes "Declaración de impuestos del último ejercicio" (opcional) —
-- se repurpone como "Certificado fiscal" (obligatorio), que sí pide el
-- formulario y no tenía tipo propio.
UPDATE document_types SET name = 'Certificado fiscal', is_required = true
  WHERE code = 'declaracion_impuestos' AND entity_type = 'organization';

-- Antes "Memoria de actividades" (opcional, compartido por 3 documentos
-- distintos del formulario) — se repurpone específicamente como el
-- Acuerdo de Participación firmado; código ético y política de
-- accesibilidad obtienen tipos propios nuevos abajo.
UPDATE document_types SET name = 'Acuerdo de Participación (firmado)', is_required = true
  WHERE code = 'memoria_actividades' AND entity_type = 'organization';

-- 2) Agregar los 2 tipos que faltaban (idempotente)
INSERT INTO document_types (code, name, entity_type, is_required)
SELECT 'codigo_etico', 'Código Ético', 'organization', true
WHERE NOT EXISTS (
  SELECT 1 FROM document_types WHERE code = 'codigo_etico' AND entity_type = 'organization'
);

INSERT INTO document_types (code, name, entity_type, is_required)
SELECT 'politica_accesibilidad', 'Política de Accesibilidad', 'organization', true
WHERE NOT EXISTS (
  SELECT 1 FROM document_types WHERE code = 'politica_accesibilidad' AND entity_type = 'organization'
);
