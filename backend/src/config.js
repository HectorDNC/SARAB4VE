const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  port: Number(process.env.PORT || 3001),
  databaseUrl: process.env.DATABASE_URL || "",
  /** Entorno actual: "development", "staging", "production", etc. */
  nodeEnv: process.env.NODE_ENV || "development",
  /** Secreto para firmar y verificar JWT de autenticación. */
  jwtSecret: process.env.JWT_SECRET || "",
  /** Secreto requerido para registrar un administrador. Si no se configura, la ruta se deshabilita. */
  adminSecret: process.env.ADMIN_SECRET || "",
};
