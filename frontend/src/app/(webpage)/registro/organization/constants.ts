// Países y sus identificadores fiscales
export const COUNTRIES_FISCAL_ID = [
    { code: "VE", name: "Venezuela", fiscalId: "RIF" },
    { code: "CO", name: "Colombia", fiscalId: "NIT" },
    { code: "PE", name: "Perú", fiscalId: "RUC" },
    { code: "AR", name: "Argentina", fiscalId: "CUIT" },
    { code: "BR", name: "Brasil", fiscalId: "CNPJ" },
    { code: "ES", name: "España", fiscalId: "CIF" },
    { code: "MX", name: "México", fiscalId: "RFC" },
    { code: "CL", name: "Chile", fiscalId: "RUT" },
    { code: "EC", name: "Ecuador", fiscalId: "RUC" },
  ] as const;
  
  // Picklist para el select del tipo de identificador fiscal
  // (nombre del país al frente de cada uno, como pediste)
  export const FISCAL_ID_TYPES = COUNTRIES_FISCAL_ID.map((c) => ({
    value: `${c.code}-${c.fiscalId}`,
    label: `${c.fiscalId} (${c.name})`,
    country: c.name,
  }));
  
  // Códigos de país para extensión telefónica del representante legal
  export const PHONE_COUNTRY_CODES = [
    { code: "VE", name: "Venezuela", dialCode: "+58" },
    { code: "CO", name: "Colombia", dialCode: "+57" },
    { code: "PE", name: "Perú", dialCode: "+51" },
    { code: "AR", name: "Argentina", dialCode: "+54" },
    { code: "BR", name: "Brasil", dialCode: "+55" },
    { code: "ES", name: "España", dialCode: "+34" },
    { code: "MX", name: "México", dialCode: "+52" },
    { code: "CL", name: "Chile", dialCode: "+56" },
    { code: "EC", name: "Ecuador", dialCode: "+593" },
  ] as const;
  
  // Tipos de entidad
  export const ENTITY_TYPES = [
    "Fundación",
    "Asociación",
    "ONG",
    "Empresa",
    "Administración Pública",
    "Centro Educativo",
    "Hospital",
    "Centro Especial de Empleo",
    "Centro Ocupacional",
    "Universidad",
    "Otra (cual)",
  ] as const;
  
  // Ámbito de actuación
  export const SCOPE_OPTIONS = [
    "Local",
    "Regional",
    "Nacional",
  ] as const;

  // Tipos de discapacidad (multipicklist)
  export const DISABILITY_TYPES = [
    "Visual",
    "Auditiva",
    "Física",
    "Intelectual",
    "Psicosocial",
    "TEA",
    "Daño cerebral",
    "Discapacidad orgánica/visceral",
    "Enfermedades raras",
    "Multidiscapacidad",
    "Otras",
    "Logística",
  ] as const;
  
  // Documentación requerida (adjuntos)
  export const REQUIRED_DOCUMENTS = [
    { id: "cif", name: "CIF", required: true },
    { id: "estatutos", name: "Estatutos", required: true },
    { id: "inscripcion", name: "Inscripción registral", required: true },
    { id: "id_representante", name: "Documento de identidad representante", required: true },
    { id: "certificado_fiscal", name: "Certificado fiscal", required: true },
    { id: "seguro_responsabilidad", name: "Seguro de responsabilidad civil", required: true },
    {
      id: "politica_proteccion_datos",
      name: "Acuerdo de Participación (firmado)",
      required: true,
      hasTemplate: true, // requiere link de descarga (sin firmar) + carga del firmado
      templateHref: "/documentos/acuerdo-participacion-sin-firmar.pdf",
    },
    { id: "codigo_etico", name: "Código Ético", required: true },
    { id: "politica_accesibilidad", name: "Política de Accesibilidad", required: true },
  ] as const;

  // Documentos de referencia que la organización debe revisar antes de
  // registrarse (se muestran como links al inicio del formulario). El
  // "Acuerdo de Participación (sin firmar)" es el mismo archivo que se
  // descarga desde la tarjeta de "Acuerdo de Participación (firmado)" en
  // REQUIRED_DOCUMENTS — se linkea acá también para que quede visible desde
  // el inicio de la página.
  export const PARTICIPATION_REFERENCE_DOCS = [
    { name: "Carta institucional", href: "/documentos/carta-institucional.pdf" },
    {
      name: "Manual de Trabajo Plataforma S.A.R.A. — Misión, Visión y Valores",
      href: "/documentos/manual-mision-vision-valores.pdf",
    },
    { name: "Manual - Código Ético", href: "/documentos/manual-codigo-etico.pdf" },
    {
      name: "Política Internacional de Igualdad, Diversidad, Inclusión y Accesibilidad Universal",
      href: "/documentos/politica-igualdad-diversidad-inclusion-accesibilidad.pdf",
    },
    {
      name: "Política Internacional de Protección de Datos y Privacidad S.A.R.A. Sistema de Apoyo y Respuesta Accesible",
      href: "/documentos/politica-proteccion-datos-privacidad.pdf",
    },
    {
      name: "Acuerdo de Participación (sin firmar)",
      href: "/documentos/acuerdo-participacion-sin-firmar.pdf",
    },
    {
      name: "Política Internacional de Salvaguarda y Protección de Personas en Situación de Vulnerabilidad",
      href: "/documentos/politica-salvaguarda-proteccion-vulnerabilidad.pdf",
    },
  ] as const;
