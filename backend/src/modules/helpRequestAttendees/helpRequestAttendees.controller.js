/**
 * Controlador — handlers HTTP para help-request-attendees.
 */

/**
 * POST /api/help-requests/:helpRequestId/attendees
 * El usuario que atiende se obtiene del token JWT (req.user.userId).
 */
function createHelpRequestAttendee(service, schema, repository) {
  return async (req, res, next) => {
    if (!schema.isUuid(req.params.helpRequestId)) {
      return res.status(400).json({ errors: ["helpRequestId must be a valid UUID"] });
    }

    try {
      const result = await service.createHelpRequestAttendee(
        req.params.helpRequestId,
        req.user.userId,
        repository,
      );

      if (result.errors) {
        return res.status(result.status).json({ errors: result.errors });
      }

      return res.status(201).json({ data: result.data });
    } catch (error) {
      return next(error);
    }
  };
}

/**
 * GET /api/help-requests/:helpRequestId/attendees
 */
function listHelpRequestAttendees(service, schema, repository) {
  return async (req, res, next) => {
    if (!schema.isUuid(req.params.helpRequestId)) {
      return res.status(400).json({ errors: ["helpRequestId must be a valid UUID"] });
    }

    try {
      const result = await service.listHelpRequestAttendees(req.params.helpRequestId, repository);
      return res.json({ data: result.data });
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = {
  createHelpRequestAttendee,
  listHelpRequestAttendees,
};
