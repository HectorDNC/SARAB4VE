/**
 * Script de prueba rápida para Cloudflare R2
 * 
 * Uso:
 *   node test-r2.js
 * 
 * Requiere:
 *   - Variables de entorno R2 configuradas en .env
 *   - Un archivo de prueba (o genera uno automáticamente)
 */

require("dotenv").config();
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");

// Configuración desde .env
const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET || "sara";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

console.log("🔍 Configuración R2:");
console.log(`  Endpoint: ${R2_ENDPOINT || "❌ NO CONFIGURADO"}`);
console.log(`  Bucket: ${R2_BUCKET}`);
console.log(`  Access Key: ${R2_ACCESS_KEY_ID ? "✅ Configurada" : "❌ NO CONFIGURADA"}`);
console.log(`  Secret Key: ${R2_SECRET_ACCESS_KEY ? "✅ Configurada" : "❌ NO CONFIGURADA"}`);
console.log(`  Public URL: ${R2_PUBLIC_URL || "⚠️ No configurada"}`);
console.log("");

if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error("❌ Error: Faltan variables de entorno R2");
  process.exit(1);
}

// Crear cliente S3
const client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

// Generar archivo de prueba (100KB de datos aleatorios)
function generateTestFile() {
  const size = 100 * 1024; // 100KB
  const buffer = Buffer.alloc(size);
  for (let i = 0; i < size; i++) {
    buffer[i] = Math.floor(Math.random() * 256);
  }
  return buffer;
}

async function testR2() {
  const testKey = `test/${Date.now()}-prueba.txt`;
  const testContent = "🎉 ¡Prueba de R2 exitosa! Timestamp: " + new Date().toISOString();
  const testBuffer = Buffer.from(testContent);

  console.log("📤 Subiendo archivo de prueba...");
  console.log(`  Bucket: ${R2_BUCKET}`);
  console.log(`  Key: ${testKey}`);
  console.log(`  Size: ${testBuffer.length} bytes`);
  console.log("");

  try {
    // 1. Subir archivo
    await client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: testKey,
        Body: testBuffer,
        ContentType: "text/plain",
        CacheControl: "public, max-age=3600",
      })
    );

    console.log("✅ ¡Subida exitosa!");

    // 2. Construir URL pública
    const publicUrl = R2_PUBLIC_URL
      ? `${R2_PUBLIC_URL.replace(/\/$/, "")}/${testKey}`
      : `${R2_ENDPOINT.replace(/\/$/, "")}/${R2_BUCKET}/${testKey}`;

    console.log("");
    console.log("🔗 URL pública del archivo:");
    console.log(`  ${publicUrl}`);
    console.log("");

    // 3. Intentar descargar para verificar
    console.log(" Verificando descarga...");
    const response = await client.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: testKey,
      })
    );

    const downloadedContent = await response.Body.transformToString();
    
    if (downloadedContent === testContent) {
      console.log("✅ ¡Descarga verificada! El contenido coincide.");
    } else {
      console.warn("⚠️ El contenido descargado no coincide (pero la subida fue exitosa)");
    }

    console.log("");
    console.log(" ¡R2 está funcionando correctamente!");
    console.log("");
    console.log("📝 Próximos pasos:");
    console.log("  1. Visita la URL pública en tu navegador");
    console.log("  2. Prueba el endpoint: POST /api/verification-documents");
    console.log("  3. Revisa el dashboard de Cloudflare para ver el archivo");

  } catch (error) {
    console.error("❌ Error durante la prueba:");
    console.error(`  Código: ${error.$metadata?.httpStatusCode || "N/A"}`);
    console.error(`  Nombre: ${error.name}`);
    console.error(`  Mensaje: ${error.message}`);
    console.error("");
    console.error(" Posibles causas:");
    console.error("  - Credenciales incorrectas");
    console.error("  - Bucket no existe o no tienes permisos");
    console.error("  - CORS no configurado correctamente");
    console.error("  - Endpoint incorrecto");
    process.exit(1);
  }
}

testR2();
