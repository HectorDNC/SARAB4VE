/**
 * Controlador — handlers HTTP para emergency-attendees.
 */

/**
 * POST /api/emergencies/:emergencyId/attendees
 * El usuario que atiende se obtiene del token JWT (req.user.userId).
 */
function createEmergencyAttendee(service, schema, repository) {
  return async (req, res, next) => {
    if (!schema.isUuid(req.params.emergencyId)) {
      return res.status(400).json({ errors: ["emergencyId must be a valid UUID"] });
    }

    try {
      const result = await service.createEmergencyAttendee(
        req.params.emergencyId,
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
 * GET /api/emergencies/:emergencyId/attendees
 */
function listEmergencyAttendees(service, schema, repository) {
  return async (req, res, next) => {
    if (!schema.isUuid(req.params.emergencyId)) {
      return res.status(400).json({ errors: ["emergencyId must be a valid UUID"] });
    }

    try {
      const result = await service.listEmergencyAttendees(req.params.emergencyId, repository);
      return res.json({ data: result.data });
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = {
  createEmergencyAttendee,
  listEmergencyAttendees,
};
