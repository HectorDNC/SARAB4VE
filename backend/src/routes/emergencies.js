const express = require("express");
const db = require("../db");
const {
  validateEmergency,
  createEmergency,
  validateEmergencySearchParams,
  buildListEmergenciesQuery,
} = require("../modules/emergencies");

const router = express.Router();

/**
 * GET /api/emergencies
 * Lista emergencias con filtros opcionales por status y geolocalización.
 */
router.get("/", async (req, res, next) => {
  const search = validateEmergencySearchParams(req.query);

  if (!search.isValid) {
    return res.status(400).json({ errors: search.errors });
  }

  try {
    const { sql, values } = buildListEmergenciesQuery(search.filters);
    const result = await db.query(sql, values);
    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/emergencies
 * Registra una nueva solicitud de emergencia (SOS).
 */
router.post("/", async (req, res, next) => {
  const validation = validateEmergency(req.body);

  if (!validation.isValid) {
    return res.status(400).json({ errors: validation.errors });
  }

  try {
    const emergency = await createEmergency(req.body);
    return res.status(201).json({ data: emergency });
  } catch (error) {
    return next(error);
  }
});

module.exports = { router };
