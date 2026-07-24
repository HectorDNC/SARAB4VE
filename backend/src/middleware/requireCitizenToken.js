/**
 * Middleware de autenticación — valida el token de acceso del ciudadano anónimo.
 * 
 * Uso:
 *   const { requireCitizenToken } = require("../../middleware/requireCitizenToken");
 *   router.get("/conversations/mine", requireCitizenToken, controller.listForCitizen);
 *
 * El middleware extrae el token del query param `?t=` o del header `X-Citizen-Token`,
 * lo valida contra `emergencies.access_token_hash`, y si es válido, inyecta
 * `req.citizenEmergencyId` para que los siguientes handlers lo usen.
 */

const bcrypt = require("bcrypt");
const db = require("../db");

/**
 * Busca la emergencia por su access_token_hash.
 * @param {string} tokenHash — hash bcrypt del token
 * @returns {Promise<string|null>} — emergencyId o null
 */
async function findEmergencyByTokenHash(tokenHash) {
  const result = await db.query(
    `SELECT id FROM emergencies WHERE access_token_hash = $1 LIMIT 1`,
    [tokenHash],
  );
  return result.rows[0]?.id || null;
}

/**
 * Valida el token de acceso del ciudadano contra todas las emergencias.
 * Como no podemos hacer lookup por hash sin conocer el emergencyId,
 * necesitamos buscar todas las emergencias con token y comparar una por una.
 * Para optimizar, usamos el query param emergencyId si está disponible.
 * 
 * @param {string} accessToken — token plano del ciudadano
 * @param {string|null} emergencyId — si se conoce, valida solo contra esta emergencia
 * @returns {Promise<string|null>} — emergencyId válido o null
 */
async function validateCitizenToken(accessToken, emergencyId = null) {
  if (emergencyId) {
    // Buscar emergencia específica
    const result = await db.query(
      `SELECT id, access_token_hash FROM emergencies WHERE id = $1`,
      [emergencyId],
    );
    const emergency = result.rows[0];
    if (!emergency || !emergency.access_token_hash) {
      return null;
    }
    const isValid = await bcrypt.compare(accessToken, emergency.access_token_hash);
    return isValid ? emergency.id : null;
  }

  // Si no se especifica emergencyId, buscar en todas las emergencias con token
  // Esto es menos eficiente pero necesario para el endpoint /mine
  const result = await db.query(
    `SELECT id, access_token_hash FROM emergencies WHERE access_token_hash IS NOT NULL`,
    [],
  );

  for (const emergency of result.rows) {
    const isValid = await bcrypt.compare(accessToken, emergency.access_token_hash);
    if (isValid) {
      return emergency.id;
    }
  }

  return null;
}

/**
 * Middleware de autenticación para ciudadano anónimo (Express).
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
async function requireCitizenToken(req, res, next) {
  // Extraer token del query param ?t= o del header X-Citizen-Token
  const token = req.query.t || req.headers["x-citizen-token"];

  if (!token) {
    return res.status(401).json({
      errors: [
        "Token de ciudadano requerido. Usa el query param ?t=<token> o el header X-Citizen-Token",
      ],
    });
  }

  // Opcional: emergencyId del query param para optimizar
  const emergencyId = req.query.emergencyId || null;

  try {
    const validEmergencyId = await validateCitizenToken(token, emergencyId);

    if (!validEmergencyId) {
      return res.status(401).json({
        errors: ["Token de ciudadano inválido o expirado"],
      });
    }

    // Inyectar en req para uso posterior
    req.citizenEmergencyId = validEmergencyId;
    req.citizenToken = token;

    next();
  } catch (error) {
    console.error("[requireCitizenToken] Error validando token:", error);
    return res.status(500).json({
      errors: ["Error interno al validar el token de ciudadano"],
    });
  }
}

module.exports = { requireCitizenToken, validateCitizenToken };
