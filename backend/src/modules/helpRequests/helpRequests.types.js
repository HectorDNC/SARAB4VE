/**
 * Tipos — definiciones JSDoc para el dominio de help-requests.
 *
 * @module helpRequests.types
 */

/**
 * @typedef {"equipment"|"medication"|"transport"|"companionship"|"interpreter"|"accessible_information"|"neurodivergent_support"|"psychosocial_support"} NeedType
 */

/**
 * @typedef {"low"|"medium"|"high"|"critical"} UrgencyLevel
 */

/**
 * @typedef {"open"|"assigned"|"resolved"} RequestStatus
 */

/**
 * @typedef {Object} HelpRequestRow
 * @property {string}        id
 * @property {string}        requester_name
 * @property {string}        contact_method
 * @property {string}        contact_value
 * @property {NeedType}      need_type
 * @property {string}        description
 * @property {number}        latitude
 * @property {number}        longitude
 * @property {UrgencyLevel}  urgency
 * @property {RequestStatus} status
 * @property {string|null}   volunteer_name
 * @property {string|null}   volunteer_contact_method
 * @property {string|null}   volunteer_contact_value
 * @property {string|null}   assigned_at
 * @property {string|null}   resolved_at
 * @property {string}        created_at
 */

/**
 * @typedef {Object} HelpRequestListItem
 * @property {string}        id
 * @property {number}        latitude
 * @property {number}        longitude
 * @property {UrgencyLevel}  urgency
 * @property {NeedType}      need_type
 * @property {RequestStatus} status
 * @property {string}        created_at
 * @property {number}        [distanceKm]
 */

/**
 * @typedef {Object} CreateHelpRequestPayload
 * @property {string}        requesterName
 * @property {string}        contactMethod
 * @property {string}        contactValue
 * @property {NeedType}      needType
 * @property {string}        description
 * @property {number}        latitude
 * @property {number}        longitude
 * @property {UrgencyLevel}  [urgency]
 */

/**
 * @typedef {Object} AcceptHelpRequestPayload
 * @property {string}        volunteerName
 * @property {string}        volunteerContactMethod
 * @property {string}        volunteerContactValue
 */

/**
 * @typedef {Object} HelpRequestSearchFilters
 * @property {boolean}          hasGeoFilter
 * @property {number|null}      latitude
 * @property {number|null}      longitude
 * @property {number|null}      radiusKm
 * @property {RequestStatus|null} status
 */

module.exports = {};
