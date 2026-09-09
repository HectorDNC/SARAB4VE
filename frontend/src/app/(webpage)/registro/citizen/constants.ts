/**
 * Texto informativo mostrado al solicitante antes de iniciar el registro.
 *
 * Es intencionalmente corto: el ciudadano se aprueba automáticamente y no
 * hay revisión manual, así que no requerimos carta de motivación ni
 * documentación. Solo dejamos claros los datos que se almacenarán para
 * que el usuario dé su consentimiento informado (origen: RGPD / LOPD).
 */
export const CITIZEN_INTRO_TEXT = {
  title: "Registro de Ciudadano",
  description:
    "Crea una cuenta básica para pedir ayuda durante emergencias. Tu solicitud se aprueba de inmediato y podrás reportar emergencias, hacer seguimiento y comunicarte con voluntarios u organizaciones.",

  whatWeStore: "Datos que se almacenarán en tu cuenta",
  dataPoints: [
    "Nombre completo y correo electrónico de contacto.",
    "Teléfono (se usa para que un voluntario u organización te contacte).",
    "Ubicación y zona: facilita que la ayuda llegue a donde te encuentras.",
  ],

  whyMattersTitle: "¿Por qué pedimos tu ubicación?",
  whyMattersBody:
    "Cuando reportas una emergencia, SARA prioriza solicitudes cercanas a voluntarios disponibles en la misma zona. Compartir tu ubicación al registrarte acelera el tiempo de respuesta.",

  termsReminder:
    "Al enviar este formulario aceptas los términos del servicio y el código de conducta de la red SARA.",
} as const;
