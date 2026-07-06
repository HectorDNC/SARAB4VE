const { isBlank, isFiniteNumber, isUuid, toNumber } = require("../lib/validation");

const NEED_TYPES = [
  "equipment",
  "medication",
  "transport",
  "companionship",
  "interpreter",
  "accessible_information",
  "neurodivergent_support",
  "psychosocial_support",
];

const URGENCY_LEVELS = ["low", "medium", "high", "critical"];
const REQUEST_STATUSES = ["open", "assigned", "resolved"];
const DEFAULT_RADIUS_KM = 10;
const MAX_RADIUS_KM = 100;

const NEED_TYPE_SET = new Set(NEED_TYPES);
const URGENCY_LEVEL_SET = new Set(URGENCY_LEVELS);
const REQUEST_STATUS_SET = new Set(REQUEST_STATUSES);

module.exports = {
  DEFAULT_RADIUS_KM,
  MAX_RADIUS_KM,
  NEED_TYPES,
  URGENCY_LEVELS,
  REQUEST_STATUSES,
  NEED_TYPE_SET,
  URGENCY_LEVEL_SET,
  REQUEST_STATUS_SET,
  isBlank,
  isFiniteNumber,
  isUuid,
  toNumber,
};
