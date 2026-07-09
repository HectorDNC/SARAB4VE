/**
 * Controlador — handlers HTTP para el dominio de auth (registro).
 * Cada handler es una factoría que recibe service, schema y repository.
 *
 * Cambio: la validación ahora usa Zod.safeParse() en vez de schema.validate*().
 */
const {
  RegisterCitizenBody,
  RegisterVolunteerBody,
  RegisterOrganizationBody,
  RegisterAdminBody,
  LoginBody,
} = require("./auth.schema");

// ---------------------------------------------------------------------------
// Helper — convierte errores de Zod al formato { errors: string[] }
// ---------------------------------------------------------------------------

/**
 * Convierte un ZodError en el formato de errores de SARA.
 * Compatible con Zod v3 (.errors) y Zod v4 (.issues).
 * @param {import("zod").ZodError} zodError
 * @returns {string[]}
 */
function formatZodErrors(zodError) {
  const issues = zodError?.issues || zodError?.errors || [];
  return issues.map(
    (e) => `${e.path.join(".")}: ${e.message}`,
  );
}

// ---------------------------------------------------------------------------
// POST /api/auth/register/citizen
// ---------------------------------------------------------------------------

/**
 * @param {Object} service — auth.service
 * @param {Object} schema  — auth.schema
 * @param {Object} repository — auth.repository
 * @returns {(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => Promise<void>}
 */
function registerCitizen(service, schema, repository) {
  return async (req, res, next) => {
    // Validación con Zod
    const validation = RegisterCitizenBody.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ errors: formatZodErrors(validation.error) });
    }

    try {
      // validation.data ya tiene los campos validados
      const result = await service.registerCitizen(validation.data, schema, repository);

      if (result.errors) {
        return res.status(result.status).json({ errors: result.errors });
      }

      return res.status(201).json({ data: result.data });
    } catch (error) {
      return next(error);
    }
  };
}

// ---------------------------------------------------------------------------
// POST /api/auth/register/volunteer
// ---------------------------------------------------------------------------

/**
 * @param {Object} service — auth.service
 * @param {Object} schema  — auth.schema
 * @param {Object} repository — auth.repository
 * @returns {(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => Promise<void>}
 */
function registerVolunteer(service, schema, repository) {
  return async (req, res, next) => {
    // Validación con Zod
    const validation = RegisterVolunteerBody.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ errors: formatZodErrors(validation.error) });
    }

    try {
      // validation.data ya tiene los campos validados
      const result = await service.registerVolunteer(validation.data, schema, repository);

      if (result.errors) {
        return res.status(result.status).json({ errors: result.errors });
      }

      return res.status(201).json({ data: result.data });
    } catch (error) {
      return next(error);
    }
  };
}

// ---------------------------------------------------------------------------
// POST /api/auth/register/organization
// ---------------------------------------------------------------------------

/**
 * @param {Object} service — auth.service
 * @param {Object} schema  — auth.schema
 * @param {Object} repository — auth.repository
 * @returns {(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => Promise<void>}
 */
function registerOrganization(service, schema, repository) {
  return async (req, res, next) => {
    // Validación con Zod
    const validation = RegisterOrganizationBody.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ errors: formatZodErrors(validation.error) });
    }

    try {
      // validation.data ya tiene los campos validados
      const result = await service.registerOrganization(validation.data, schema, repository);

      if (result.errors) {
        return res.status(result.status).json({ errors: result.errors });
      }

      return res.status(201).json({ data: result.data });
    } catch (error) {
      return next(error);
    }
  };
}

// ---------------------------------------------------------------------------
// POST /api/auth/register/admin
// ---------------------------------------------------------------------------

/**
 * @param {Object} service — auth.service
 * @param {Object} schema  — auth.schema
 * @param {Object} repository — auth.repository
 * @returns {(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => Promise<void>}
 */
function registerAdmin(service, schema, repository) {
  return async (req, res, next) => {
    // Validación con Zod
    const validation = RegisterAdminBody.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ errors: formatZodErrors(validation.error) });
    }

    try {
      // validation.data ya tiene los campos validados
      const result = await service.registerAdmin(validation.data, schema, repository);

      if (result.errors) {
        return res.status(result.status).json({ errors: result.errors });
      }

      return res.status(201).json({ data: result.data });
    } catch (error) {
      return next(error);
    }
  };
}

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------

/**
 * @param {Object} service — auth.service
 * @param {Object} schema  — auth.schema
 * @param {Object} repository — auth.repository
 * @returns {(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => Promise<void>}
 */
function login(service, schema, repository) {
  return async (req, res, next) => {
    // Validación con Zod (reemplaza la validación manual inline)
    const validation = LoginBody.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ errors: formatZodErrors(validation.error) });
    }

    const { email, password } = validation.data;

    try {
      const result = await service.login(email.trim(), password, repository);

      if (result.errors) {
        return res.status(result.status).json({ errors: result.errors });
      }

      return res.status(200).json({ data: result.data });
    } catch (error) {
      return next(error);
    }
  };
}

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------

/**
 * Devuelve el perfil del usuario autenticado a partir del token JWT.
 * El middleware authenticate ya inyectó req.user.
 *
 * @param {Object} service — auth.service
 * @param {Object} repository — auth.repository
 * @returns {(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => Promise<void>}
 */
function me(service, repository) {
  return async (req, res, next) => {
    try {
      const user = await repository.findUserById(req.user.userId);

      if (!user) {
        return res.status(404).json({ errors: ["Usuario no encontrado"] });
      }

      return res.json({ data: user });
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = {
  registerCitizen,
  registerVolunteer,
  registerOrganization,
  registerAdmin,
  login,
  me,
};
