/**
 * Middleware de autenticación — verifica el JWT del header Authorization.
 *
 * Uso:
 *   const { authenticate } = require("../../middleware/authenticate");
 *   router.get("/recurso-protegido", authenticate, controller.handler);
 *
 * El middleware extrae el token del header `Authorization: Bearer <token>`,
 * lo verifica con auth.service.verifyToken(), y si es válido, inyecta
 * `req.user = { userId, role, status }` para que los siguientes middlewares
 * y controladores lo usen.
 */

const { verifyToken } = require("../modules/auth/auth.service");

/**
 * Middleware de autenticación (Express).
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
function authenticate(req, res, next) {
  // Extraer token del header Authorization
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      errors: ["Token de autenticación requerido. Usa el header Authorization: Bearer <token>"],
    });
  }

  // El formato esperado es "Bearer <token>"
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({
      errors: ["Formato de autorización inválido. Usa: Bearer <token>"],
    });
  }

  const token = parts[1];

  // Verificar el token
  const result = verifyToken(token);

  if (!result.valid) {
    return res.status(401).json({
      errors: [result.error || "Token inválido"],
    });
  }

  // Inyectar payload en req.user para uso posterior
  req.user = {
    userId: result.payload.userId,
    role: result.payload.role,
    status: result.payload.status,
  };

  next();
}

module.exports = { authenticate };
