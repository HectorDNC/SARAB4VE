/**
 * Test del endpoint /api/verification-documents
 * 
 * Requiere:
 *   1. Backend corriendo (npm start)
 *   2. Un token JWT válido
 * 
 * Uso:
 *   node test-verification-upload.js <JWT_TOKEN> [ownerId]
 */

require("dotenv").config();
const http = require("http");

const TOKEN = process.argv[2];
const OWNER_ID = process.argv[3] || "test-owner";

if (!TOKEN) {
  console.error("❌ Uso: node test-verification-upload.js <JWT_TOKEN> [ownerId]");
  console.error("   Ejemplo: node test-verification-upload.js eyJhbGciOiJIUzI1...");
  process.exit(1);
}

const payload = {
  documentTypeId: 1,
  fileName: `test_${Date.now()}.pdf`,
};

console.log("🧪 Probando POST /api/verification-documents");
console.log(`  Token: ${TOKEN.slice(0, 20)}...`);
console.log(`  Payload:`, JSON.stringify(payload, null, 2));
console.log("");

const data = JSON.stringify(payload);

const options = {
  hostname: "localhost",
  port: 3001,
  path: "/api/verification-documents",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": data.length,
    "Authorization": `Bearer ${TOKEN}`,
  },
};

const req = http.request(options, (res) => {
  let body = "";
  res.on("data", (chunk) => (body += chunk));
  res.on("end", () => {
    console.log(`📡 Respuesta: ${res.statusCode} ${res.statusMessage}`);
    console.log("");
    try {
      const json = JSON.parse(body);
      console.log(JSON.stringify(json, null, 2));
    } catch {
      console.log(body);
    }
  });
});

req.on("error", (e) => {
  console.error("❌ Error de conexión:", e.message);
  console.error("   ¿El backend está corriendo en localhost:3001?");
});

req.write(data);
req.end();
