/**
 * Controlador — handlers HTTP para el dominio de help-requests.
 */

/**
 * GET /api/help-requests
 */
function listHelpRequests(service, repository, schema) {
  return async (req, res, next) => {
    const search = schema.validateSearchHelpRequests(req.query);

    if (!search.isValid) {
      return res.status(400).json({ errors: search.errors });
    }

    try {
      const rows = await service.listHelpRequests(search.filters, repository);
      res.json({ data: rows });
    } catch (error) {
      next(error);
    }
  };
}

/**
 * POST /api/help-requests
 */
function createHelpRequest(service, schema, repository) {
  return async (req, res, next) => {
    const validation = schema.validateCreateHelpRequest(req.body);

    if (!validation.isValid) {
      return res.status(400).json({ errors: validation.errors });
    }

    try {
      const row = await service.createHelpRequest(req.body, schema, repository);
      return res.status(201).json({ data: row });
    } catch (error) {
      return next(error);
    }
  };
}

/**
 * POST /api/help-requests/:id/accept
 */
function acceptHelpRequest(service, schema, repository) {
  return async (req, res, next) => {
    if (!schema.isUuid(req.params.id)) {
      return res.status(400).json({ errors: ["id must be a valid UUID"] });
    }

    const validation = schema.validateAcceptHelpRequest(req.body);

    if (!validation.isValid) {
      return res.status(400).json({ errors: validation.errors });
    }

    try {
      const result = await service.acceptHelpRequest(
        req.params.id,
        req.body,
        schema,
        repository,
      );

      if (result.errors) {
        return res.status(result.status).json({ errors: result.errors });
      }

      return res.json({ data: result.data });
    } catch (error) {
      return next(error);
    }
  };
}

/**
 * POST /api/help-requests/:id/resolve
 */
function resolveHelpRequest(service, schema, repository) {
  return async (req, res, next) => {
    if (!schema.isUuid(req.params.id)) {
      return res.status(400).json({ errors: ["id must be a valid UUID"] });
    }

    try {
      const result = await service.resolveHelpRequest(req.params.id, repository);

      if (result.errors) {
        return res.status(result.status).json({ errors: result.errors });
      }

      return res.json({ data: result.data });
    } catch (error) {
      return next(error);
    }
  };
}

/**
 * GET /api/help-requests/:id
 */
function getHelpRequestById(service, schema, repository) {
  return async (req, res, next) => {
    if (!schema.isUuid(req.params.id)) {
      return res.status(400).json({ errors: ["id must be a valid UUID"] });
    }

    try {
      const result = await service.getHelpRequestById(req.params.id, repository);

      if (result.errors) {
        return res.status(result.status).json({ errors: result.errors });
      }

      return res.json({ data: result.data });
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = {
  listHelpRequests,
  createHelpRequest,
  acceptHelpRequest,
  resolveHelpRequest,
  getHelpRequestById,
};
