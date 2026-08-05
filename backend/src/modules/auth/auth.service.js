/**
 * Servicio — lógica de negocio para el dominio de auth (registro).
 * Orquesta validación, hasheo de contraseñas y transacciones atómicas.
 */
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { jwtSecret, adminSecret } = require("../../config");

/** Costo del hash bcrypt (12 rondas ≈ buena seguridad sin ser muy lento). */
const BCRYPT_ROUNDS = 12;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Duración del access token: 8 horas. */
const TOKEN_EXPIRATION = "8h";

/**
 * Hashea un password en texto plano usando bcrypt.
 * @param {string} plainPassword
 * @returns {Promise<string>}
 */
async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
}

/**
 * Emite un JWT para un usuario recién registrado.
 * Permite que el usuario acceda inmediatamente a endpoints protegidos
 * (ej: completar su perfil de verificación) sin pasar por login,
 * que bloquearía a usuarios en estado 'pending'.
 *
 * @param {Object} user — fila de users con id, role, status
 * @returns {string} — token JWT firmado
 */
function issueToken(user) {
  if (!jwtSecret) {
    throw new Error("JWT_SECRET no está configurado en el entorno");
  }

  return jwt.sign(
    { userId: user.id, role: user.role, status: user.status },
    jwtSecret,
    { expiresIn: TOKEN_EXPIRATION },
  );
}

/**
 * Determina si el error de PostgreSQL es una violación de unique constraint
 * y extrae el nombre de la columna duplicada.
 * @param {Error & { code?: string, constraint?: string }} error
 * @returns {{ isUniqueViolation: boolean, field: string|null }}
 */
function parseUniqueViolation(error) {
  if (error.code === "23505") {
    // El mensaje de PG incluye el nombre del constraint, ej: "users_email_key"
    const constraint = error.constraint || "";
    if (constraint.includes("email")) {
      return { isUniqueViolation: true, field: "email" };
    }
    if (constraint.includes("phone")) {
      return { isUniqueViolation: true, field: "phone" };
    }
    return { isUniqueViolation: true, field: "desconocido" };
  }
  return { isUniqueViolation: false, field: null };
}

// ---------------------------------------------------------------------------
// Registro — Citizen
// ---------------------------------------------------------------------------

/**
 * Registra un ciudadano.
 * Solo crea registro en users (status = approved automáticamente).
 * No crea fila en user_details.
 *
 * @param {Object} payload — cuerpo del request sin procesar
 * @param {Object} schema — auth.schema
 * @param {Object} repository — auth.repository
 * @returns {Promise<{ data: Object, status: number, errors?: string[] }>}
 */
async function registerCitizen(payload, schema, repository) {
  const normalized = schema.normalizeRegisterCitizen(payload);
  const passwordHash = await hashPassword(normalized.user.password);

  try {
    const user = await repository.withTransaction(async (client) => {
      return repository.insertUser(client, {
        ...normalized.user,
        passwordHash,
      });
    });

    const token = issueToken(user);

    return { data: { token, user }, status: 201 };
  } catch (error) {
    const { isUniqueViolation, field } = parseUniqueViolation(error);
    if (isUniqueViolation) {
      return {
        errors: [`El ${field} ya está registrado en el sistema`],
        status: 409,
      };
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Registro — Volunteer
// ---------------------------------------------------------------------------

/**
 * Registra un voluntario.
 * Crea registro en users (status = pending) + fila en user_details.
 * Usa transacción atómica: si falla details, hace rollback de users.
 *
 * @param {Object} payload — cuerpo del request sin procesar
 * @param {Object} schema — auth.schema
 * @param {Object} repository — auth.repository
 * @returns {Promise<{ data: Object, status: number, errors?: string[] }>}
 */
async function registerVolunteer(payload, schema, repository) {
  const normalized = schema.normalizeRegisterVolunteer(payload);
  const passwordHash = await hashPassword(normalized.user.password);

  try {
    const result = await repository.withTransaction(async (client) => {
      const user = await repository.insertUser(client, {
        ...normalized.user,
        passwordHash,
      });

      const details = await repository.insertUserDetails(
        client,
        user.id,
        normalized.details,
      );

      return { ...user, details };
    });

    const token = issueToken(result);

    return { data: { token, user: result }, status: 201 };
  } catch (error) {
    const { isUniqueViolation, field } = parseUniqueViolation(error);
    if (isUniqueViolation) {
      return {
        errors: [`El ${field} ya está registrado en el sistema`],
        status: 409,
      };
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Registro — Organization
// ---------------------------------------------------------------------------

/**
 * Registra una organización.
 * Crea registro en users (status = pending) + fila en user_details.
 * Usa transacción atómica: si falla details, hace rollback de users.
 *
 * @param {Object} payload — cuerpo del request sin procesar
 * @param {Object} schema — auth.schema
 * @param {Object} repository — auth.repository
 * @returns {Promise<{ data: Object, status: number, errors?: string[] }>}
 */
async function registerOrganization(payload, schema, repository) {
  const normalized = schema.normalizeRegisterOrganization(payload);
  const passwordHash = await hashPassword(normalized.user.password);

  try {
    const result = await repository.withTransaction(async (client) => {
      const user = await repository.insertUser(client, {
        ...normalized.user,
        passwordHash,
      });

      const details = await repository.insertUserDetails(
        client,
        user.id,
        normalized.details,
      );

      return { ...user, details };
    });

    const token = issueToken(result);

    return { data: { token, user: result }, status: 201 };
  } catch (error) {
    const { isUniqueViolation, field } = parseUniqueViolation(error);
    if (isUniqueViolation) {
      return {
        errors: [`El ${field} ya está registrado en el sistema`],
        status: 409,
      };
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Registro — Admin
// ---------------------------------------------------------------------------

/**
 * Registra un administrador.
 * Solo crea registro en users (status = approved automáticamente).
 * No crea fila en user_details.
 * Protegido por ADMIN_SECRET: el payload debe incluir el secreto correcto.
 *
 * @param {Object} payload — cuerpo del request sin procesar
 * @param {Object} schema — auth.schema
 * @param {Object} repository — auth.repository
 * @returns {Promise<{ data: Object, status: number, errors?: string[] }>}
 */
async function registerAdmin(payload, schema, repository) {
  
  const normalized = schema.normalizeRegisterAdmin(payload);
  const passwordHash = await hashPassword(normalized.user.password);

  try {
    const user = await repository.withTransaction(async (client) => {
      return repository.insertUser(client, {
        ...normalized.user,
        passwordHash,
      });
    });

    return { data: user, status: 201 };
  } catch (error) {
    const { isUniqueViolation, field } = parseUniqueViolation(error);
    if (isUniqueViolation) {
      return {
        errors: [`El ${field} ya está registrado en el sistema`],
        status: 409,
      };
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Autenticación — Login
// ---------------------------------------------------------------------------

/** Estados de registro que NO pueden iniciar sesión. */
const BLOCKED_STATUSES = new Set(["pending", "rejected", "suspended"]);

/**
 * Inicia sesión con email + password.
 * Verifica credenciales, estado de registro, y emite un JWT.
 * Por seguridad, nunca revela si el email existe o no — siempre responde
 * "credenciales inválidas" ante cualquier fallo de autenticación, excepto
 * cuando la cuenta está bloqueada por estado (pending/rejected/suspended),
 * donde se informa el motivo real para que el usuario sepa qué esperar.
 *
 * @param {string} email
 * @param {string} password — texto plano
 * @param {Object} repository — auth.repository
 * @returns {Promise<{ data?: { token: string, user: Object }, status: number, errors?: string[] }>}
 */
async function login(email, password, repository) {
  // Buscar usuario por email
  const user = await repository.findUserByEmail(email);

  // Si no existe → credenciales inválidas (sin revelar si el email existe)
  if (!user) {
    return {
      errors: ["Credenciales inválidas"],
      status: 401,
    };
  }

  // Verificar que el estado permita iniciar sesión
  if (BLOCKED_STATUSES.has(user.status)) {
    const mensajes = {
      pending: "Tu cuenta está pendiente de aprobación. Recibirás una notificación cuando sea revisada.",
      rejected: "Tu cuenta ha sido rechazada. Contacta al equipo de soporte para más información.",
      suspended: "Tu cuenta ha sido suspendida. Contacta al equipo de soporte para más información.",
    };
    return {
      errors: [mensajes[user.status] || `Tu cuenta no puede iniciar sesión (estado: ${user.status})`],
      status: 403,
    };
  }

  // Comparar contraseñas
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    return {
      errors: ["Credenciales inválidas"],
      status: 401,
    };
  }

  // Generar JWT
  const token = issueToken(user);

  // Eliminar passwordHash de la respuesta
  const { passwordHash, ...safeUser } = user;

  return {
    data: { token, user: safeUser },
    status: 200,
  };
}

// ---------------------------------------------------------------------------
// Autenticación — Verify Token
// ---------------------------------------------------------------------------

/**
 * Verifica y decodifica un JWT.
 * @param {string} token
 * @returns {{ valid: boolean, payload?: { userId: string, role: string, status: string }, error?: string }}
 */
function verifyToken(token) {
  if (!jwtSecret) {
    return { valid: false, error: "JWT_SECRET no está configurado en el entorno" };
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    return { valid: true, payload };
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return { valid: false, error: "El token ha expirado. Inicia sesión nuevamente." };
    }
    if (error.name === "JsonWebTokenError") {
      return { valid: false, error: "Token inválido" };
    }
    return { valid: false, error: "Error al verificar el token" };
  }
}

module.exports = {
  registerCitizen,
  registerVolunteer,
  registerOrganization,
  registerAdmin,
  login,
  verifyToken,
  issueToken,
};
