/**
 * Servicio de almacenamiento — upload de archivos a Cloudflare R2 (API S3-compatible).
 *
 * Expone:
 *   - uploadAudio(fileBuffer, fileName, mimeType): sube un audio a R2 y retorna la URL pública.
 *
 * Requiere las variables de entorno:
 *   R2_ENDPOINT       — endpoint S3 de R2 (ej: https://<id>.r2.cloudflarestorage.com)
 *   R2_ACCESS_KEY_ID  — access key de R2
 *   R2_SECRET_ACCESS_KEY — secret key de R2
 *   R2_BUCKET         — nombre del bucket (default: "sara-audio")
 *   R2_PUBLIC_URL     — URL pública base para los objetos (ej: https://pub-<hash>.r2.dev)
 */

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

// ---------------------------------------------------------------------------
// Configuración del cliente R2 (S3-compatible)
// ---------------------------------------------------------------------------

const R2_ENDPOINT = process.env.R2_ENDPOINT || "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET = process.env.R2_BUCKET || "sara-audio";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

/** Cliente S3 configurado para Cloudflare R2. Solo se crea si hay credenciales. */
let s3Client = null;

function getClient() {
  if (!s3Client && R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY) {
    s3Client = new S3Client({
      region: "auto",
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    });
  }
  return s3Client;
}

// ---------------------------------------------------------------------------
// uploadAudio
// ---------------------------------------------------------------------------

/**
 * Sube un archivo de audio a Cloudflare R2.
 *
 * @param {Buffer} fileBuffer — contenido binario del archivo
 * @param {string} fileName  — nombre original del archivo (se usa para extensión)
 * @param {string} mimeType  — MIME type del archivo (ej: "audio/webm", "audio/mp4")
 * @returns {Promise<string>} URL pública del audio subido
 * @throws {Error} si R2 no está configurado o falla la subida
 */
async function uploadAudio(fileBuffer, fileName, mimeType) {
  const client = getClient();

  if (!client) {
    throw new Error(
      "R2 no está configurado. Revisa R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.",
    );
  }

  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error("El archivo de audio está vacío.");
  }

  // Generar un key único: voice/<timestamp>-<random>-<nombre original>
  const ext = fileName.includes(".") ? fileName.split(".").pop() : "webm";
  const uniqueName = `voice/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: uniqueName,
      Body: fileBuffer,
      ContentType: mimeType || "audio/webm",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  // Construir la URL pública
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL.replace(/\/$/, "")}/${uniqueName}`;
  }

  // Fallback: URL directa de R2 (requiere que el bucket sea público)
  return `${R2_ENDPOINT.replace(/\/$/, "")}/${R2_BUCKET}/${uniqueName}`;
}

module.exports = { uploadAudio };
