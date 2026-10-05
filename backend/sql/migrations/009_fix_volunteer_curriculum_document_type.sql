-- Migración: corregir el nombre del documento "curriculum" para voluntario
--            profesional, para que coincida con la etiqueta del formulario
--            de registro.
-- Fecha: 2026-10-05
--
-- Motivo: el seed original (verification_schema.sql) sembró este código con
-- el nombre "Currículum vitae actualizado" y is_required=false. La
-- migración 002 agregó el resto de los documentos de voluntario pero dejó
-- esta fila sin tocar a propósito (ya existía), sin notar que el formulario
-- de registro (frontend/.../registro/volunteer/constants.ts) pide
-- "Currículum" como obligatorio. El panel de aprobación muestra el nombre
-- tal cual sale de document_types.name — por eso el aprobador ve un nombre
-- distinto al que el formulario le mostró al voluntario.
--
-- Aditiva/correctiva: solo renombra una fila existente, no agrega ni
-- elimina ninguna.

UPDATE document_types
SET name = 'Currículum', is_required = true
WHERE code = 'curriculum' AND entity_type = 'volunteer_professional';
