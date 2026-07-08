/**
 * Esquema — constantes, validación y normalización para el dominio de auth.
 * Las utilidades de validación reutilizables viven en src/lib/validation.js.
 */
const { isBlank, isFiniteNumber, toNumber } = require("../../lib/validation");

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Roles válidos en el sistema. */
const ROLES = ["citizen", "volunteer", "organization", "admin"];

/** Días de la semana aceptados para available_days. */
const VALID_DAYS = [
  "lunes",
  "martes",
  "miercoles",
  "miércoles",
  "jueves",
  "viernes",
  "sabado",
  "sábado",
  "domingo",
];

const VALID_DAYS_SET = new Set(VALID_DAYS);

/** Estados iniciales según el rol. */
const INITIAL_STATUS = {
  citizen: "approved",
  volunteer: "pending",
  organization: "pending",
  admin: "approved",
};

// ---------------------------------------------------------------------------
// Helpers de validación
// ---------------------------------------------------------------------------

/**
 * Valida que el email tenga un formato razonable.
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Valida que el teléfono tenga un formato internacional o local básico.
 * Acepta: +58XXXXXXXXX, 58XXXXXXXXX, 0XXX-XXXXXXX, etc.
 * @param {string} phone
 * @returns {boolean}
 */
function isValidPhone(phone) {
  return /^\+?[0-9]{7,15}$/.test(phone.replace(/[\s-]/g, ""));
}

/**
 * Valida que el password tenga al menos 8 caracteres.
 * @param {string} password
 * @returns {boolean}
 */
function isValidPassword(password) {
  return typeof password === "string" && password.length >= 8;
}

/**
 * Valida campos comunes a todos los registros (fullName, email, phone, password, location, zone).
 * @param {Object} payload
 * @returns {string[]} — Array de errores (vacío si es válido)
 */
function validateCommonFields(payload) {
  const errors = [];

  // fullName — requerido
  if (isBlank(payload.fullName)) {
    errors.push("fullName es requerido");
  }

  // email — requerido y con formato válido
  if (isBlank(payload.email)) {
    errors.push("email es requerido");
  } else if (!isValidEmail(payload.email.trim())) {
    errors.push("email no tiene un formato válido");
  }

  // phone — requerido y con formato válido
  if (isBlank(payload.phone)) {
    errors.push("phone es requerido");
  } else if (!isValidPhone(payload.phone.trim())) {
    errors.push("phone no tiene un formato válido (mínimo 7 dígitos)");
  }

  // password — requerido y mínimo 8 caracteres
  if (isBlank(payload.password)) {
    errors.push("password es requerido");
  } else if (!isValidPassword(payload.password)) {
    errors.push("password debe tener al menos 8 caracteres");
  }

  // location — opcional, pero si viene debe ser válido
  if (payload.location !== undefined && payload.location !== null) {
    const lat = toNumber(payload.location?.lat);
    const lng = toNumber(payload.location?.lng);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      errors.push("location.lat debe ser una coordenada válida (-90 a 90)");
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      errors.push("location.lng debe ser una coordenada válida (-180 a 180)");
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Validación — Citizen
// ---------------------------------------------------------------------------

/**
 * Valida el payload de registro de ciudadano.
 * @param {Object} payload
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validateRegisterCitizen(payload) {
  const errors = validateCommonFields(payload);

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Validación — Volunteer
// ---------------------------------------------------------------------------

/**
 * Valida el payload de registro de voluntario.
 * @param {Object} payload
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validateRegisterVolunteer(payload) {
  const errors = validateCommonFields(payload);

  // skills — requerido, al menos una
  if (!Array.isArray(payload.skills) || payload.skills.length === 0) {
    errors.push("skills es requerido y debe contener al menos una habilidad");
  } else if (payload.skills.some((s) => isBlank(s))) {
    errors.push("skills contiene valores vacíos");
  }

  // availableHours — requerido, entre 1 y 168
  const hours = toNumber(payload.availableHours);
  if (!Number.isFinite(hours) || hours < 1 || hours > 168) {
    errors.push("availableHours es requerido y debe estar entre 1 y 168");
  }

  // availableDays — requerido, al menos un día válido
  if (!Array.isArray(payload.availableDays) || payload.availableDays.length === 0) {
    errors.push("availableDays es requerido y debe contener al menos un día");
  } else {
    const invalidDays = payload.availableDays.filter(
      (d) => !VALID_DAYS_SET.has(d?.toLowerCase?.() ?? ""),
    );
    if (invalidDays.length > 0) {
      errors.push(
        `availableDays contiene valores inválidos: ${invalidDays.join(", ")}. Válidos: ${VALID_DAYS.join(", ")}`,
      );
    }
  }

  // acceptedTerms — debe ser true
  if (payload.acceptedTerms !== true) {
    errors.push("acceptedTerms debe ser true para registrarse como voluntario");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Validación — Organization
// ---------------------------------------------------------------------------

/**
 * Valida el payload de registro de organización.
 * @param {Object} payload
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validateRegisterOrganization(payload) {
  const errors = validateCommonFields(payload);

  // organizationName — requerido
  if (isBlank(payload.organizationName)) {
    errors.push("organizationName es requerido para organizaciones");
  }

  // legalDocument — requerido
  if (isBlank(payload.legalDocument)) {
    errors.push("legalDocument es requerido para organizaciones");
  }

  // workArea — opcional, pero si viene debe ser array de strings
  if (payload.workArea !== undefined && payload.workArea !== null) {
    if (!Array.isArray(payload.workArea)) {
      errors.push("workArea debe ser un arreglo de strings");
    } else if (payload.workArea.some((a) => isBlank(a))) {
      errors.push("workArea contiene valores vacíos");
    }
  }

  // acceptedTerms — debe ser true
  if (payload.acceptedTerms !== true) {
    errors.push("acceptedTerms debe ser true para registrarse como organización");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Normalización — Citizen
// ---------------------------------------------------------------------------

/**
 * Normaliza el payload de registro de ciudadano para inserción en DB.
 * @param {Object} payload — ya validado
 * @returns {{ user: Object }}
 */
function normalizeRegisterCitizen(payload) {
  return {
    user: {
      fullName: payload.fullName.trim(),
      email: payload.email.trim().toLowerCase(),
      phone: payload.phone.trim().replace(/[\s-]/g, ""),
      password: payload.password, // Se hashea en el servicio
      role: "citizen",
      status: "approved",
      location: payload.location || null,
      zone: payload.zone?.trim() || null,
    },
  };
}

// ---------------------------------------------------------------------------
// Normalización — Volunteer
// ---------------------------------------------------------------------------

/**
 * Normaliza el payload de registro de voluntario para inserción en DB.
 * @param {Object} payload — ya validado
 * @returns {{ user: Object, details: Object }}
 */
function normalizeRegisterVolunteer(payload) {
  return {
    user: {
      fullName: payload.fullName.trim(),
      email: payload.email.trim().toLowerCase(),
      phone: payload.phone.trim().replace(/[\s-]/g, ""),
      password: payload.password,
      role: "volunteer",
      status: "pending",
      location: payload.location || null,
      zone: payload.zone?.trim() || null,
    },
    details: {
      skills: payload.skills.map((s) => s.trim()),
      availableHours: Number(payload.availableHours),
      availableDays: payload.availableDays.map((d) => d.toLowerCase().trim()),
      acceptedTerms: true,
    },
  };
}

// ---------------------------------------------------------------------------
// Normalización — Organization
// ---------------------------------------------------------------------------

/**
 * Normaliza el payload de registro de organización para inserción en DB.
 * @param {Object} payload — ya validado
 * @returns {{ user: Object, details: Object }}
 */
function normalizeRegisterOrganization(payload) {
  return {
    user: {
      fullName: payload.fullName.trim(),
      email: payload.email.trim().toLowerCase(),
      phone: payload.phone.trim().replace(/[\s-]/g, ""),
      password: payload.password,
      role: "organization",
      status: "pending",
      location: payload.location || null,
      zone: payload.zone?.trim() || null,
    },
    details: {
      organizationName: payload.organizationName.trim(),
      legalDocument: payload.legalDocument.trim(),
      workArea: payload.workArea?.map((a) => a.trim()) || null,
      acceptedTerms: true,
    },
  };
}

// ---------------------------------------------------------------------------
// Validación — Admin
// ---------------------------------------------------------------------------

/**
 * Valida el payload de registro de administrador.
 * Requiere adminSecret para autorizar la creación.
 * @param {Object} payload
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validateRegisterAdmin(payload) {
  const errors = validateCommonFields(payload);

  // adminSecret — requerido
  if (isBlank(payload.adminSecret)) {
    errors.push("adminSecret es requerido para registrar un administrador");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Normalización — Admin
// ---------------------------------------------------------------------------

/**
 * Normaliza el payload de registro de administrador para inserción en DB.
 * No se crea fila en user_details (igual que citizen).
 * @param {Object} payload — ya validado
 * @returns {{ user: Object }}
 */
function normalizeRegisterAdmin(payload) {
  return {
    user: {
      fullName: payload.fullName.trim(),
      email: payload.email.trim().toLowerCase(),
      phone: payload.phone.trim().replace(/[\s-]/g, ""),
      password: payload.password,
      role: "admin",
      status: "approved",
      location: payload.location || null,
      zone: payload.zone?.trim() || null,
    },
  };
}

module.exports = {
  // Constantes
  ROLES,
  VALID_DAYS,
  VALID_DAYS_SET,
  INITIAL_STATUS,
  // Helpers
  isValidEmail,
  isValidPhone,
  isValidPassword,
  validateCommonFields,
  // Validación
  validateRegisterCitizen,
  validateRegisterVolunteer,
  validateRegisterOrganization,
  validateRegisterAdmin,
  // Normalización
  normalizeRegisterCitizen,
  normalizeRegisterVolunteer,
  normalizeRegisterOrganization,
  normalizeRegisterAdmin,
};
