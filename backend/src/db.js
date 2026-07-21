const { Pool } = require("pg");
const { databaseUrl } = require("./config");

const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
    })
  : null;

/**
 * Ejecuta una consulta usando el pool compartido.
 * @param {string} text
 * @param {Array} [params]
 * @returns {Promise<import("pg").QueryResult>}
 */
function query(text, params) {
  if (!pool) {
    throw new Error("DATABASE_URL is required");
  }

  return pool.query(text, params);
}

/**
 * Obtiene un cliente del pool para ejecutar transacciones.
 * El llamador es responsable de liberarlo con client.release().
 * @returns {Promise<import("pg").PoolClient>}
 */
async function getClient() {
  if (!pool) {
    throw new Error("DATABASE_URL is required");
  }
  return pool.connect();
}

module.exports = {
  query,
  getClient,
  close: () => pool.end(),
};
