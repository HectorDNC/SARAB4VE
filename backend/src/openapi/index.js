/**
 * Generador del documento OpenAPI 3.0 y setup de Swagger UI.
 *
 * Expone:
 *   - setupDocs(app): monta GET /api/docs (Swagger UI) y GET /api/docs.json (JSON)
 *   - document: el documento OpenAPI generado (por si se necesita exportar)
 *
 * Usa Swagger UI desde CDN (jsdelivr) en lugar de swaggerUi.serve porque
 * Vercel + @vercel/node rompe express.static (serve-static) en serverless.
 */
const { OpenApiGeneratorV3 } = require("@asteasolutions/zod-to-openapi");
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
// HTML de Swagger UI con assets desde CDN + spec inline
// ---------------------------------------------------------------------------

const SWAGGER_VERSION = "5.20.6"; // mantener en sync con swagger-ui-dist

const swaggerHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>SARA API — Documentación</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui.css">
  <style>
    /* ── Base (modo oscuro) ── */
    .swagger-ui .topbar { display: none }
    html { box-sizing: border-box; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body {
      margin: 0;
      background: #0f0f1a;
      color-scheme: dark;
    }

    /* ── Capa de inversión principal ── */
    .swagger-ui {
      filter: invert(100%) hue-rotate(180deg) saturate(1.3);
    }
    /* Unificar fondo del contenedor de servidores con el resto */
    .swagger-ui .scheme-container {
      background: transparent !important;
      box-shadow: none !important;
    }
    /* Input y select de Servers: fondo oscuro + letra blanca */
    .swagger-ui .scheme-container input,
    .swagger-ui .scheme-container select {
      background: #1a1a2e !important;
      color: #ffffff !important;
      border-color: #3b3b5c !important;
    }
    /* Restaurar colores originales en bloques de código */
    .swagger-ui .highlight-code,
    .swagger-ui .microlight,
    .swagger-ui .model-example .tablinks,
    .swagger-ui .markdown code,
    .swagger-ui .renderedMarkdown code,
    .swagger-ui .json-schema-2020-12__title,
    .swagger-ui .json-schema-2020-12-body .json-schema-2020-12,
    .swagger-ui .json-schema-2020-12-accordion {
    //   filter: invert(100%) hue-rotate(180deg);
    }
    /* Restaurar imágenes e iconos */
    .swagger-ui img,
    .swagger-ui svg,
    .swagger-ui .arrow {
      filter: invert(100%) hue-rotate(180deg);
    }
    /* Forzar texto blanco en todos los textos relevantes */
    .swagger-ui .opblock-summary-description,
    .swagger-ui .opblock-summary-path,
    .swagger-ui .info .title,
    .swagger-ui .info p,
    .swagger-ui .info li,
    .swagger-ui .info a,
    .swagger-ui .opblock-tag,
    .swagger-ui .opblock-tag small,
    .swagger-ui .parameter__name,
    .swagger-ui .parameter__type,
    .swagger-ui .response-col_status,
    .swagger-ui .response-col_description,
    .swagger-ui .model-title,
    .swagger-ui .model-box,
    .swagger-ui .tab li,
    .swagger-ui .opblock-section-header h4,
    .swagger-ui .opblock-section-header label,
    .swagger-ui .btn,
    .swagger-ui .authorization__btn,
    .swagger-ui .dialog-ux .modal-ux-header h3,
    .swagger-ui .dialog-ux .modal-ux-content p,
    .swagger-ui .dialog-ux .modal-ux-content label {
      color: inherit;
    }
    .swagger-ui .info h1, .swagger-ui .info h2, .swagger-ui .info h3,
    .swagger-ui .info h4, .swagger-ui .info h5, .swagger-ui .info li,
    .swagger-ui .info p, .swagger-ui .info table,
    .scheme-container, p, li, button, span, h1, h2, h3, h4, h5, h6,
    th, td, label {
      color: #ffffff !important;
    }
    .swagger-ui .opblock-section-header {
      background: rgba(97,175,254,.1) !important;
    }
    .wrapper, .tab, .opblock-summary-path-description-wrapper, .opblock-summary-path,
    .opblock-summary-description, .opblock-description-wrapper, .button.tablinks {
        color: #ffffff !important;
    }
    /* Mejor contraste en input de try-out */
    .swagger-ui input[type="text"],
    .swagger-ui textarea,
    .swagger-ui select {
      color-scheme: dark;
    }
    .swagger-ui input[type="text"],
    .swagger-ui input:not([type]),
    .swagger-ui textarea,
    .swagger-ui select {
        color: #000000 !important;
        background-color: #f5f5f5 !important;
        border-color: #3b3b5c !important;
        color-scheme: none;
    }
    /* Ajuste extra para el input de try-out (textarea del body de la request) */
    .swagger-ui .body-param__text,
    .swagger-ui textarea.body-param__text {
        color: #000000 !important;
        background-color: #f5f5f5 !important;
    }

    /* ── Modal Authorize ── */
    .swagger-ui .dialog-ux .modal-ux {
      background: #1e1e2e !important;
      border: 1px solid #3b3b5c !important;
      border-radius: 12px !important;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important;
    }
    .swagger-ui .dialog-ux .modal-ux-header {
      border-bottom: 1px solid #3b3b5c !important;
      padding: 16px 24px !important;
    }
    .swagger-ui .dialog-ux .modal-ux-header h3 {
      color: #ffffff !important;
      font-size: 1.2rem !important;
    }
    .swagger-ui .dialog-ux .modal-ux-header .close-modal {
      opacity: 0.8;
    }
    .swagger-ui .dialog-ux .modal-ux-content {
      padding: 20px 24px !important;
    }
    .swagger-ui .dialog-ux .modal-ux-content h4 {
      color: #ffffff !important;
      font-size: 0.95rem !important;
      margin-bottom: 8px !important;
    }
    .swagger-ui .dialog-ux .modal-ux-content p,
    .swagger-ui .dialog-ux .modal-ux-content label {
      color: #ffffff !important;
    }
    /* Input del API key */
    .swagger-ui .dialog-ux .modal-ux-content input {
      background: #f0f0f0 !important;
      color: #111111 !important;
      border: 1px solid #3b3b5c !important;
      border-radius: 6px !important;
      padding: 8px 12px !important;
      width: 100% !important;
      color-scheme: none !important;
    }
    .swagger-ui .dialog-ux .modal-ux-content input:focus {
      border-color: #61affe !important;
      outline: none !important;
      box-shadow: 0 0 0 2px rgba(97,175,254,0.3) !important;
    }
    /* Botones del modal */
    .swagger-ui .dialog-ux .modal-ux-content .auth-btn-wrapper {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 20px;
    }
    .swagger-ui .dialog-ux .modal-ux-content .btn-done,
    .swagger-ui .dialog-ux .modal-ux-content .btn-cancel {
      padding: 8px 24px !important;
      border-radius: 6px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      border: 1px solid #3b3b5c !important;
    }
    .swagger-ui .dialog-ux .modal-ux-content .btn-done {
      background: #61affe !important;
      color: #ffffff !important;
    }
    .swagger-ui .dialog-ux .modal-ux-content .btn-cancel {
      background: transparent !important;
      color: #ffffff !important;
    }

    /* Scrollbar sutil */
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: #0f0f1a; }
    ::-webkit-scrollbar-thumb { background: #3b3b5c; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #5a5a7a; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui-bundle.js" crossorigin></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui-standalone-preset.js" crossorigin></script>
  <script>
    window.onload = function () {
      window.ui = SwaggerUIBundle({
        spec: __SWAGGER_SPEC__,
        dom_id: "#swagger-ui",
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        plugins: [SwaggerUIBundle.plugins.DownloadUrl],
        layout: "StandaloneLayout",
        tagsSorter: "alpha",
        operationsSorter: "method"
      });
    };
  </script>
</body>
</html>`;

/** HTML final con el spec incrustado (generado una sola vez) */
const htmlWithSpec = swaggerHtml.replace(
  "__SWAGGER_SPEC__",
  JSON.stringify(document),
);

// ---------------------------------------------------------------------------
// Setup en la app Express
// ---------------------------------------------------------------------------

/**
 * Monta los endpoints de documentación en la app.
 * GET /api/docs     → Swagger UI interactiva (CDN, spec inline)
 * GET /api/docs.json → Documento OpenAPI en JSON
 *
 * @param {import("express").Express} app
 */
function setupDocs(app) {
  const serveDocs = (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(htmlWithSpec);
  };
  app.get("/api/docs", serveDocs);
  app.get("/api/docs/", serveDocs);
  app.get("/api/docs.json", (_req, res) => res.json(document));

  console.log("📚 Swagger UI disponible en /api/docs");
}

module.exports = { setupDocs, document };
