/**
 * Middleware de autorización por rol (RBAC) — verifica que req.user.role
 * esté en la lista de roles permitidos.
 *
 * Uso:
 *   const { authorize } = require("../../middleware/authorize");
 *   router.get("/admin/users", authenticate, authorize("admin"), controller.listUsers);
 *   router.post("/sos", authenticate, authorize("citizen", "volunteer"), controller.createSos);
 *
 * Requisito: el middleware authenticate debe ejecutarse antes para inyectar req.user.
 */

/**
 * Crea un middleware que restringe el acceso a los roles especificados.
 * @param {...string} allowedRoles — Roles que tienen permitido acceder (ej: "admin", "volunteer")
 * @returns {(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => void}
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    // Verificar que authenticate se haya ejecutado antes
    if (!req.user) {
      return res.status(401).json({
        errors: ["Autenticación requerida antes de verificar permisos"],
      });
    }
    console.log("req.user:", req.user);
    console.log("allowedRoles:", allowedRoles);

    // Verificar que el rol del usuario esté en la lista de permitidos
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        errors: [
          `Acceso denegado. Se requiere uno de los siguientes roles: ${allowedRoles.join(", ")}`,
        ],
      });
    }

    next();
  };
}

module.exports = { authorize };
