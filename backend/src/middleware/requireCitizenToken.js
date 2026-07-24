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

const { verifyToken } = require("../modules/auth/auth.service");
const bcrypt = require("bcrypt");
const db = require("../db");

// ── Helpers (sin cambios) ──────────────────────────────────────────────────

async function validateCitizenToken(accessToken, emergencyId = null) {
  if (emergencyId) {
    const result = await db.query(
      `SELECT id, access_token_hash FROM emergencies WHERE id = $1`,
      [emergencyId],
    );
    const emergency = result.rows[0];
    if (!emergency || !emergency.access_token_hash) return null;
    const isValid = await bcrypt.compare(accessToken, emergency.access_token_hash);
    return isValid ? emergency.id : null;
  }

  const result = await db.query(
    `SELECT id, access_token_hash FROM emergencies WHERE access_token_hash IS NOT NULL`,
    [],
  );
  for (const emergency of result.rows) {
    if (await bcrypt.compare(accessToken, emergency.access_token_hash)) {
      return emergency.id;
    }
  }
  return null;
}

// ── requireCitizenToken (sin cambios) ──────────────────────────────────────

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

// ── hybridAuth: JWT o token de ciudadano ────────────────────────────────────

/**
 * Middleware híbrido — acepta JWT (Authorization: Bearer) o token de ciudadano
 * (X-Citizen-Token o ?t=). No depende de que authenticate falle — decide por sí
 * mismo qué modo usar según los headers presentes.
 *
 * - Si hay header Authorization → valida JWT e inyecta req.user
 * - Si no hay Authorization pero sí X-Citizen-Token o ?t= → valida token
 *   de ciudadano e inyecta req.citizenEmergencyId
 * - Si no hay ninguno → 401
 *
 * Uso:
 *   router.get("/:id/messages", hybridAuth, controller.listMessages(...));
 */
async function hybridAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  // ── Rama JWT ──
  if (authHeader) {
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({
        errors: ["Formato de autorización inválido. Usa: Bearer <token>"],
      });
    }

    const token = parts[1];
    const result = verifyToken(token);

    if (!result.valid) {
      return res.status(401).json({
        errors: [result.error || "Token inválido"],
      });
    }

    req.user = {
      userId: result.payload.userId,
      role: result.payload.role,
      status: result.payload.status,
    };

    return next();
  }

  // ── Rama ciudadano anónimo ──
  const citizenToken = req.query.t || req.headers["x-citizen-token"];

  if (!citizenToken) {
    return res.status(401).json({
      errors: [
        "Autenticación requerida. Usa Authorization: Bearer <token> (JWT) o X-Citizen-Token / ?t= (ciudadano)",
      ],
    });
  }

  const emergencyId = req.query.emergencyId || null;

  try {
    const validEmergencyId = await validateCitizenToken(citizenToken, emergencyId);

    if (!validEmergencyId) {
      return res.status(401).json({
        errors: ["Token de ciudadano inválido o expirado"],
      });
    }

    req.citizenEmergencyId = validEmergencyId;
    req.citizenToken = citizenToken;

    return next();
  } catch (error) {
    console.error("[hybridAuth] Error validando token de ciudadano:", error);
    return res.status(500).json({
      errors: ["Error interno al validar el token de ciudadano"],
    });
  }
}

module.exports = { requireCitizenToken, validateCitizenToken, hybridAuth };
