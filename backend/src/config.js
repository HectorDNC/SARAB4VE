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
  /** ── Cloudflare R2 (almacenamiento de audio) ── */
  r2Endpoint: process.env.R2_ENDPOINT || "",
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID || "",
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  r2Bucket: process.env.R2_BUCKET || "sara-audio",
  r2PublicUrl: process.env.R2_PUBLIC_URL || "",
  /** ── Google AI Studio / Gemini (extracción de emergencia vía LLM) ── */
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-1.5-flash",
  /** ── Groq (extracción de emergencia vía LLM gratuito, fallback) ── */
  groqApiKey: process.env.GROQ_API_KEY || "",
  groqModel: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
};
