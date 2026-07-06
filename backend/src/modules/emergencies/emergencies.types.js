/**
 * Tipos — definiciones JSDoc para el dominio de emergencias.
 *
 * @module emergencies.types
 */

/**
 * @typedef {"visual"|"auditiva"|"neuro"|"motriz"} DisabilityType
 */

/**
 * @typedef {"lengua_senas"|"audifono"|"implante_coclear"|"vibrador_oseo"} CommunicationMode
 */

/**
 * @typedef {"guia_voz"|"braille"|"perro_guia"|"ambiente_calmado"|"comunicacion_clara"|"acompanamiento"|"silla_ruedas"|"traslado_asistido"|"evacuacion_accesible"} DisabilitySubcategory
 */

/**
 * @typedef {"low"|"medium"|"high"|"critical"} UrgencyLevel
 */

/**
 * @typedef {"received"|"assigned"|"resolved"} EmergencyStatus
 */

/**
 * @typedef {Object} EmergencyRow
 * @property {string}        id
 * @property {string}        requester_name
 * @property {boolean}       is_injured
 * @property {boolean}       cannot_move
 * @property {DisabilityType} disability_type
 * @property {CommunicationMode|null} communication_mode
 * @property {DisabilitySubcategory|null} disability_subcategory
 * @property {string|null}   extra_info
 * @property {string|null}   voice_note_url
 * @property {number|null}   voice_note_duration_sec
 * @property {number}        latitude
 * @property {number}        longitude
 * @property {UrgencyLevel}  urgency
 * @property {string}        need_type
 * @property {string}        description
 * @property {EmergencyStatus} status
 * @property {string|null}   assigned_at
 * @property {string|null}   resolved_at
 * @property {string}        created_at
 * @property {string}        updated_at
 */

/**
 * @typedef {Object} EmergencyListItem
 * @property {string}        id
 * @property {number}        latitude
 * @property {number}        longitude
 * @property {UrgencyLevel}  urgency
 * @property {string}        need_type
 * @property {DisabilityType} disability_type
 * @property {EmergencyStatus} status
 * @property {string}        created_at
 * @property {number}        [distanceKm]
 */

/**
 * @typedef {Object} CreateEmergencyPayload
 * @property {string}        [requesterName]
 * @property {boolean}       [isInjured]
 * @property {boolean}       [cannotMove]
 * @property {DisabilityType} disabilityType
 * @property {CommunicationMode} [communicationMode]
 * @property {DisabilitySubcategory} [disabilitySubcategory]
 * @property {string}        [extraInfo]
 * @property {string}        [voiceNoteUrl]
 * @property {number}        [voiceNoteDurationSec]
 * @property {number}        latitude
 * @property {number}        longitude
 * @property {UrgencyLevel}  [urgency]
 * @property {string}        needType
 * @property {string}        description
 */

/**
 * @typedef {Object} EmergencySearchFilters
 * @property {boolean}          hasGeoFilter
 * @property {number|null}      latitude
 * @property {number|null}      longitude
 * @property {number|null}      radiusKm
 * @property {EmergencyStatus|null} status
 */

module.exports = {};
