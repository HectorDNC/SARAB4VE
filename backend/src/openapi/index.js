/**
 * Generador del documento OpenAPI 3.0 y setup de Swagger UI.
 *
 * Expone:
 *   - setupDocs(app): monta GET /api/docs (Swagger UI) y GET /api/docs.json (JSON)
 *   - document: el documento OpenAPI generado (por si se necesita exportar)
 *
 * Solo debe llamarse a setupDocs() en ambientes dev/staging.
 * El guard de producción se hace en app.js.
 */
const { OpenApiGeneratorV3 } = require("@asteasolutions/zod-to-openapi");
const swaggerUi = require("swagger-ui-express");
const { registry } = require("./registry");

// ---------------------------------------------------------------------------
// Generar documento OpenAPI 3.0
// ---------------------------------------------------------------------------

const generator = new OpenApiGeneratorV3(registry.definitions);

const document = generator.generateDocument({
  openapi: "3.0.0",
  info: {
    title: "SARA API",
    version: process.env.npm_package_version || "0.1.0",
    description: [
      "## Sistema de Apoyo y Respuesta Accesible (SARA)",
      "",
      "Plataforma humanitaria de emergencia diseñada para ser accesible a personas",
      "con discapacidad visual, auditiva, neurodivergente y motriz.",
      "",
      "### 🔐 Autenticación",
      "La mayoría de los endpoints requieren un token JWT. Para obtenerlo:",
      "1. Regístrate como ciudadano en `POST /api/auth/register/citizen`",
      "2. Inicia sesión en `POST /api/auth/login`",
      "3. Haz clic en el botón **Authorize** 🔒 y pega el token (sin el prefijo `Bearer `)",
      "4. Los endpoints protegidos mostrarán un candado cerrado 🔒",
      "",
      "### 📦 Formato de respuestas",
      "- Éxito: `{ \"data\": ... }`",
      "- Error: `{ \"errors\": [\"mensaje 1\", \"mensaje 2\"] }`",
    ].join("\n"),
    contact: {
      name: "Equipo SARA",
      email: "soporte@sara.org",
    },
  },
  servers: [
    {
      url: process.env.API_URL || "http://localhost:{port}",
      description: process.env.NODE_ENV === "production" ? "Producción" : "Desarrollo",
      variables: {
        port: {
          default: process.env.PORT || "3001",
          description: "Puerto del servidor",
        },
      },
    },
  ],
});

// ---------------------------------------------------------------------------
// Setup en la app Express (solo llamado desde app.js si NODE_ENV !== production)
// ---------------------------------------------------------------------------

/**
 * Monta los endpoints de documentación en la app.
 * GET /api/docs     → Swagger UI interactiva
 * GET /api/docs.json → Documento OpenAPI en JSON
 *
 * @param {import("express").Express} app
 */
function setupDocs(app) {
  // Swagger UI personalizada (sin topbar de Swagger, título SARA)
  const swaggerOptions = {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "SARA API — Documentación",
    swaggerOptions: {
      // Ordenar tags alfabéticamente y mantener Auth primero
      tagsSorter: "alpha",
      operationsSorter: "method",
    },
  };

  // UI interactiva
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(document, swaggerOptions));

  // JSON crudo (útil para importar en Postman, Insomnia, etc.)
  app.get("/api/docs.json", (_req, res) => {
    res.json(document);
  });

  console.log("📚 Swagger UI disponible en /api/docs");
}

module.exports = { setupDocs, document };
