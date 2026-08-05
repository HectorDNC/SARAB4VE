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

/**
 * Construye el payload para POST /api/organizations/register a partir
 * del formData de nuestro formulario.
 *
 * Huecos conocidos (no resueltos en el backend a la fecha):
 *   - otherEntityType: no existe campo de texto libre en organization_profiles
 *     para cuando se elige "Otra (cual)". Se pierde ese dato hasta que el
 *     backend agregue una columna.
 *   - countryFiscal / fiscalIdType: el backend solo tiene `taxId` genérico
 *     (VARCHAR 30). Se envía solo `fiscalNumber`; se pierde la distinción de
 *     tipo de identificador (RIF/NIT/RUC/etc.) y país.
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
        organizationTypeId,
        taxId: formData.fiscalNumber || undefined,
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
