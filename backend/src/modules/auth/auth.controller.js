/**
 * Controlador — handlers HTTP para el dominio de auth (registro).
 * Cada handler es una factoría que recibe service, schema y repository.
 */

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
    const validation = schema.validateRegisterCitizen(req.body);

    if (!validation.isValid) {
      return res.status(400).json({ errors: validation.errors });
    }

    try {
      const result = await service.registerCitizen(req.body, schema, repository);

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
    const validation = schema.validateRegisterVolunteer(req.body);

    if (!validation.isValid) {
      return res.status(400).json({ errors: validation.errors });
    }

    try {
      const result = await service.registerVolunteer(req.body, schema, repository);

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
    const validation = schema.validateRegisterOrganization(req.body);

    if (!validation.isValid) {
      return res.status(400).json({ errors: validation.errors });
    }

    try {
      const result = await service.registerOrganization(req.body, schema, repository);

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
    const validation = schema.validateRegisterAdmin(req.body);

    if (!validation.isValid) {
      return res.status(400).json({ errors: validation.errors });
    }

    try {
      const result = await service.registerAdmin(req.body, schema, repository);

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
    const { email, password } = req.body;
    const errors = [];

    if (!email || typeof email !== "string" || email.trim() === "") {
      errors.push("email es requerido");
    }
    if (!password || typeof password !== "string" || password === "") {
      errors.push("password es requerido");
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

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
