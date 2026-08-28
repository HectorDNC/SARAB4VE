-- Migración: agregar address a volunteer_profiles
-- Fecha: 2026-08-28
--
-- Motivo: el formulario de registro de voluntario pide la dirección como
-- campo obligatorio, pero nunca se guardaba — no existía columna para ella
-- ni el backend la aceptaba (RegisterVolunteerBody no tenía `address`).
--
-- Aditiva, no toca filas existentes.

ALTER TABLE volunteer_profiles
  ADD COLUMN IF NOT EXISTS address TEXT;
