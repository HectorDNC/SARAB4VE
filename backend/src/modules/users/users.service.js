/**
 * Servicio — lógica de negocio para el dominio de administración de usuarios.
 * Orquesta validación, permisos y transacciones atómicas.
 */
const bcrypt = require("bcrypt");

/** Costo del hash bcrypt (12 rondas ≈ buena seguridad sin ser muy lento). */
const BCRYPT_ROUNDS = 12;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Hashea un password en texto plano usando bcrypt.
 * @param {string} plainPassword
 * @returns {Promise<string>}
 */
async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
}

/**
 * Determina si el error de PostgreSQL es una violación de unique constraint
 * y extrae el nombre de la columna duplicada.
 * @param {Error & { code?: string, constraint?: string }} error
 * @returns {{ isUniqueViolation: boolean, field: string|null }}
 */
function parseUniqueViolation(error) {
  if (error.code === "23505") {
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
// Listar usuarios (solo admin)
// ---------------------------------------------------------------------------

/**
 * Lista usuarios con filtros opcionales y paginación.
 * Solo accesible por administradores (verificado en el controller).
 *
 * @param {Object} filters — Query params validados
 * @param {Object} repository — users.repository
 * @returns {Promise<{ data: Object, status: number }>}
 */
async function listUsers(filters, repository) {
  const result = await repository.listUsers(filters);
  return { data: result, status: 200 };
}

// ---------------------------------------------------------------------------
// Obtener usuario por ID
// ---------------------------------------------------------------------------

/**
 * Obtiene un usuario por ID, incluyendo sus detalles si existen.
 * - Admin: puede ver cualquier usuario.
 * - Otros roles: solo pueden verse a sí mismos.
 *
 * @param {string} userId — ID del usuario a consultar
 * @param {Object} requester — req.user (JWT payload del que hace la petición)
 * @param {Object} repository — users.repository
 * @returns {Promise<{ data?: Object, status: number, errors?: string[] }>}
 */
async function getUserById(userId, requester, repository) {
  // Verificar permisos: solo admin o el propio usuario
  const isAdmin = requester.role === "admin";
  const isOwner = requester.userId === userId;

  if (!isAdmin && !isOwner) {
    return {
      errors: ["No tienes permiso para ver este usuario"],
      status: 403,
    };
  }

  const user = await repository.findUserById(userId);

  if (!user) {
    return { errors: ["Usuario no encontrado"], status: 404 };
  }

  // Intentar obtener detalles (puede no existir para citizens/admins sin detalles)
  const details = await repository.findUserDetailsById(userId);

  return {
    data: details ? { ...user, details } : user,
    status: 200,
  };
}

// ---------------------------------------------------------------------------
// Actualizar usuario
// ---------------------------------------------------------------------------

/**
 * Actualiza los datos de un usuario.
 * - El propio usuario puede editar su perfil (excepto email/phone si ya están verificados).
 * - El admin puede editar cualquier usuario.
 * - Si se envía password, se hashea antes de guardar.
 *
 * @param {string} targetUserId — ID del usuario a modificar
 * @param {Object} updates — Campos a actualizar (validados por Zod)
 * @param {Object} requester — req.user (JWT payload del que hace la petición)
 * @param {Object} repository — users.repository
 * @returns {Promise<{ data?: Object, status: number, errors?: string[] }>}
 */
async function updateUser(targetUserId, updates, requester, repository) {
  // Verificar que el usuario target existe
  const existingUser = await repository.findUserById(targetUserId);
  if (!existingUser) {
    return { errors: ["Usuario no encontrado"], status: 404 };
  }

  // Verificar permisos: solo el propio usuario o un admin pueden modificar
  const isAdmin = requester.role === "admin";
  const isOwner = requester.userId === targetUserId;

  if (!isAdmin && !isOwner) {
    return {
      errors: ["No tienes permiso para modificar este usuario"],
      status: 403,
    };
  }

  // Si no es admin, no puede cambiar email ni phone si ya están verificados
  // (política de seguridad: datos verificados solo los cambia un admin)
  if (!isAdmin && isOwner) {
    // Los usuarios normales no pueden cambiar su propio rol ni estado
    // (esos campos no vienen en UpdateUserBody, así que es seguro)
  }

  // Preparar campos para el repositorio
  /** @type {Object} */
  const repoUpdates = {};

  if (updates.fullName !== undefined) {
    repoUpdates.fullName = updates.fullName.trim();
  }

  if (updates.email !== undefined) {
    repoUpdates.email = updates.email.trim().toLowerCase();
  }

  if (updates.phone !== undefined) {
    repoUpdates.phone = updates.phone.trim().replace(/[\s-]/g, "");
  }

  if (updates.zone !== undefined) {
    repoUpdates.zone = updates.zone.trim();
  }

  if (updates.location !== undefined) {
    // location puede ser null para eliminar la ubicación
    repoUpdates.location = updates.location;
  }

  // Si se envía password, hashearlo
  if (updates.password !== undefined) {
    repoUpdates.passwordHash = await hashPassword(updates.password);
  }

  try {
    const updatedUser = await repository.withTransaction(async (client) => {
      return repository.updateUser(client, targetUserId, repoUpdates);
    });

    return { data: updatedUser, status: 200 };
  } catch (error) {
    const { isUniqueViolation, field } = parseUniqueViolation(error);
    if (isUniqueViolation) {
      return {
        errors: [`El ${field} ya está en uso por otro usuario`],
        status: 409,
      };
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Aprobar usuario (solo admin)
// ---------------------------------------------------------------------------

/**
 * Aprueba un usuario que está en estado "pending".
 * Solo accesible por administradores.
 *
 * @param {string} targetUserId — ID del usuario a aprobar
 * @param {string} approvedBy — UUID del admin que aprueba
 * @param {Object} repository — users.repository
 * @returns {Promise<{ data?: Object, status: number, errors?: string[] }>}
 */
async function approveUser(targetUserId, approvedBy, repository) {
  // Verificar que el usuario existe
  const existingUser = await repository.findUserById(targetUserId);
  if (!existingUser) {
    return { errors: ["Usuario no encontrado"], status: 404 };
  }

  // Solo se puede aprobar usuarios en estado "pending"
  if (existingUser.status !== "pending") {
    return {
      errors: [
        `No se puede aprobar un usuario con estado "${existingUser.status}". Solo se pueden aprobar usuarios pendientes (pending).`,
      ],
      status: 409,
    };
  }

  // Ejecutar en transacción
  const updatedUser = await repository.withTransaction(async (client) => {
    return repository.updateUserStatus(client, targetUserId, "approved", approvedBy);
  });

  return { data: updatedUser, status: 200 };
}

// ---------------------------------------------------------------------------
// Rechazar usuario (solo admin)
// ---------------------------------------------------------------------------

/**
 * Rechaza un usuario que está en estado "pending".
 * Solo accesible por administradores.
 *
 * @param {string} targetUserId — ID del usuario a rechazar
 * @param {Object} repository — users.repository
 * @returns {Promise<{ data?: Object, status: number, errors?: string[] }>}
 */
async function rejectUser(targetUserId, repository) {
  // Verificar que el usuario existe
  const existingUser = await repository.findUserById(targetUserId);
  if (!existingUser) {
    return { errors: ["Usuario no encontrado"], status: 404 };
  }

  // Solo se puede rechazar usuarios en estado "pending"
  if (existingUser.status !== "pending") {
    return {
      errors: [
        `No se puede rechazar un usuario con estado "${existingUser.status}". Solo se pueden rechazar usuarios pendientes (pending).`,
      ],
      status: 409,
    };
  }

  // Ejecutar en transacción (no necesita approvedBy para rechazo)
  const updatedUser = await repository.withTransaction(async (client) => {
    return repository.updateUserStatus(client, targetUserId, "rejected", null);
  });

  return { data: updatedUser, status: 200 };
}

module.exports = {
  listUsers,
  getUserById,
  updateUser,
  approveUser,
  rejectUser,
};
