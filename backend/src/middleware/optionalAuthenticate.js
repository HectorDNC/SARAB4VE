/**
 * Middleware de autenticación opcional — captura el usuario si hay JWT válido,
 * pero no bloquea peticiones anónimas.
 *
 * Uso:
 *   const { optionalAuthenticate } = require("../../middleware/optionalAuthenticate");
 *   router.post("/", optionalAuthenticate, controller.handler);
 *
 * - Si el header `Authorization: Bearer <token>` trae un JWT válido, inyecta
 *   `req.user = { userId, role, status }`.
 * - Si no hay token, el formato es inválido o el token no es válido, continúa
 *   sin error (la petición se trata como anónima).
 */

const { verifyToken } = require("../modules/auth/auth.service");

/**
 * Middleware de autenticación opcional (Express).
 * @param {import("express").Request} req
 * @param {import("express").Response} _res
 * @param {import("express").NextFunction} next
 */
function optionalAuthenticate(req, _res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && parts[0] === "Bearer") {
      const result = verifyToken(parts[1]);
      if (result.valid) {
        req.user = {
          userId: result.payload.userId,
          role: result.payload.role,
          status: result.payload.status,
        };
      }
    }
  }

  next();
}

module.exports = { optionalAuthenticate };