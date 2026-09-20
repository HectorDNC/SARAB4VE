-- Migración: preferencia de notificación de nuevas solicitudes de ayuda
-- Fecha: 2026-09-19
--
-- Motivo: permitir que cada organización y voluntario aprobado decida si
-- quiere recibir un correo cuando se cree una nueva solicitud en su zona.
-- Es la compuerta (opt-in) por usuario: la notificación solo se envía a
-- quienes tengan esta columna en true. Por defecto queda activada para no
-- perder avisos.
--
-- Aditiva: no toca filas ni tablas existentes.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS notify_new_requests BOOLEAN NOT NULL DEFAULT true;
