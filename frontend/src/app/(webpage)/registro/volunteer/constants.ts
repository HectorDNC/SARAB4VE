// Categorías de experiencia (multiselección) — solo perfil profesional
// IDs 36-42 en el catálogo del backend (feat/verificaciones-users-back)
export const EXPERIENCE_CATEGORIES = [
    "Voluntariado",
    "Atención social",
    "Discapacidad",
    "Sanidad",
    "Educación",
    "Tecnología",
    "Psicología",
  ] as const;
  
  // Áreas de interés — perfil profesional (11 de las 13 del catálogo)
  // IDs 23-33 en el catálogo del backend
  export const INTEREST_AREAS_PROFESSIONAL = [
    "Acompañamiento",
    "Accesibilidad",
    "Tecnología",
    "Apoyo emocional",
    "Gestión administrativa",
    "Comunicación",
    "Traducción",
    "Lengua de signos",
    "Braille",
    "Guía acompañante",
    "Mentoría",
  ] as const;
  
  // Áreas de interés — perfil no profesional (2 de las 13 del catálogo)
  // IDs 34-35 en el catálogo del backend
  export const INTEREST_AREAS_NON_PROFESSIONAL = [
    "Medio de transporte",
    "Logística",
  ] as const;
  
  // Franjas horarias — agrupan las 24 horas en bloques de selección rápida
  export const TIME_BLOCKS = [
    { label: "Madrugada", hours: [0, 1, 2, 3, 4, 5] },
    { label: "Mañana", hours: [6, 7, 8, 9, 10, 11] },
    { label: "Tarde", hours: [12, 13, 14, 15, 16, 17] },
    { label: "Noche", hours: [18, 19, 20, 21, 22, 23] },
  ] as const;
  
  export const ALL_HOURS = Array.from({ length: 24 }, (_, i) => i);
  
  // Documentación requerida — perfil profesional
  export const REQUIRED_DOCUMENTS_PROFESSIONAL = [
    { id: "identidad", name: "Documento de identidad", required: true },
    { id: "fotografia", name: "Fotografía", required: true },
    { id: "curriculum", name: "Currículum", required: true },
    { id: "certificados_titulaciones", name: "Certificados y Titulaciones", required: true },
    { id: "certificado_delitos_sexuales", name: "Certificado de delitos sexuales", required: false },
    { id: "compromiso_etico", name: "Compromiso ético", required: true },
    { id: "proteccion_datos", name: "Protección de datos", required: true },
  ] as const;
  
  // Documentación requerida — perfil no profesional
  // Los últimos dos son condicionales según el área de interés seleccionada
  export const REQUIRED_DOCUMENTS_NON_PROFESSIONAL = [
    { id: "identidad", name: "Documento de identidad", required: true },
    { id: "fotografia", name: "Fotografía", required: true },
    {
      id: "licencia_conducir",
      name: "Licencia de conducir",
      required: true,
      requiredIfInterestArea: "Medio de transporte",
    },
    {
      id: "carnet_manipulador_alimentos",
      name: "Carnet de manipulador de alimentos",
      required: true,
      requiredIfInterestArea: "Logística",
    },
  ] as const;
  