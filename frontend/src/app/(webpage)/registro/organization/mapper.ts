/**
 * Traduce nuestro formData (iOrganizationForm) al contrato real de
 * POST /api/organizations/register del backend `feat/verificaciones-users-back`.
 *
 * Los IDs de catálogo están hardcodeados a partir del orden exacto del seed SQL
 * (backend/sql/verification_schema.sql, rama feat/verificaciones-users-back).
 * Reemplazar por una llamada real a `getCatalog()` (api/verification.ts) apenas
 * esa rama se mergee a main — el orden del seed podría cambiar entre entornos.
 */
import type { iOrganizationForm } from "@/types/index";
import type { OrganizationRegisterPayload } from "@/api/verification";

// IDs 1-11 — deben coincidir textualmente con ENTITY_TYPES en constants.ts
export const ORGANIZATION_TYPE_CATALOG_IDS: Record<string, number> = {
    "Fundación": 1,
    "Asociación": 2,
    "ONG": 3,
    "Empresa": 4,
    "Administración Pública": 5,
    "Centro Educativo": 6,
    "Hospital": 7,
    "Centro Especial de Empleo": 8,
    "Centro Ocupacional": 9,
    "Universidad": 10,
    "Otra (cual)": 11,
};

// IDs 12-22 — deben coincidir textualmente con DISABILITY_TYPES en constants.ts
export const DISABILITY_TYPE_CATALOG_IDS: Record<string, number> = {
    "Visual": 12,
    "Auditiva": 13,
    "Física": 14,
    "Intelectual": 15,
    "Psicosocial": 16,
    "TEA": 17,
    "Daño cerebral": 18,
    "Discapacidad orgánica/visceral": 19,
    "Enfermedades raras": 20,
    "Multidiscapacidad": 21,
    "Otras": 22,
};

// IDs 43-50 — el backend solo soporta este picklist cerrado de 8 servicios.
// Nuestro formulario captura "services" como texto libre (ver TODO abajo).
export const SERVICE_CATALOG_IDS: Record<string, number> = {
    "Acompañamiento personal": 43,
    "Transporte adaptado": 44,
    "Terapias y rehabilitación": 45,
    "Capacitación laboral": 46,
    "Asesoría legal": 47,
    "Apoyo psicológico": 48,
    "Alojamiento temporal": 49,
    "Comedor / alimentación": 50,
};

// Mapeo de IDs de documentos del formulario a document_types del backend
// Seed del backend (verification_schema.sql):
//   ID 1: estatutos | ID 2: rif | ID 3: acta_constitutiva
//   ID 4: identificacion_representante | ID 5: certificado_bancario
//   ID 6: declaracion_impuestos | ID 7: memoria_actividades
export const DOCUMENT_TYPE_IDS: Record<string, number> = {
    "cif": 2,              // RIF
    "estatutos": 1,        // Estatutos
    "inscripcion": 3,      // Acta constitutiva / Inscripción registral
    "id_representante": 4, // Identificación del representante legal
    "certificado_fiscal": 6, // Declaración de impuestos
    "seguro_responsabilidad": 5, // Certificado bancario (aproximación)
    "politica_proteccion_datos": 7, // No existe exacto — reutiliza 7
    "codigo_etico": 7,     // No existe exacto — reutiliza 7
    "politica_accesibilidad": 7, // No existe exacto — reutiliza 7
};

/**
 * Construye el payload para POST /api/organizations/register a partir
 * del formData de nuestro formulario.
 *
 * Huecos conocidos (no resueltos en el backend a la fecha):
 *   - countryFiscal: el backend ahora guarda `taxIdType` (RIF/NIT/RUC/etc.,
 *     o "Documento de identidad" para el caso "Otro" — ver migración 003),
 *     pero el país del identificador fiscal (`countryFiscal`) sigue sin
 *     tener columna propia — no se envía.
 *   - socialMedia (texto libre): se envuelve en un objeto { other: ... } como
 *     workaround, ya que `socialLinks` espera claves por red social.
 *   - services (texto libre): NO tiene mapeo posible a `serviceIds` (picklist
 *     cerrado de 8 valores). Se envía como array vacío — pendiente decidir con
 *     Héctor si el backend agrega un campo de texto libre o si cambiamos la UI
 *     a multipicklist.
 */
export function buildOrganizationRegisterPayload(
    formData: iOrganizationForm
): OrganizationRegisterPayload {
    const organizationTypeId = ORGANIZATION_TYPE_CATALOG_IDS[formData.entityType];

    if (!organizationTypeId) {
        throw new Error(
            `No se encontró un ID de catálogo para el tipo de entidad "${formData.entityType}". ` +
            `Verifica que ORGANIZATION_TYPE_CATALOG_IDS esté sincronizado con el catálogo del backend.`
        );
    }

    const disabilityTypeIds = formData.disabilityTypes
        .map((type) => DISABILITY_TYPE_CATALOG_IDS[type])
        .filter((id): id is number => typeof id === "number");

    return {
        // Campos básicos requeridos por el backend (CommonFields + organización)
        fullName: formData.legalRepresentativeName || formData.fullName,
        email: formData.legalRepresentativeEmail || formData.email,
        phone: formData.legalRepresentativePhone || formData.phone,
        password: formData.password,
        organizationName: formData.organizationName,
        legalDocument: formData.fiscalNumber,
        acceptedTerms: true as const,
        location: formData.location || undefined,
        zone: formData.zone || undefined,

        // Campos extendidos del perfil de organización
        organizationTypeId,
        taxId: formData.fiscalNumber || undefined,
        taxIdType: formData.fiscalIdType || undefined,
        otherEntityType: formData.otherEntityType || undefined,
        registryNumber: formData.registrationNumber ? String(formData.registrationNumber) : undefined,
        foundedAt: formData.constitutionDate || undefined,
        country: formData.legalCountry || undefined,
        province: formData.province || undefined,
        city: formData.city || undefined,
        address: formData.legalAddress || undefined,
        website: formData.website || undefined,
        socialLinks: formData.socialMedia ? { other: formData.socialMedia } : undefined,
        mission: formData.mission || undefined,
        vision: formData.vision || undefined,
        scope: formData.scope || undefined,
        servedGroups: formData.collectiveServed || undefined,
        legalRepresentatives: formData.legalRepresentativeName
            ? [{
                fullName: formData.legalRepresentativeName,
                position: formData.legalRepresentativePosition || undefined,
                phone: formData.legalRepresentativePhone || undefined,
                email: formData.legalRepresentativeEmail || undefined,
            }]
            : undefined,
        disabilityTypeIds: disabilityTypeIds.length > 0 ? disabilityTypeIds : undefined,
        // TODO: sin mapeo posible desde texto libre a picklist cerrado.
        // Pendiente definir con backend (agregar campo de texto libre) o
        // cambiar la UI de "services" a multipicklist contra SERVICE_CATALOG_IDS.
        serviceIds: undefined,
    };
}
